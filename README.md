# Multi-tenant SaaS Reports

![CI](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml/badge.svg)

Proyecto portfolio Fullstack + DevOps (nivel mid) centrado en tres diferenciales:

- Aislamiento de datos multi-tenant con `tenant_id + RLS`.
- Jobs resilientes con BullMQ (retries + backoff exponencial).
- Credibilidad DevOps con CI verde en GitHub Actions.

## Stack

- Frontend: Next.js 14 (App Router)
- Backend/API: Next.js + TypeScript
- Queue: BullMQ + Redis
- Data: PostgreSQL
- Worker: Node.js TypeScript

## Primer arranque

1. Copia variables de entorno:

```bash
cp .env.example .env
```

2. Levanta PostgreSQL y Redis:

```bash
docker compose up -d
```

3. Instala dependencias:

```bash
npm install
```

4. Inicia frontend y worker en terminales separadas:

```bash
npm run dev:web
npm run dev:worker
```

## Validaciones de calidad

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Estado actual

- Hito 0 en progreso: base de monorepo, worker y CI inicial.
- Hito 1 siguiente: auth, tenants y aislamiento fuerte con RLS.
