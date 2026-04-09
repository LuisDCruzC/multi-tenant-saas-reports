import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "@saas/db";
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

function formatCurrencyFromCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

type ReportMetrics = {
  periodDays: number;
  recordsProcessed: number;
  totalAmountCents: number;
  currency: string;
  byCategory: Array<{ category: string; amountCents: number; count: number }>;
  byCustomer: Array<{ customerName: string; amountCents: number; count: number }>;
};

async function buildMetrics(job: GenerateReportJobData): Promise<ReportMetrics> {
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeStart.getDate() - job.periodDays);

  const transactions = await prisma.transaction.findMany({
    where: {
      tenantId: job.tenantId,
      occurredAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    orderBy: {
      occurredAt: "desc",
    },
    select: {
      amountCents: true,
      currency: true,
      category: true,
      customerName: true,
    },
  });

  const currency = transactions[0]?.currency ?? "USD";
  const totalAmountCents = transactions.reduce((acc, item) => acc + item.amountCents, 0);

  const byCategoryMap = new Map<string, { amountCents: number; count: number }>();
  const byCustomerMap = new Map<string, { amountCents: number; count: number }>();

  for (const item of transactions) {
    const categoryTotals = byCategoryMap.get(item.category) ?? { amountCents: 0, count: 0 };
    categoryTotals.amountCents += item.amountCents;
    categoryTotals.count += 1;
    byCategoryMap.set(item.category, categoryTotals);

    const customerTotals = byCustomerMap.get(item.customerName) ?? { amountCents: 0, count: 0 };
    customerTotals.amountCents += item.amountCents;
    customerTotals.count += 1;
    byCustomerMap.set(item.customerName, customerTotals);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([category, totals]) => ({ category, ...totals }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 10);

  const byCustomer = [...byCustomerMap.entries()]
    .map(([customerName, totals]) => ({ customerName, ...totals }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 10);

  return {
    periodDays: job.periodDays,
    recordsProcessed: transactions.length,
    totalAmountCents,
    currency,
    byCategory,
    byCustomer,
  };
}

async function createPdf(filePath: string, job: GenerateReportJobData, metrics: ReportMetrics) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const output = doc.pipe(createWriteStream(filePath));

    output.on("finish", () => resolve());
    output.on("error", (error) => reject(error));

    doc.fontSize(18).text("SaaS Report", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Reporte ID: ${job.reportId}`);
    doc.text(`Tenant ID: ${job.tenantId}`);
    doc.text(`Periodo: ultimos ${metrics.periodDays} dias`);
    doc.text(`Registros procesados: ${metrics.recordsProcessed}`);
    doc.text(`Ventas totales: ${formatCurrencyFromCents(metrics.totalAmountCents, metrics.currency)}`);
    const avgTicket = metrics.recordsProcessed === 0 ? 0 : Math.round(metrics.totalAmountCents / metrics.recordsProcessed);
    doc.text(`Ticket promedio: ${formatCurrencyFromCents(avgTicket, metrics.currency)}`);
    doc.moveDown();

    doc.fontSize(14).text("Top categorias", { underline: true });
    doc.moveDown(0.5);
    if (metrics.byCategory.length === 0) {
      doc.fontSize(11).text("Sin transacciones en el periodo seleccionado.");
    } else {
      metrics.byCategory.forEach((item, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${item.category} - ${item.count} tx - ${formatCurrencyFromCents(item.amountCents, metrics.currency)}`,
          );
      });
    }

    doc.moveDown();
    doc.fontSize(14).text("Top clientes", { underline: true });
    doc.moveDown(0.5);
    if (metrics.byCustomer.length === 0) {
      doc.fontSize(11).text("Sin transacciones en el periodo seleccionado.");
    } else {
      metrics.byCustomer.forEach((item, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${item.customerName} - ${item.count} tx - ${formatCurrencyFromCents(item.amountCents, metrics.currency)}`,
          );
      });
    }

    doc.end();
  });
}

async function createXlsx(filePath: string, job: GenerateReportJobData, metrics: ReportMetrics) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("summary");
  const byCategory = workbook.addWorksheet("by_category");
  const byCustomer = workbook.addWorksheet("by_customer");

  summary.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 56 },
  ];

  summary.addRow({ field: "Report ID", value: job.reportId });
  summary.addRow({ field: "Tenant ID", value: job.tenantId });
  summary.addRow({ field: "Period days", value: metrics.periodDays });
  summary.addRow({ field: "Records processed", value: metrics.recordsProcessed });
  summary.addRow({ field: "Total sales", value: formatCurrencyFromCents(metrics.totalAmountCents, metrics.currency) });
  summary.addRow({ field: "Generated at", value: new Date().toISOString() });

  byCategory.columns = [
    { header: "Category", key: "category", width: 30 },
    { header: "Transactions", key: "count", width: 16 },
    { header: "Amount", key: "amount", width: 24 },
  ];

  for (const row of metrics.byCategory) {
    byCategory.addRow({
      category: row.category,
      count: row.count,
      amount: formatCurrencyFromCents(row.amountCents, metrics.currency),
    });
  }

  byCustomer.columns = [
    { header: "Customer", key: "customer", width: 30 },
    { header: "Transactions", key: "count", width: 16 },
    { header: "Amount", key: "amount", width: 24 },
  ];

  for (const row of metrics.byCustomer) {
    byCustomer.addRow({
      customer: row.customerName,
      count: row.count,
      amount: formatCurrencyFromCents(row.amountCents, metrics.currency),
    });
  }

  await workbook.xlsx.writeFile(filePath);
}

export async function generateReportArtifact(job: GenerateReportJobData) {
  const filePath = resolveArtifactPath(job);
  const metrics = await buildMetrics(job);

  if (job.format === "pdf") {
    await createPdf(filePath, job, metrics);
  } else {
    await createXlsx(filePath, job, metrics);
  }

  return {
    filePath,
    outputUrl: `/api/reports/${job.reportId}/download`,
    metrics,
  };
}
