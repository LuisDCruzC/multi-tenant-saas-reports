import { Worker } from "bullmq";
import pino from "pino";
import {
  reportsQueueName,
  redisConnection,
  type GenerateReportJobData,
} from "./queue.js";

const logger = pino({ name: "reports-worker" });

export const reportsWorker = new Worker<GenerateReportJobData>(
  reportsQueueName,
  async (job) => {
    logger.info(
      {
        tenantId: job.data.tenantId,
        reportId: job.data.reportId,
        attempt: job.attemptsStarted,
      },
      "Processing report job",
    );

    // Placeholder de Hito 0: en Hito 3 se reemplaza por generacion real PDF/Excel.
    await new Promise((resolve) => setTimeout(resolve, 300));

    logger.info(
      {
        tenantId: job.data.tenantId,
        reportId: job.data.reportId,
      },
      "Report job completed",
    );
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

reportsWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      tenantId: job?.data.tenantId,
      reportId: job?.data.reportId,
      err,
    },
    "Report job failed",
  );
});
