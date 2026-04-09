import { describe, expect, it, vi, beforeEach } from "vitest";

const session = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "ana@example.com",
  tenantSlug: "acme",
  tenantName: "Acme Corp",
};

const tx = {
  tenant: {
    findUniqueOrThrow: vi.fn(),
  },
  report: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

const mocks = vi.hoisted(() => ({
  prisma: {},
  withUserContext: vi.fn(),
  getSessionFromCookies: vi.fn(),
  reportsQueue: {
    add: vi.fn(),
  },
}));

vi.mock("@saas/db", () => ({
  prisma: mocks.prisma,
  withUserContext: mocks.withUserContext,
}));

vi.mock("@saas/queue", () => ({
  reportsQueue: mocks.reportsQueue,
}));

vi.mock("@/lib/session", () => ({
  getSessionFromCookies: mocks.getSessionFromCookies,
}));

const { POST } = await import("@/app/api/reports/route");

beforeEach(() => {
  mocks.getSessionFromCookies.mockReset();
  mocks.withUserContext.mockReset();
  mocks.reportsQueue.add.mockReset();
  tx.tenant.findUniqueOrThrow.mockReset();
  tx.report.create.mockReset();
  tx.report.count.mockReset();
});

describe("reports route filters", () => {
  it("crea reportes con rango personalizado y moneda", async () => {
    mocks.getSessionFromCookies.mockResolvedValue(session);
    tx.tenant.findUniqueOrThrow.mockResolvedValue({
      plan: { monthlyReportLimit: null },
    });
    tx.report.count.mockResolvedValue(0);
    tx.report.create.mockResolvedValue({
      id: "report-1",
      title: "Ventas Q1",
      format: "XLSX",
      periodDays: 30,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-01-31T23:59:59.000Z"),
      currencyFilter: "USD",
      status: "QUEUED",
      createdAt: new Date("2026-04-09T00:00:00.000Z"),
    });
    mocks.withUserContext.mockImplementation(async (_prisma, _userId, callback) => callback(tx));

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Ventas Q1",
          format: "xlsx",
          periodDays: 30,
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-01-31T23:59:59.000Z",
          currency: "usd",
        }),
      }) as never,
    );

    expect(response.status).toBe(201);
    expect(tx.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        title: "Ventas Q1",
        format: "XLSX",
        periodDays: 30,
        currencyFilter: "USD",
        periodStart: new Date("2026-01-01T00:00:00.000Z"),
        periodEnd: new Date("2026-01-31T23:59:59.000Z"),
      }),
      select: expect.objectContaining({
        id: true,
        periodStart: true,
        periodEnd: true,
        currencyFilter: true,
      }),
    });
    expect(mocks.reportsQueue.add).toHaveBeenCalledWith(
      "generate-report",
      expect.objectContaining({
        tenantId: "tenant-1",
        reportId: "report-1",
        format: "xlsx",
        periodDays: 30,
        periodStartIso: "2026-01-01T00:00:00.000Z",
        periodEndIso: "2026-01-31T23:59:59.000Z",
        currency: "USD",
      }),
      { jobId: "report-1" },
    );
  });

  it("rechaza moneda invalida", async () => {
    mocks.getSessionFromCookies.mockResolvedValue(session);

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Ventas Q1",
          format: "pdf",
          periodDays: 30,
          currency: "US",
        }),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(mocks.reportsQueue.add).not.toHaveBeenCalled();
  });

  it("rechaza crear reporte cuando se alcanza el limite mensual del plan", async () => {
    mocks.getSessionFromCookies.mockResolvedValue(session);
    tx.tenant.findUniqueOrThrow.mockResolvedValue({
      plan: { monthlyReportLimit: 1 },
    });
    tx.report.count.mockResolvedValue(1);
    mocks.withUserContext.mockImplementation(async (_prisma, _userId, callback) => callback(tx));

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Reporte bloqueado",
          format: "pdf",
          periodDays: 30,
        }),
      }) as never,
    );

    expect(response.status).toBe(409);
    expect(tx.report.create).not.toHaveBeenCalled();
    expect(mocks.reportsQueue.add).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.stringContaining("Limite mensual alcanzado"),
      }),
    );
  });
});
