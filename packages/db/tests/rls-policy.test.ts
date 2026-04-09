import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL("../prisma/migrations/202604080001_init/migration.sql", import.meta.url),
  "utf8",
);

const transactionMigrationSql = readFileSync(
  new URL("../prisma/migrations/202604090001_transactions_and_report_metrics/migration.sql", import.meta.url),
  "utf8",
);

describe("RLS migration", () => {
  it("define políticas para evitar fuga entre tenants", () => {
    expect(migrationSql).toContain('ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('CREATE POLICY report_read_member ON "Report"');
    expect(migrationSql).toContain('CREATE POLICY report_write_member ON "Report"');
    expect(migrationSql).toContain('CREATE POLICY tenant_member_read ON "Tenant"');
    expect(migrationSql).toContain('app.user_id');
    expect(transactionMigrationSql).toContain('ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;');
    expect(transactionMigrationSql).toContain('CREATE POLICY transaction_read_member ON "Transaction"');
    expect(transactionMigrationSql).toContain('CREATE POLICY transaction_write_member ON "Transaction"');
  });
});
