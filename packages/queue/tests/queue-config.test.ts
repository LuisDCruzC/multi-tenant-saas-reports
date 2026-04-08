import { describe, expect, it } from "vitest";
import { reportFormats, reportsQueue } from "../src/index.js";

describe("reportsQueue shared package", () => {
  it("expone retries con backoff exponencial", () => {
    expect(reportsQueue.opts.defaultJobOptions?.attempts).toBe(5);
    expect(reportsQueue.opts.defaultJobOptions?.backoff).toEqual({
      type: "exponential",
      delay: 2000,
    });
  });

  it("expone formatos de reportes soportados", () => {
    expect(reportFormats).toEqual(["pdf", "xlsx"]);
  });
});
