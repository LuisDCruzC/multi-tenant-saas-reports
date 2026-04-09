import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    authLoginCode: {
      create: vi.fn(),
    },
  },
  randomInt: vi.fn(() => 123456),
}));

vi.mock("@saas/db", () => ({
  prisma: mocks.prisma,
}));

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomInt: mocks.randomInt,
  };
});

const { POST } = await import("@/app/api/auth/request-code/route");

beforeEach(() => {
  mocks.prisma.authLoginCode.create.mockReset();
  mocks.randomInt.mockClear();
});

describe("request-code route", () => {
  it("genera un codigo de desarrollo y persiste el login code", async () => {
    mocks.prisma.authLoginCode.create.mockResolvedValue({ id: "code-1" });

    const response = await POST(
      new Request("http://localhost/api/auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ana@example.com",
          name: "Ana Developer",
          tenantSlug: "acme",
          tenantName: "Acme Corp",
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; devCode?: string };
    expect(body.ok).toBe(true);
    expect(body.devCode).toBe("123456");
    expect(mocks.prisma.authLoginCode.create).toHaveBeenCalledTimes(1);
  });
});
