import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testSession = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "ana@example.com",
  tenantSlug: "acme",
  tenantName: "Acme Corp",
};

const txUpdate = vi.fn();
const transactionCallback = vi.fn();

const mocks = vi.hoisted(() => ({
  prisma: {
    authLoginCode: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  createSessionCookie: vi.fn(),
  provisionUserTenantSession: vi.fn(),
  randomInt: vi.fn(() => 123456),
}));

vi.mock("@saas/db", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/session", () => ({
  createSessionCookie: mocks.createSessionCookie,
}));

vi.mock("@/lib/provision-session", () => ({
  provisionUserTenantSession: mocks.provisionUserTenantSession,
}));

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof import("node:crypto")>("node:crypto");
  return {
    ...actual,
    randomInt: mocks.randomInt,
  };
});

const { POST: requestCodePOST } = await import("@/app/api/auth/request-code/route");
const { POST: verifyCodePOST } = await import("@/app/api/auth/verify-code/route");

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = "test-secret";
  mocks.prisma.authLoginCode.create.mockReset();
  mocks.prisma.authLoginCode.findFirst.mockReset();
  mocks.prisma.authLoginCode.update.mockReset();
  mocks.prisma.$transaction.mockReset();
  mocks.createSessionCookie.mockReset();
  mocks.provisionUserTenantSession.mockReset();
  mocks.randomInt.mockClear();
  txUpdate.mockReset();
  transactionCallback.mockReset();
});

describe("auth code flow", () => {
  it("solicita un codigo de verificacion y devuelve devCode en local", async () => {
    mocks.prisma.authLoginCode.create.mockResolvedValue({ id: "code-1" });

    const response = await requestCodePOST(
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
    const body = (await response.json()) as { ok: boolean; devCode?: string; expiresAt: string };
    expect(body.ok).toBe(true);
    expect(body.devCode).toBe("123456");
    expect(mocks.prisma.authLoginCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "ana@example.com",
        name: "Ana Developer",
        tenantSlug: "acme",
        tenantName: "Acme Corp",
        codeHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("verifica un codigo valido y crea la sesion firmada", async () => {
    const expectedHash = createHash("sha256").update("test-secret:123456").digest("hex");

    mocks.prisma.authLoginCode.findFirst.mockResolvedValue({
      id: "code-1",
      email: "ana@example.com",
      name: "Ana Developer",
      tenantSlug: "acme",
      tenantName: "Acme Corp",
      codeHash: expectedHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      blockedUntil: null,
      createdAt: new Date(),
    });
    mocks.prisma.$transaction.mockImplementation(async (callback: unknown) => {
      const tx = {
        authLoginCode: {
          update: txUpdate.mockResolvedValue({}),
        },
      };
      transactionCallback(callback);
      const typedCallback = callback as (tx: { authLoginCode: { update: typeof txUpdate } }) => Promise<unknown>;
      return typedCallback(tx);
    });
    mocks.provisionUserTenantSession.mockResolvedValue(testSession);
    mocks.createSessionCookie.mockReturnValue({
      name: "saas_session",
      value: "signed-session",
      options: { path: "/", httpOnly: true, sameSite: "lax", secure: false, maxAge: 60 },
    });

    const response = await verifyCodePOST(
      new Request("http://localhost/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", code: "123456" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(mocks.provisionUserTenantSession).toHaveBeenCalledTimes(1);
    expect(mocks.createSessionCookie).toHaveBeenCalledWith(testSession);
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("bloquea temporalmente el codigo tras multiples intentos fallidos", async () => {
    mocks.prisma.authLoginCode.findFirst.mockResolvedValue({
      id: "code-1",
      email: "ana@example.com",
      name: "Ana Developer",
      tenantSlug: "acme",
      tenantName: "Acme Corp",
      codeHash: createHash("sha256").update("test-secret:654321").digest("hex"),
      attempts: 4,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      blockedUntil: null,
      createdAt: new Date(),
    });

    const response = await verifyCodePOST(
      new Request("http://localhost/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com", code: "000000" }),
      }) as never,
    );

    expect(response.status).toBe(429);
    expect(mocks.prisma.authLoginCode.update).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: {
        attempts: 5,
        blockedUntil: expect.any(Date),
      },
    });
  });
});
