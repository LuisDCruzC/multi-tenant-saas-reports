import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@saas/db";
import { createSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();
  const tenantName = String(formData.get("tenantName") ?? "").trim();

  if (!email || !tenantSlug || !tenantName) {
    return NextResponse.json(
      { error: "email, tenantSlug y tenantName son requeridos" },
      { status: 400 },
    );
  }

  const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.upsert({
      where: { email },
      update: { name: name ?? undefined },
      create: { email, name },
    });

    const tenant = await tx.tenant.upsert({
      where: { slug: tenantSlug },
      update: { name: tenantName },
      create: { slug: tenantSlug, name: tenantName },
    });

    await tx.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        tenantId: tenant.id,
        role: "OWNER",
      },
    });

    return {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    };
  });

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const cookie = createSessionCookie(session);
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
