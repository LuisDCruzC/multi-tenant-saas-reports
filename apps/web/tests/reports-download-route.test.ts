import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const mocks = vi.hoisted(() => ({
  withUserContext: vi.fn(),
  getSessionFromCookies: vi.fn(),
  prisma: {},
}));

vi.mock("@saas/db", () => ({
  prisma: mocks.prisma,
  withUserContext: mocks.withUserContext,
}));

vi.mock("@/lib/session", () => ({
  getSessionFromCookies: mocks.getSessionFromCookies,
}));

const { GET } = await import("@/app/api/reports/[reportId]/download/route");

const session = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "ana@example.com",
  tenantSlug: "acme",
  tenantName: "Acme Corp",
};

let tempDir: string;

beforeEach(async () => {
  mocks.withUserContext.mockReset();
  mocks.getSessionFromCookies.mockReset();
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "report-download-test-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("reports download route", () => {
  it("returns 401 when session is missing", async () => {
    mocks.getSessionFromCookies.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/reports/report-1/download") as never,
      { params: Promise.resolve({ reportId: "report-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when report is not available for tenant", async () => {
    mocks.getSessionFromCookies.mockResolvedValue(session);
    mocks.withUserContext.mockImplementation(async (_prisma, _userId, callback) => callback({ report: { findFirst: vi.fn().mockResolvedValue(null) } }));

    const response = await GET(
      new Request("http://localhost/api/reports/report-1/download") as never,
      { params: Promise.resolve({ reportId: "report-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns file content and headers when report exists", async () => {
    const filePath = path.join(tempDir, "report-1.pdf");
    await fs.writeFile(filePath, Buffer.from("demo-pdf"));

    mocks.getSessionFromCookies.mockResolvedValue(session);
    mocks.withUserContext.mockImplementation(async (_prisma, _userId, callback) =>
      callback({
        report: {
          findFirst: vi.fn().mockResolvedValue({
            id: "report-1",
            format: "PDF",
            outputPath: filePath,
          }),
        },
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/reports/report-1/download") as never,
      { params: Promise.resolve({ reportId: "report-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("report-1.pdf");

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.toString("utf8")).toBe("demo-pdf");
  });
});
