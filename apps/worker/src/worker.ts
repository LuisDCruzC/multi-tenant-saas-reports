import { Worker } from "bullmq";
import pino from "pino";
import {
  reportsQueueName,
  redisConnection,
  type GenerateReportJobData,
} from "./queue.js";
import { processReportJob } from "./report-processor.js";

const logger = pino({ name: "reports-worker" });

export const reportsWorker = new Worker<GenerateReportJobData>(
  reportsQueueName,
  async (job) => processReportJob(job.data, { logger }),
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
