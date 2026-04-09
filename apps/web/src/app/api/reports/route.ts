import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma, withUserContext } from "@saas/db";
import { reportsQueue, type ReportFormat } from "@saas/queue";
import { getSessionFromCookies } from "@/lib/session";

function isReportFormat(value: string): value is ReportFormat {
  return value === "pdf" || value === "xlsx";
}

function isValidPeriodDays(value: number): value is 7 | 30 | 90 {
  return value === 7 || value === 30 || value === 90;
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
        periodDays: true,
        status: true,
        outputUrl: true,
        recordsProcessed: true,
        totalAmountCents: true,
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
        periodDays?: number;
      }
    | null;

  const title = body?.title?.trim();
  const format = body?.format ?? "pdf";
  const periodDays = body?.periodDays ?? 30;

  if (!title) {
    return NextResponse.json({ error: "title es requerido" }, { status: 400 });
  }

  if (!isReportFormat(format)) {
    return NextResponse.json({ error: "format debe ser pdf o xlsx" }, { status: 400 });
  }

  if (!isValidPeriodDays(periodDays)) {
    return NextResponse.json({ error: "periodDays debe ser 7, 30 o 90" }, { status: 400 });
  }

  const report = await withUserContext(prisma, session.userId, async (tx: Prisma.TransactionClient) => {
    // Check plan limits (informational only, not enforced yet)
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
      select: {
        plan: {
          select: { monthlyReportLimit: true },
        },
      },
    });

    if (tenant.plan?.monthlyReportLimit !== null && tenant.plan?.monthlyReportLimit !== undefined) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const reportCount = await tx.report.count({
        where: {
          tenantId: session.tenantId,
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      const limit = tenant.plan.monthlyReportLimit;
      if (reportCount >= limit) {
        // TODO: Enforce this limit when user decides to activate billing gates
        console.warn(
          `[PLAN_LIMIT] Tenant ${session.tenantId} would exceed limit (${reportCount}/${limit}), but enforcement disabled`
        );
      }
    }

    return tx.report.create({
      data: {
        tenantId: session.tenantId,
        title,
        format: format === "pdf" ? "PDF" : "XLSX",
        periodDays,
        status: "QUEUED",
        createdByUserId: session.userId,
      },
      select: {
        id: true,
        title: true,
        format: true,
        periodDays: true,
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
      periodDays,
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
