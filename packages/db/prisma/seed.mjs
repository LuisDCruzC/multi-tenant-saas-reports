import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dayMs = 24 * 60 * 60 * 1000;

function buildTransactions(tenantId, currency, offsetDays = 0) {
  const now = new Date();
  const categories = ["Subscriptions", "Consulting", "Support", "Training", "Implementation"];
  const customers = [
    "Acme North",
    "Globex MX",
    "Initech LATAM",
    "Umbrella Labs",
    "Wayne Systems",
  ];

  return Array.from({ length: 10 }).map((_, index) => {
    const occurredAt = new Date(now.getTime() - (index + offsetDays) * dayMs);
    occurredAt.setHours(9 + (index % 8), 15, 0, 0);

    return {
      tenantId,
      customerName: customers[index % customers.length],
      category: categories[index % categories.length],
      amountCents: 15000 + index * 4200,
      currency,
      occurredAt,
    };
  });
}

async function seedTenant({
  email,
  name,
  slug,
  tenantName,
  planId,
  currency,
  offsetDays,
}) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { name: tenantName, planId },
    create: {
      slug,
      name: tenantName,
      planId,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  await prisma.transaction.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.transaction.createMany({
    data: buildTransactions(tenant.id, currency, offsetDays),
  });

  await prisma.report.deleteMany({
    where: {
      tenantId: tenant.id,
      title: {
        startsWith: "Demo",
      },
    },
  });

  await prisma.report.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: "Demo PDF report",
        format: "PDF",
        periodDays: 30,
        currencyFilter: currency,
        status: "COMPLETED",
        createdByUserId: user.id,
        recordsProcessed: 10,
        totalAmountCents: 339000,
      },
      {
        tenantId: tenant.id,
        title: "Demo XLSX report",
        format: "XLSX",
        periodDays: 7,
        currencyFilter: currency,
        status: "QUEUED",
        createdByUserId: user.id,
      },
    ],
  });

  return {
    user,
    tenant,
  };
}

async function main() {
  const freePlan = await prisma.plan.upsert({
    where: { name: "FREE" },
    update: { monthlyReportLimit: null },
    create: {
      name: "FREE",
      monthlyReportLimit: null,
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { name: "STARTER" },
    update: { monthlyReportLimit: 3 },
    create: {
      name: "STARTER",
      monthlyReportLimit: 3,
    },
  });

  const tenants = await Promise.all([
    seedTenant({
      email: "owner.alpha@example.com",
      name: "Owner Alpha",
      slug: "demo-alpha",
      tenantName: "Demo Alpha LLC",
      planId: freePlan.id,
      currency: "USD",
      offsetDays: 0,
    }),
    seedTenant({
      email: "owner.beta@example.com",
      name: "Owner Beta",
      slug: "demo-beta",
      tenantName: "Demo Beta SA",
      planId: starterPlan.id,
      currency: "USD",
      offsetDays: 12,
    }),
  ]);

  console.log("Seed completed:");
  for (const item of tenants) {
    console.log(`- ${item.tenant.slug} (${item.user.email})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
