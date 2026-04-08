import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { env } from "./config.js";
import type { GenerateReportJobData } from "./queue.js";

function formatExtension(format: GenerateReportJobData["format"]) {
  return format === "pdf" ? "pdf" : "xlsx";
}

function resolveArtifactPath(job: GenerateReportJobData) {
  return path.resolve(
    env.REPORTS_OUTPUT_DIR,
    job.tenantId,
    `${job.reportId}.${formatExtension(job.format)}`,
  );
}

async function createPdf(filePath: string, job: GenerateReportJobData) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const output = doc.pipe(createWriteStream(filePath));

    output.on("finish", () => resolve());
    output.on("error", (error) => reject(error));

    doc.fontSize(18).text("SaaS Report", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Report ID: ${job.reportId}`);
    doc.text(`Tenant ID: ${job.tenantId}`);
    doc.text(`Generated at: ${new Date().toISOString()}`);
    doc.text(`Format: PDF`);
    doc.moveDown();
    doc.text(
      "Este archivo es generado por el worker BullMQ para demostrar resiliencia con retries y backoff exponencial.",
    );
    doc.end();
  });
}

async function createXlsx(filePath: string, job: GenerateReportJobData) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 56 },
  ];

  sheet.addRow({ field: "Report ID", value: job.reportId });
  sheet.addRow({ field: "Tenant ID", value: job.tenantId });
  sheet.addRow({ field: "Generated at", value: new Date().toISOString() });
  sheet.addRow({ field: "Format", value: "XLSX" });

  await workbook.xlsx.writeFile(filePath);
}

export async function generateReportArtifact(job: GenerateReportJobData) {
  const filePath = resolveArtifactPath(job);

  if (job.format === "pdf") {
    await createPdf(filePath, job);
  } else {
    await createXlsx(filePath, job);
  }

  return {
    filePath,
    outputUrl: `/api/reports/${job.reportId}/download`,
  };
}
