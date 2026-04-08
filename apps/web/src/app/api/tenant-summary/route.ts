import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, withUserContext } from "@saas/db";
import { getSessionFromCookies } from "@/lib/session";

export async function GET() {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const data = await withUserContext(prisma, session.userId, async (tx: Prisma.TransactionClient) => {
    const tenants = await tx.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      userId: session.userId,
      tenantId: session.tenantId,
      tenantCount: tenants.length,
      tenants,
    };
  });

  return NextResponse.json({
    message: "Tenant context ready",
    ...data,
  });
}
