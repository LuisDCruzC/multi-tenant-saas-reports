import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma, withUserContext } from "@saas/db";
import { reportsQueue, type ReportFormat } from "@saas/queue";
import { getSessionFromCookies } from "@/lib/session";

function isReportFormat(value: string): value is ReportFormat {
  return value === "pdf" || value === "xlsx";
}

export async function GET() {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const reports = await withUserContext(prisma, session.userId, async (tx: Prisma.TransactionClient) => {
    return tx.report.findMany({
      where: {
        tenantId: session.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        format: true,
        status: true,
        outputUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        format?: string;
      }
    | null;

  const title = body?.title?.trim();
  const format = body?.format ?? "pdf";

  if (!title) {
    return NextResponse.json({ error: "title es requerido" }, { status: 400 });
  }

  if (!isReportFormat(format)) {
    return NextResponse.json({ error: "format debe ser pdf o xlsx" }, { status: 400 });
  }

  const report = await withUserContext(prisma, session.userId, async (tx: Prisma.TransactionClient) => {
    return tx.report.create({
      data: {
        tenantId: session.tenantId,
        title,
        format: format === "pdf" ? "PDF" : "XLSX",
        status: "QUEUED",
        createdByUserId: session.userId,
      },
      select: {
        id: true,
        title: true,
        format: true,
        status: true,
        createdAt: true,
      },
    });
  });

  await reportsQueue.add(
    "generate-report",
    {
      tenantId: session.tenantId,
      reportId: report.id,
      format,
    },
    {
      jobId: report.id,
    },
  );

  return NextResponse.json(
    {
      report,
      queued: true,
    },
    { status: 201 },
  );
}
