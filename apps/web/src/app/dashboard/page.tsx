import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/session";
import { ReportsPanel } from "./reports-panel";

export default async function DashboardPage() {
  const session = await getSessionFromCookies();

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
          <form action="/api/auth/logout" method="post" className="mt-5">
            <button
              type="submit"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar sesion
            </button>
          </form>
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

        <ReportsPanel />
      </section>
    </main>
  );
}
