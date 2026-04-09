import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@saas/db";
import { createSessionCookie } from "@/lib/session";
import { provisionUserTenantSession } from "@/lib/provision-session";

function hashCode(code: string) {
  const secret = process.env.AUTH_SESSION_SECRET ?? "dev-session-secret";
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        code?: string;
      }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "email y code son requeridos" }, { status: 400 });
  }

  const loginCode = await prisma.authLoginCode.findFirst({
    where: {
      email,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!loginCode) {
    return NextResponse.json({ error: "Codigo invalido o expirado" }, { status: 400 });
  }

  const incomingHash = hashCode(code);
  if (incomingHash !== loginCode.codeHash) {
    await prisma.authLoginCode.update({
      where: { id: loginCode.id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ error: "Codigo incorrecto" }, { status: 401 });
  }

  const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.authLoginCode.update({
      where: { id: loginCode.id },
      data: {
        usedAt: new Date(),
      },
    });

    return provisionUserTenantSession(tx, {
      email: loginCode.email,
      name: loginCode.name,
      tenantSlug: loginCode.tenantSlug,
      tenantName: loginCode.tenantName,
    });
  });

  const response = NextResponse.json({ ok: true, session });
  const cookie = createSessionCookie(session);
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
