import { describe, expect, it, vi } from "vitest";
import { processReportJob } from "../src/report-processor.js";

describe("processReportJob", () => {
  it("marca el reporte como completed y guarda outputUrl/outputPath", async () => {
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({
      createdByUser: {
        email: null,
      },
    });
    const prismaClient = {
      report: {
        updateMany,
        findUnique,
      },
    };

    const result = await processReportJob(
      {
        tenantId: "tenant-1",
        reportId: "report-1",
        format: "pdf",
      },
      {
        prismaClient: prismaClient as never,
        generateArtifact: async () => ({
          filePath: "/tmp/reports/report-1.pdf",
          outputUrl: "/api/reports/report-1/download",
        }),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      },
    );

    expect(result).toEqual({
      status: "completed",
      outputUrl: "/api/reports/report-1/download",
      outputPath: "/tmp/reports/report-1.pdf",
    });
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "report-1",
        tenantId: "tenant-1",
        status: {
          in: ["QUEUED", "RETRYING"],
        },
      },
      data: {
        status: "PROCESSING",
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: "report-1",
        tenantId: "tenant-1",
      },
      data: {
        status: "COMPLETED",
        outputUrl: "/api/reports/report-1/download",
        outputPath: "/tmp/reports/report-1.pdf",
      },
    });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("marca retrying cuando falla la generacion", async () => {
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const prismaClient = {
      report: {
        updateMany,
      },
    };

    await expect(
      processReportJob(
        {
          tenantId: "tenant-1",
          reportId: "report-1",
          format: "xlsx",
        },
        {
          prismaClient: prismaClient as never,
          generateArtifact: async () => {
            throw new Error("boom");
          },
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        },
      ),
    ).rejects.toThrow("boom");

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "report-1",
        tenantId: "tenant-1",
        status: {
          in: ["QUEUED", "RETRYING"],
        },
      },
      data: {
        status: "PROCESSING",
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: "report-1",
        tenantId: "tenant-1",
      },
      data: {
        status: "RETRYING",
      },
    });
  });
});
