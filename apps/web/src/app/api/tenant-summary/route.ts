import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, withUserContext } from "@saas/db";

export async function GET() {
  const requestHeaders = headers();
  const userId = requestHeaders.get("x-demo-user-id") ?? "demo-user-id";

  const data = await withUserContext(prisma, userId, async (tx: Prisma.TransactionClient) => {
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
      userId,
      tenantCount: tenants.length,
      tenants,
    };
  });

  return NextResponse.json({
    message: "Tenant context ready",
    ...data,
  });
}
