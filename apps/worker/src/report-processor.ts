import type { PrismaClient } from "@prisma/client";
import { prisma } from "@saas/db";
import type { GenerateReportJobData } from "./queue.js";

export type ReportProcessorDependencies = {
  prismaClient?: PrismaClient;
  generateArtifact?: (job: GenerateReportJobData) => Promise<string>;
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

async function defaultGenerateArtifact(job: GenerateReportJobData) {
  const extension = job.format === "pdf" ? "pdf" : "xlsx";
  return `/tmp/reports/${job.reportId}.${extension}`;
}

export async function processReportJob(
  job: GenerateReportJobData,
  dependencies: ReportProcessorDependencies = {},
) {
  const prismaClient = dependencies.prismaClient ?? prisma;
  const logger = dependencies.logger ?? defaultLogger;
  const generateArtifact = dependencies.generateArtifact ?? defaultGenerateArtifact;

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
    const outputUrl = await generateArtifact(job);

    await prismaClient.report.updateMany({
      where: {
        id: job.reportId,
        tenantId: job.tenantId,
      },
      data: {
        status: "COMPLETED",
        outputUrl,
      },
    });

    logger.info(
      {
        tenantId: job.tenantId,
        reportId: job.reportId,
        outputUrl,
      },
      "Report job completed",
    );

    return { status: "completed" as const, outputUrl };
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
