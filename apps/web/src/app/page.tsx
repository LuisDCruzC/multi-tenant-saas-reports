import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-12 text-slate-900 sm:px-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-700">
            Multi-tenant SaaS Reports
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Reportes multi-tenant con OAuth real, colas resilientes y artefactos descargables.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
            Esta demo implementa un flujo completo: login con GitHub, provision de tenant,
            creacion de reportes con limites por plan, procesamiento asincrono con BullMQ
            y descarga de PDF o XLSX desde el dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Demo login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Ver dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Tenant isolation", "tenant_id + RLS como linea de defensa principal."],
            ["OAuth + sesion", "GitHub OAuth con cookie firmada en backend."],
            ["Worker + artifacts", "Generacion de PDF/XLSX y descarga segura por tenant."],
          ].map(([title, description]) => (
            <article
              key={title}
              className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] backdrop-blur"
            >
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-2xl shadow-slate-300/30">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                  Estado del sistema
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Base lista para handoff a AWS</h2>
              </div>
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                Validado
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-300">Base de datos</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Prisma + PostgreSQL con usuarios, tenants, membresias, transacciones y reportes.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-300">Autenticacion</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  GitHub OAuth y sesion firmada para propagar el contexto de tenant.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-300">Reportes</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Crear, listar y descargar reportes con control de limites por plan.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-300">Validación</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  El monorepo pasa lint, test y build; smoke local validado en rutas clave.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.3)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Checklist deploy</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>1. Configurar secretos OAuth y sesion en GitHub Actions.</li>
              <li>2. Ejecutar deploy AWS por workflow manual.</li>
              <li>3. Verificar login, cola y descarga de artifacts en ambiente.</li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
