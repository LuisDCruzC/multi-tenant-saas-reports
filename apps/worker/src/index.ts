import pino from "pino";
import { reportsWorker } from "./worker.js";

const logger = pino({ name: "worker-bootstrap" });

logger.info("Reports worker started");

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down worker");
  await reportsWorker.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
