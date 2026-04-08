CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'XLSX');

ALTER TABLE "Report"
  ADD COLUMN "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
  ADD COLUMN "outputPath" TEXT;
