import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@saas/db";
import { createSessionCookie } from "@/lib/session";

const sampleCategories = ["Subscriptions", "Consulting", "Support", "Training", "Implementation"];
const sampleCustomers = [
  "Acme North",
  "Globex MX",
  "Initech LATAM",
  "Umbrella Labs",
  "Wayne Systems",
  "Stark Industries",
  "Wonka Retail",
  "Hooli Ventures",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

    const existingTransactions = await tx.transaction.count({
      where: {
        tenantId: tenant.id,
      },
    });

    if (existingTransactions === 0) {
      const now = new Date();
      const syntheticTransactions = Array.from({ length: 220 }).map((_, index) => {
        const daysAgo = randomInt(0, 89);
        const occurredAt = new Date(now);
        occurredAt.setDate(now.getDate() - daysAgo);
        occurredAt.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59), 0);

        return {
          tenantId: tenant.id,
          customerName: sampleCustomers[index % sampleCustomers.length],
          category: sampleCategories[index % sampleCategories.length],
          amountCents: randomInt(1500, 180000),
          currency: "USD",
          occurredAt,
        };
      });

      await tx.transaction.createMany({
        data: syntheticTransactions,
      });
    }

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
