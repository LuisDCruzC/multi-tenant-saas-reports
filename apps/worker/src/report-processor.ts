import type { PrismaClient } from "@prisma/client";
import { prisma } from "@saas/db";
import type { GenerateReportJobData } from "./queue.js";
import { generateReportArtifact } from "./report-artifact.js";
import { sendReportEmail } from "./report-notifier.js";

export type ReportProcessorDependencies = {
  prismaClient?: PrismaClient;
  generateArtifact?: (
    job: GenerateReportJobData,
  ) => Promise<{
    filePath: string;
    outputUrl: string;
    metrics: {
      recordsProcessed: number;
      totalAmountCents: number;
    };
  }>;
  logger?: {
    info: (payload: unknown, message?: string) => void;
    warn: (payload: unknown, message?: string) => void;
    error: (payload: unknown, message?: string) => void;
  };
};

const defaultLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export async function processReportJob(
  job: GenerateReportJobData,
  dependencies: ReportProcessorDependencies = {},
) {
  const prismaClient = dependencies.prismaClient ?? prisma;
  const logger = dependencies.logger ?? defaultLogger;
  const generateArtifact = dependencies.generateArtifact ?? generateReportArtifact;

  logger.info(
    {
      tenantId: job.tenantId,
      reportId: job.reportId,
      format: job.format,
    },
    "Starting report job",
  );

  const processingReport = await prismaClient.report.updateMany({
    where: {
      id: job.reportId,
      tenantId: job.tenantId,
      status: {
        in: ["QUEUED", "RETRYING"],
      },
    },
    data: {
      status: "PROCESSING",
    },
  });

  if (processingReport.count === 0) {
    logger.warn(
      {
        tenantId: job.tenantId,
        reportId: job.reportId,
      },
      "Report job skipped because it was already processed or missing",
    );

    return { status: "skipped" as const };
  }

  try {
    const artifact = await generateArtifact(job);

    await prismaClient.report.updateMany({
      where: {
        id: job.reportId,
        tenantId: job.tenantId,
      },
      data: {
        status: "COMPLETED",
        outputUrl: artifact.outputUrl,
        outputPath: artifact.filePath,
        recordsProcessed: artifact.metrics.recordsProcessed,
        totalAmountCents: artifact.metrics.totalAmountCents,
      },
    });

    const owner = await prismaClient.report.findUnique({
      where: { id: job.reportId },
      select: {
        createdByUser: {
          select: {
            email: true,
          },
        },
      },
    });

    if (owner?.createdByUser?.email) {
      await sendReportEmail({
        to: owner.createdByUser.email,
        tenantId: job.tenantId,
        reportId: job.reportId,
        status: "COMPLETED",
        outputUrl: artifact.outputUrl,
      });
    }

    logger.info(
      {
        tenantId: job.tenantId,
        reportId: job.reportId,
        outputUrl: artifact.outputUrl,
      },
      "Report job completed",
    );

    return {
      status: "completed" as const,
      outputUrl: artifact.outputUrl,
      outputPath: artifact.filePath,
      recordsProcessed: artifact.metrics.recordsProcessed,
      totalAmountCents: artifact.metrics.totalAmountCents,
    };
  } catch (error) {
    await prismaClient.report.updateMany({
      where: {
        id: job.reportId,
        tenantId: job.tenantId,
      },
      data: {
        status: "RETRYING",
      },
    });

    logger.error(
      {
        tenantId: job.tenantId,
        reportId: job.reportId,
        error,
      },
      "Report job failed before retry",
    );

    throw error;
  }
}
