ALTER TABLE "Report"
  ADD COLUMN "periodDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "recordsProcessed" INTEGER,
  ADD COLUMN "totalAmountCents" INTEGER;

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transaction_tenantId_occurredAt_idx" ON "Transaction"("tenantId", "occurredAt");
CREATE INDEX "Transaction_tenantId_category_idx" ON "Transaction"("tenantId", "category");
CREATE INDEX "Transaction_tenantId_customerName_idx" ON "Transaction"("tenantId", "customerName");

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_read_member ON "Transaction"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Transaction"."tenantId"
      AND m."userId" = app_current_user_id()
  )
);

CREATE POLICY transaction_write_member ON "Transaction"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Transaction"."tenantId"
      AND m."userId" = app_current_user_id()
  )
);

CREATE POLICY transaction_update_member ON "Transaction"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Transaction"."tenantId"
      AND m."userId" = app_current_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Transaction"."tenantId"
      AND m."userId" = app_current_user_id()
  )
);
