import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, withUserContext } from "@saas/db";
import { getSessionFromCookies } from "@/lib/session";

function contentTypeByFormat(format: "PDF" | "XLSX") {
  return format === "PDF"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function fileNameByFormat(reportId: string, format: "PDF" | "XLSX") {
  return `${reportId}.${format === "PDF" ? "pdf" : "xlsx"}`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { reportId } = await context.params;

  const report = await withUserContext(prisma, session.userId, async (tx: Prisma.TransactionClient) => {
    return tx.report.findFirst({
      where: {
        id: reportId,
        tenantId: session.tenantId,
        status: "COMPLETED",
      },
      select: {
        id: true,
        format: true,
        outputPath: true,
      },
    });
  });

  if (!report?.outputPath) {
    return NextResponse.json({ error: "Reporte no disponible" }, { status: 404 });
  }

  const absolutePath = path.resolve(report.outputPath);
  const fileBuffer = await fs.readFile(absolutePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "content-type": contentTypeByFormat(report.format),
      "content-disposition": `attachment; filename=\"${fileNameByFormat(report.id, report.format)}\"`,
    },
  });
}
