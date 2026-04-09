"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReportItem = {
  id: string;
  title: string;
  format: "PDF" | "XLSX";
  periodDays: 7 | 30 | 90;
  periodStart: string | null;
  periodEnd: string | null;
  currencyFilter: string | null;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRYING";
  outputUrl: string | null;
  recordsProcessed: number | null;
  totalAmountCents: number | null;
  createdAt: string;
  updatedAt: string;
};

type ReportsResponse = {
  reports: ReportItem[];
};

type PlanLimits = {
  plan: {
    id: string;
    name: string;
    monthlyReportLimit: number | null;
  };
  usage: {
    current: number;
    limit: number | null;
    remaining: number | null;
    isUnlimited: boolean;
    monthStart: string;
    monthEnd: string;
  };
};

const statusClassName: Record<ReportItem["status"], string> = {
  QUEUED: "bg-slate-100 text-slate-700 border-slate-200",
  PROCESSING: "bg-amber-100 text-amber-700 border-amber-200",
  RETRYING: "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-100 text-rose-700 border-rose-200",
};

export function ReportsPanel() {
  const hasLoadedReportsRef = useRef(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(30);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [currency, setCurrency] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch("/api/reports", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Tu sesión expiró. Vuelve a entrar con GitHub.");
        }

        throw new Error("No se pudieron cargar los reportes");
      }

      const data = (await response.json()) as ReportsResponse;
      const nextReports = Array.isArray(data.reports) ? data.reports : [];
      setReports(nextReports);
      if (nextReports.length > 0) {
        hasLoadedReportsRef.current = true;
      }
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Error inesperado";
      if (message === "Tu sesión expiró. Vuelve a entrar con GitHub." || hasLoadedReportsRef.current) {
        setError(message);
      } else {
        console.error("Error loading reports:", loadError);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlanLimits = useCallback(async () => {
    try {
      const response = await fetch("/api/tenant/plan-limits", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar los limites del plan");
      }

      const data = (await response.json()) as PlanLimits;
      setPlanLimits(data);
    } catch (limitError) {
      console.error("Error loading plan limits:", limitError);
      // Don't set error state - this is non-critical
    }
  }, []);

  useEffect(() => {
    void loadReports();
    void loadPlanLimits();

    const interval = setInterval(() => {
      void loadReports();
      void loadPlanLimits();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadReports, loadPlanLimits]);

  const activeCount = useMemo(
    () => reports.filter((report) => report.status === "PROCESSING" || report.status === "RETRYING").length,
    [reports],
  );

  async function handleCreateReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("El titulo es obligatorio");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title,
          format,
          periodDays,
          periodStart: useCustomRange && periodStart ? periodStart : undefined,
          periodEnd: useCustomRange && periodEnd ? periodEnd : undefined,
          currency: currency.trim() ? currency.trim().toUpperCase() : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo crear el reporte");
      }

      setTitle("");
      setError(null);
      await loadReports();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Error inesperado";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-700">Reportes</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Generacion y seguimiento</h2>
          {planLimits && (
            <p className="mt-2 text-xs text-slate-600">
              Plan <span className="font-semibold">{planLimits.plan.name}</span>
              {planLimits.usage.isUnlimited ? (
                " • Reportes ilimitados"
              ) : (
                ` • ${planLimits.usage.current}/${planLimits.usage.limit} reportes usados este mes`
              )}
            </p>
          )}
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Activos: {activeCount}
        </div>
      </header>

      <form onSubmit={handleCreateReport} className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.6fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej: Ventas mensuales"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
        />
        <select
          value={format}
          onChange={(event) => setFormat(event.target.value as "pdf" | "xlsx")}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
        >
          <option value="pdf">PDF</option>
          <option value="xlsx">XLSX</option>
        </select>
        <select
          value={periodDays}
          onChange={(event) => setPeriodDays(Number(event.target.value) as 7 | 30 | 90)}
          disabled={useCustomRange}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
        >
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
        <input
          value={currency}
          onChange={(event) => setCurrency(event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 3))}
          placeholder="Moneda (USD)"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 md:col-span-2"
        />
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 md:col-span-4">
          <input
            type="checkbox"
            checked={useCustomRange}
            onChange={(event) => setUseCustomRange(event.target.checked)}
          />
          Usar rango personalizado
        </label>
        {useCustomRange ? (
          <>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
            />
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
            />
          </>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 md:col-start-4"
        >
          {submitting ? "Encolando..." : "Generar"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando reportes...</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500">Aun no hay reportes. Crea el primero para probar el worker.</p>
      ) : (
        <div className="grid gap-3">
          {reports.map((report) => (
            <article
              key={report.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.5fr_0.6fr_0.8fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                <p className="mt-1 text-xs text-slate-500">ID: {report.id}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {report.periodStart && report.periodEnd
                    ? `Periodo: ${report.periodStart.slice(0, 10)} a ${report.periodEnd.slice(0, 10)}`
                    : `Periodo: ultimos ${report.periodDays} dias`}
                </p>
                {report.currencyFilter ? (
                  <p className="mt-1 text-xs text-slate-500">Moneda: {report.currencyFilter}</p>
                ) : null}
              </div>

              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {report.format}
              </div>

              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[report.status]}`}
              >
                {report.status}
              </span>

              <div className="text-xs text-slate-600">
                {report.recordsProcessed !== null ? (
                  <>
                    <p>Registros: {report.recordsProcessed}</p>
                    <p>
                      Ventas: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format((report.totalAmountCents ?? 0) / 100)}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400">Sin resumen aun</p>
                )}
              </div>

              {report.status === "COMPLETED" && report.outputUrl ? (
                <a
                  href={report.outputUrl}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Descargar
                </a>
              ) : (
                <span className="text-xs text-slate-400">Esperando artefacto</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
