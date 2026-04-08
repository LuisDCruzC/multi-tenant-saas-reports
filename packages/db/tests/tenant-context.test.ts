import { describe, expect, it, vi } from "vitest";
import { withUserContext } from "../src/tenant-context.js";

describe("withUserContext", () => {
  it("setea app.user_id antes de ejecutar el callback", async () => {
    const executeRaw = vi.fn().mockResolvedValue(undefined);
    const callback = vi.fn().mockResolvedValue("ok");
    const transaction = {
      $executeRaw: executeRaw,
    };
    const prisma = {
      $transaction: vi.fn(async (handler) => handler(transaction as never)),
    };

    const result = await withUserContext(prisma as never, "user-123", callback);

    expect(result).toBe("ok");
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw.mock.calls[0]?.[0]).toBeDefined();
    expect(callback).toHaveBeenCalledWith(transaction);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
