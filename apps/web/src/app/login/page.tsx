export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 sm:px-10 lg:px-16">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
            Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Demo auth para entrar al dashboard
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Esta versión usa una sesión firmada para demostrar el flujo completo de tenant
            context sin depender todavía de un proveedor externo.
          </p>
        </div>

        <form
          action="/api/auth/login"
          method="post"
          className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20"
        >
          <label className="grid gap-2 text-sm">
            <span>Email</span>
            <input
              name="email"
              type="email"
              defaultValue="ana@example.com"
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Nombre</span>
            <input
              name="name"
              type="text"
              defaultValue="Ana Developer"
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Tenant slug</span>
            <input
              name="tenantSlug"
              type="text"
              defaultValue="acme"
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Tenant name</span>
            <input
              name="tenantName"
              type="text"
              defaultValue="Acme Corp"
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Entrar al dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
