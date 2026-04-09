CREATE TABLE "AuthLoginCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "tenantSlug" TEXT NOT NULL,
  "tenantName" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthLoginCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthLoginCode_email_tenantSlug_createdAt_idx" ON "AuthLoginCode"("email", "tenantSlug", "createdAt");
