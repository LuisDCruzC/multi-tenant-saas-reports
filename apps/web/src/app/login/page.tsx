"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type RequestCodeResponse = {
  ok: true;
  expiresAt: string;
  devCode?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ana@example.com");
  const [name, setName] = useState("Ana Developer");
  const [tenantSlug, setTenantSlug] = useState("acme");
  const [tenantName, setTenantName] = useState("Acme Corp");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const canVerify = useMemo(() => code.trim().length === 6, [code]);

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingRequest(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, tenantSlug, tenantName }),
      });

      const payload = (await response.json().catch(() => null)) as RequestCodeResponse | { error?: string } | null;

      if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error ?? "No se pudo solicitar el código");
      }

      setExpiresAt((payload as RequestCodeResponse).expiresAt);
      if ((payload as RequestCodeResponse).devCode) {
        setCode((payload as RequestCodeResponse).devCode ?? "");
      }

      setMessage("Código solicitado. Revisa el email o usa el código de desarrollo si está disponible.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado");
    } finally {
      setLoadingRequest(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingVerify(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo verificar el código");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Error inesperado");
    } finally {
      setLoadingVerify(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Access
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Login profesional con código de verificación
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Esta versión ya usa un flujo de dos pasos para demostrar identidad, tenant context y
              aprovisionamiento de datos sintéticos por tenant.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm text-cyan-50">
            <p className="font-semibold">Cómo probarlo en local</p>
            <p className="mt-2 leading-6 text-cyan-50/80">
              Solicita el código, revisa el valor de desarrollo si aparece y luego pégalo en el paso
              de verificación. Al validar, entras al dashboard con sesión firmada.
            </p>
            {expiresAt ? <p className="mt-3 text-xs text-cyan-100/80">Expira: {expiresAt}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <form onSubmit={handleRequestCode} className="grid gap-4">
            <h2 className="text-lg font-semibold text-slate-100">1. Solicitar código</h2>
            <label className="grid gap-2 text-sm">
              <span>Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Nombre</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Tenant slug</span>
              <input
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value)}
                type="text"
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Tenant name</span>
              <input
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                type="text"
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
            </label>
            <button
              type="submit"
              disabled={loadingRequest}
              className="mt-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingRequest ? "Solicitando..." : "Enviar código"}
            </button>
          </form>

          <form onSubmit={handleVerifyCode} className="grid gap-4 border-t border-white/10 pt-4">
            <h2 className="text-lg font-semibold text-slate-100">2. Verificar código</h2>
            <label className="grid gap-2 text-sm">
              <span>Código</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
            </label>
            <button
              type="submit"
              disabled={loadingVerify || !canVerify}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingVerify ? "Verificando..." : "Entrar al dashboard"}
            </button>
          </form>

          {message ? (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
