-- Create enums
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- Core tables
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
  "outputUrl" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- Unique constraints and indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Report_tenantId_status_idx" ON "Report"("tenantId", "status");
CREATE INDEX "Report_createdByUserId_idx" ON "Report"("createdByUserId");

-- Foreign keys
ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS helper based on the current authenticated user
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.user_id', true), '');
$$;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_self_read ON "User"
FOR SELECT
USING (id = app_current_user_id());

CREATE POLICY tenant_member_read ON "Tenant"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Tenant".id
      AND m."userId" = app_current_user_id()
  )
);

CREATE POLICY membership_read_own ON "Membership"
FOR SELECT
USING ("userId" = app_current_user_id());

CREATE POLICY membership_insert_own ON "Membership"
FOR INSERT
WITH CHECK ("userId" = app_current_user_id());

CREATE POLICY report_read_member ON "Report"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Report"."tenantId"
      AND m."userId" = app_current_user_id()
  )
);

CREATE POLICY report_write_member ON "Report"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Report"."tenantId"
      AND m."userId" = app_current_user_id()
  )
);

CREATE POLICY report_update_member ON "Report"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Report"."tenantId"
      AND m."userId" = app_current_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."tenantId" = "Report"."tenantId"
      AND m."userId" = app_current_user_id()
  )
);
