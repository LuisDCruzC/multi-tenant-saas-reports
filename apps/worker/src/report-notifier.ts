import nodemailer from "nodemailer";
import { env } from "./config.js";

const transporter = env.SMTP_URL
  ? nodemailer.createTransport(env.SMTP_URL)
  : nodemailer.createTransport({ jsonTransport: true });

type SendReportEmailInput = {
  to: string;
  tenantId: string;
  reportId: string;
  status: "COMPLETED" | "FAILED";
  outputUrl?: string;
};

export async function sendReportEmail(input: SendReportEmailInput) {
  const subject =
    input.status === "COMPLETED"
      ? `Reporte ${input.reportId} completado`
      : `Reporte ${input.reportId} fallido`;

  const message =
    input.status === "COMPLETED"
      ? `Tu reporte fue generado correctamente. Puedes descargarlo en: ${input.outputUrl ?? "N/A"}`
      : "Tu reporte fallo despues de agotar los reintentos del worker.";

  await transporter.sendMail({
    from: env.SMTP_FROM ?? "report-bot@example.com",
    to: input.to,
    subject,
    text: [
      `Tenant: ${input.tenantId}`,
      `Report: ${input.reportId}`,
      `Status: ${input.status}`,
      message,
    ].join("\n"),
  });
}
