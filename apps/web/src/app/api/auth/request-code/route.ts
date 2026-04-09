import { createHash, randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@saas/db";

function hashCode(code: string) {
  const secret = process.env.AUTH_SESSION_SECRET ?? "dev-session-secret";
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        name?: string;
        tenantSlug?: string;
        tenantName?: string;
      }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim() || null;
  const tenantSlug = String(body?.tenantSlug ?? "").trim().toLowerCase();
  const tenantName = String(body?.tenantName ?? "").trim();

  if (!email || !tenantSlug || !tenantName) {
    return NextResponse.json(
      { error: "email, tenantSlug y tenantName son requeridos" },
      { status: 400 },
    );
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.authLoginCode.create({
    data: {
      email,
      name,
      tenantSlug,
      tenantName,
      codeHash: hashCode(code),
      expiresAt,
    },
  });

  const responsePayload: {
    ok: true;
    expiresAt: string;
    devCode?: string;
  } = {
    ok: true,
    expiresAt: expiresAt.toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    responsePayload.devCode = code;
  }

  return NextResponse.json(responsePayload);
}
