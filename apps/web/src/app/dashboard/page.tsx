import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/session";

export default function DashboardPage() {
  const session = getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900 sm:px-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-700">
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Contexto autenticado y tenant activo
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Esta pantalla confirma que la sesión firmada lleva user y tenant, y que el backend
            puede usar ese contexto para aplicar RLS.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Usuario</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{session.email}</p>
            <p className="mt-1 text-sm text-slate-600">ID: {session.userId}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Tenant</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{session.tenantName}</p>
            <p className="mt-1 text-sm text-slate-600">Slug: {session.tenantSlug}</p>
          </article>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Siguiente verificación</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            El siguiente paso es crear reportes reales y probar que un tenant no puede acceder a
            datos de otro tenant, incluso cuando el worker procesa jobs.
          </p>
        </div>
      </section>
    </main>
  );
}
