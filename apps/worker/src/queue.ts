import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "./config.js";

export const reportsQueueName = "reports";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export type GenerateReportJobData = {
  tenantId: string;
  reportId: string;
  format: "pdf" | "xlsx";
};

export const reportsQueue = new Queue<GenerateReportJobData>(reportsQueueName, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});
