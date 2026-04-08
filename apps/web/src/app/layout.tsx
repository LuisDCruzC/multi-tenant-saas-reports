import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-tenant SaaS Reports",
  description: "SaaS de reportes multi-tenant con worker resiliente y CI visible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
