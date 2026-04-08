import { config as loadEnv } from "dotenv";
import path from "node:path";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  REPORTS_OUTPUT_DIR: z.string().default(path.resolve(process.cwd(), "../../artifacts")),
  SMTP_URL: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
