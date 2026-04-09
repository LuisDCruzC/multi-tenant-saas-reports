# Web App

Aplicacion Next.js (App Router) que expone la UI y las API routes del proyecto multi-tenant.

## Responsabilidades

- Flujo de autenticacion con GitHub OAuth
- Emision y lectura de sesion firmada por cookie
- Endpoints de reportes (crear, listar, descargar)
- Endpoint de limites del plan y resumen de tenant
- Dashboard con polling para estado de procesamiento

## Scripts

Desde la raiz del monorepo:

```bash
npm run dev:web
npm run test --workspace web
npm run build --workspace web
npm run lint --workspace web
```

## Variables de Entorno Clave

La app lee variables desde `apps/web/.env.local` en desarrollo.

```env
AUTH_SESSION_SECRET=dev-session-secret
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
DATABASE_URL=postgresql://saas:saas@localhost:5432/saas_reports
REDIS_URL=redis://localhost:6379
REPORTS_OUTPUT_DIR=./artifacts
```

## Endpoints Relevantes

- `GET /api/auth/github/start`
- `GET /api/auth/github/callback`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/reports/[reportId]/download`
- `GET /api/tenant/plan-limits`
- `GET /api/tenant-summary`

## Notas de Implementacion

- `POST /api/reports` aplica validacion de limites por plan y devuelve `409` cuando se excede.
- La ruta `/login` usa `Suspense` para soportar `useSearchParams` en build de produccion.
- La descarga de artifacts valida tenant y ownership antes de responder el archivo.

## Pruebas

Suite disponible en `apps/web/tests`:

- OAuth start y callback (paths exitosos y de error)
- Creacion/listado de reportes y control de limites
- Descarga de artifacts (401, 404 y exito)
