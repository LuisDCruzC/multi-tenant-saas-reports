import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { z } from "zod";

const envSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

const env = envSchema.parse(process.env);

export const reportsQueueName = "reports";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const reportFormats = ["pdf", "xlsx"] as const;
export type ReportFormat = (typeof reportFormats)[number];

export type GenerateReportJobData = {
  tenantId: string;
  reportId: string;
  format: ReportFormat;
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
