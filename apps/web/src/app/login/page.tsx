"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  github_oauth_failed: "No se pudo completar el acceso con GitHub.",
  invalid_github_state: "La sesión OAuth expiró o fue invalidada.",
  missing_github_code: "GitHub no devolvió un código válido.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = error ? errorMessages[error] ?? "No se pudo completar el acceso." : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Access
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Acceso al dashboard
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Entra con GitHub para aprovisionar tu tenant, crear la sesión firmada y abrir el
              panel de reportes sin pasos intermedios.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm text-cyan-50">
            <p className="font-semibold">Autenticación lista para portfolio</p>
            <p className="leading-6 text-cyan-50/80">
              La cuenta de GitHub define tu identidad y el sistema genera el contexto multi-tenant
              automáticamente para el dashboard.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-cyan-100/80">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">
                GitHub OAuth
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">
                Sesión firmada
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">
                Tenant context
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Inicio de sesión</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">Conecta tu cuenta</h2>
            </div>

            <a
              href="/api/auth/github/start"
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Entrar con GitHub
            </a>

            <p className="text-sm leading-6 text-slate-400">
              Si GitHub devuelve un error, volverás a esta pantalla con el estado de la sesión.
            </p>

            {errorMessage ? (
              <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <LoginContent />
    </Suspense>
  );
}
