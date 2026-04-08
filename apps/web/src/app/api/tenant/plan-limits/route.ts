import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import { withUserContext } from "@saas/db";
import { prisma } from "@saas/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await withUserContext(
      prisma,
      session.userId,
      async (ctxPrisma) => {
        const tenant = await ctxPrisma.tenant.findFirstOrThrow({
          select: {
            id: true,
            plan: {
              select: {
                id: true,
                name: true,
                monthlyReportLimit: true,
              },
            },
          },
        });

        // Count reports created this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const reportCount = await ctxPrisma.report.count({
          where: {
            tenantId: tenant.id,
            createdAt: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
        });

        const limit = tenant.plan?.monthlyReportLimit ?? null;
        const isUnlimited = limit === null;
        const remaining = isUnlimited ? null : Math.max(0, limit - reportCount);

        return {
          plan: {
            id: tenant.plan?.id,
            name: tenant.plan?.name || "FREE",
            monthlyReportLimit: limit,
          },
          usage: {
            current: reportCount,
            limit: limit,
            remaining: remaining,
            isUnlimited: isUnlimited,
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
          },
        };
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Plan limits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan limits" },
      { status: 500 }
    );
  }
}
