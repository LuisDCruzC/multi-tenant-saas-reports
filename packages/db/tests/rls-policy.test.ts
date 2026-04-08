import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL("../prisma/migrations/202604080001_init/migration.sql", import.meta.url),
  "utf8",
);

describe("RLS migration", () => {
  it("define políticas para evitar fuga entre tenants", () => {
    expect(migrationSql).toContain('ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('CREATE POLICY report_read_member ON "Report"');
    expect(migrationSql).toContain('CREATE POLICY report_write_member ON "Report"');
    expect(migrationSql).toContain('CREATE POLICY tenant_member_read ON "Tenant"');
    expect(migrationSql).toContain('app.user_id');
  });
});
