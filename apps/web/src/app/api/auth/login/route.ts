import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@saas/db";
import { createSessionCookie } from "@/lib/session";
import { provisionUserTenantSession } from "@/lib/provision-session";

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
    return provisionUserTenantSession(tx, {
      email,
      name,
      tenantSlug,
      tenantName,
    });
  });

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const cookie = createSessionCookie(session);
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
