import type { Prisma } from "@prisma/client";

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

type ProvisionInput = {
  email: string;
  name: string | null;
  tenantSlug: string;
  tenantName: string;
};

export async function provisionUserTenantSession(tx: Prisma.TransactionClient, input: ProvisionInput) {
  const user = await tx.user.upsert({
    where: { email: input.email },
    update: { name: input.name ?? undefined },
    create: { email: input.email, name: input.name },
  });

  const tenant = await tx.tenant.upsert({
    where: { slug: input.tenantSlug },
    update: { name: input.tenantName },
    create: { slug: input.tenantSlug, name: input.tenantName },
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
}
