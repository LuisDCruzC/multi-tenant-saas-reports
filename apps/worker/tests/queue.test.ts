import { describe, expect, it } from "vitest";
import { reportsQueue } from "../src/queue.js";

describe("reportsQueue", () => {
  it("configura retries y backoff exponencial por defecto", () => {
    const defaultOptions = reportsQueue.opts.defaultJobOptions;

    expect(defaultOptions?.attempts).toBe(5);
    expect(defaultOptions?.backoff).toEqual({
      type: "exponential",
      delay: 2000,
    });
  });
});
