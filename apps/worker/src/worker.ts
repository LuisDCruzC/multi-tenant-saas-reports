import { Worker } from "bullmq";
import pino from "pino";
import { prisma } from "@saas/db";
import {
  reportsQueueName,
  redisConnection,
  type GenerateReportJobData,
} from "./queue.js";
import { processReportJob } from "./report-processor.js";
import { sendReportEmail } from "./report-notifier.js";

const logger = pino({ name: "reports-worker" });

export const reportsWorker = new Worker<GenerateReportJobData>(
  reportsQueueName,
  async (job) => processReportJob(job.data, { logger }),
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

reportsWorker.on("failed", async (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      tenantId: job?.data.tenantId,
      reportId: job?.data.reportId,
      err,
    },
    "Report job failed",
  );

  if (!job) {
    return;
  }

  const attempts = job.opts.attempts ?? 1;
  if (job.attemptsMade < attempts) {
    return;
  }

  await prisma.report.updateMany({
    where: {
      id: job.data.reportId,
      tenantId: job.data.tenantId,
      status: {
        in: ["PROCESSING", "RETRYING"],
      },
    },
    data: {
      status: "FAILED",
    },
  });

  const owner = await prisma.report.findUnique({
    where: { id: job.data.reportId },
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
      tenantId: job.data.tenantId,
      reportId: job.data.reportId,
      status: "FAILED",
    });
  }
});
