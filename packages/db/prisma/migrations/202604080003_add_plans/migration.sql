-- CreateTable Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyReportLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- AddColumn planId to Tenant
ALTER TABLE "Tenant" ADD COLUMN "planId" TEXT;

-- CreateIndex Plan_name_key
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex Tenant_planId_key
CREATE INDEX "Tenant_planId" ON "Tenant"("planId");

-- AddForeignKey Tenant_planId -> Plan_id
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- InsertData: Create default FREE plan (unlimited)
INSERT INTO "Plan" (id, name, "monthlyReportLimit", "createdAt", "updatedAt") 
VALUES (gen_random_uuid()::text, 'FREE', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
