# Multi-tenant SaaS Reports

![CI](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml/badge.svg)

Plataforma SaaS completa para generación de reportes con aislamiento multi-tenant, colas resilientes y gestión de planes de facturación. Implementada con Next.js, BullMQ, PostgreSQL y TypeScript.

## 🎯 Características

- **Multi-tenant con RLS**: Aislamiento de datos usando `tenant_id` + PostgreSQL Row-Level Security
- **Colas resilientes**: BullMQ con 5 reintentos exponenciales (2s inicial)
- **Generación real**: PDF (pdfkit) y XLSX (exceljs)
- **Notificaciones**: Email automático on completion/failure (nodemailer)
- **Dashboard interactivo**: Status en tiempo real con polling 4s
- **Planes de facturación**: Infraestructura lista (modo ilimitado por defecto)
- **TypeScript estricto**: Type-safe en todo el stack
- **Zero vulnerabilities**: npm audit limpio

## 📦 Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | Next.js (SSR + API Routes) | 15.5.14 |
| **Auth** | GitHub OAuth + HMAC-SHA256 sessions | - |
| **Database** | PostgreSQL + Prisma + RLS | 16 + 5.22 |
| **Queue** | BullMQ + Redis | 5.10 + 7 |
| **Worker** | Node.js TypeScript | - |
| **Testing** | Vitest | 4.1.3 |
| **Styling** | Tailwind CSS | 3.x |

## 🏗️ Estructura del Monorepo

```
multi-tenant-saas-reports/
├── apps/
│   ├── web/                    # Frontend + API Routes
│   │   ├── src/app/
│   │   │   ├── api/            # REST endpoints
│   │   │   ├── dashboard/      # UI componentes
│   │   │   └── login/
│   │   └── public/
│   └── worker/                 # Procesador de reportes
│       ├── src/
│       │   ├── worker.ts       # BullMQ Worker
│       │   ├── report-processor.ts
│       │   ├── report-artifact.ts (PDF/XLSX)
│       │   ├── report-notifier.ts (email)
│       │   └── queue.ts
│       └── tests/
├── packages/
│   ├── db/                     # Cliente Prisma + esquema
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── client.ts       # Instancia de Prisma
│   │       ├── tenant-context.ts (RLS wrapper)
│   │       └── index.ts
│   └── queue/                  # Configuración compartida de BullMQ
│       └── src/
│           └── index.ts        # reportsQueue + tipos
└── docker-compose.yml          # PostgreSQL + Redis
```

## 🚀 Setup Completo

### 1️⃣ Variables de Entorno

```bash
cp .env.example .env
```

El `.env` debe tener:
```env
DATABASE_URL=postgresql://saas:saas@localhost:5432/saas_reports
REDIS_URL=redis://localhost:6379
NODE_ENV=development
AUTH_SESSION_SECRET=dev-session-secret
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
REPORTS_OUTPUT_DIR=./artifacts
SMTP_URL=
SMTP_FROM=report-bot@example.com
```

### 2️⃣ Levantar Infraestructura

```bash
docker compose up -d
```

Esto arranca:
- **PostgreSQL 16** en `localhost:5432` (usuario: `saas` / pass: `saas`)
- **Redis 7** en `localhost:6379`

Verificar:
```bash
docker compose ps
```

### 3️⃣ Instalar Dependencias

```bash
npm install
```

Esto instala todas las dependencias del monorepo.

### 4️⃣ Inicializar Base de Datos

#### Generar tipos de Prisma:
```bash
cd packages/db && npx prisma generate
```

#### Aplicar migraciones:
```bash
# Si es primera vez (base de datos vacía):
cd packages/db && npx prisma migrate deploy

# O si quieres modo dev con seed:
cd packages/db && npx prisma migrate dev
```

**Si hay error de permisos**, las migraciones se pueden aplicar manualmente:
```bash
cd packages/db
for migration in prisma/migrations/*/migration.sql; do
  cat "$migration" | docker compose exec -T postgres psql -U saas -d saas_reports
done
```

### 5️⃣ Levantar Desarrollo

**Terminal 1 - Frontend + API Routes:**
```bash
npm run dev:web
```
Accesible en: http://localhost:3000 (redirect a login)

**Terminal 2 - Worker (procesa reportes):**
```bash
npm run dev:worker
```

**Terminal 3 (opcional) - Monitoreo:**
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 🔐 Flujo de Autenticación

1. Usuario accede `/login`
2. Click en `Entrar con GitHub`
3. `GET /api/auth/github/start` redirige a GitHub con state anti-CSRF
4. GitHub vuelve a `GET /api/auth/github/callback`
5. La app crea o actualiza el usuario, aprovisiona tenant y firma la sesión
6. Dashboard accesible, puede crear/ver reportes
7. `POST /api/auth/logout` cierra sesión

> **Nota**: el flujo principal es OAuth real con GitHub. El tenant se aprovisiona automáticamente desde la identidad del proveedor.

## 📝 Flujo de Reportes

```
Usuario crea reporte
    ↓
POST /api/reports (titulo, formato: PDF|XLSX)
    ↓
Inserta en DB con status=QUEUED
    ↓
Encola en BullMQ con jobId = reportId
    ↓
Worker procesa (PDF/XLSX generation)
    ↓
Actualiza status→COMPLETED, guarda outputPath
    ↓
Envía email a owner
    ↓
Dashboard polling ve cambio en 4s
    ↓
Usuario descarga `/api/reports/[reportId]/download`
```

## 📊 Endpoints API

| Método | Path | Descripción |
|--------|------|---|
| `GET` | `/api/auth/me` | User actual + tenant (requiere session) |
| `GET` | `/api/auth/github/start` | Iniciar OAuth con GitHub |
| `GET` | `/api/auth/github/callback` | Finalizar OAuth y crear sesión |
| `POST` | `/api/auth/logout` | Eliminar sesión |
| `GET` | `/api/reports` | Listar reportes del tenant |
| `POST` | `/api/reports` | Crear + encolar nuevo reporte |
| `GET` | `/api/reports/[reportId]/download` | Descargar artifact (PDF/XLSX) |
| `GET` | `/api/tenant/plan-limits` | Estado del plan + uso mensual |
| `GET` | `/api/tenant-summary` | Info del tenant actual |

## 🎨 Dashboard

Página `/dashboard` con:
- **Crear reporte**: form con título + selector formato
- **Listado**: tus reportes con status (QUEUED, PROCESSING, COMPLETED, FAILED, RETRYING)
- **Descarga**: botón solo para COMPLETED
- **Plan info**: muestra "FREE • Ilimitados"
- **Polling**: actualiza cada 4 segundos
- **Logout**: botón para cerrar sesión

## 🔄 Estados de Reporte

```
QUEUED          → Esperando procesamiento
   ↓
PROCESSING      → Worker generando artifact
   ↓
COMPLETED       → Listo para descargar (éxito)
RETRYING        → Reintentando (max 5 intentos)
   ↓
FAILED          → Agotados reintentos
```

Reintentos: exponencial backoff (2000ms * 2^attempt)

## 🔧 Troubleshooting

### Error: "User `saas` was denied access"
```bash
# Reiniciar containers con volúmenes limpios
docker compose down -v
docker compose up -d
sleep 5

# Re-aplicar migraciones
cd packages/db && npx prisma generate
cd packages/db && npx prisma migrate deploy
```

### Migraciones no aplican (P1003)
```bash
# Aplicar SQL manualmente
cd packages/db
for migration in prisma/migrations/*/migration.sql; do
  cat "$migration" | docker compose exec -T postgres psql -U saas -d saas_reports
done
```

### imports en .env no funciona
Asegurar que en cada workspace está el `.env` correcto:
```bash
# Root
cp .env.example .env

# DB workspace
cd packages/db
cat > .env << EOF
DATABASE_URL=postgresql://saas:saas@localhost:5432/saas_reports
EOF
```

### Tests con error "SQLite"
Los artículos de testing usan memoria (no necesita DB vivo). Si falla:
```bash
npm run test -- --reporter=verbose
```

## ✅ Validación Pre-Deploy

```bash
# Lint
npm run lint
# Output: ✔ No ESLint warnings or errors

# Type-check
npm run typecheck
# Output: All workspaces pass

# Tests
npm run test
# Output: 7 tests passing (2 db, 2 queue, 3 worker)

# Build
npm run build
# Output: 11 routes compiled, no errors

# Security
npm audit
# Output: 0 vulnerabilities
```

## ☁️ AWS Deploy + Infra Lifecycle

Ahora el repo soporta dos cosas:

- deploy de aplicación en EC2 con Docker Compose,
- ciclo de vida de infraestructura con CloudFormation para crear, apagar y eliminar recursos.

También se migró a esquema administrado para datos:

- PostgreSQL en Amazon RDS,
- Redis en Amazon ElastiCache.

Nota importante de costo: RDS y ElastiCache administrados no siempre son más baratos que correr todo en una sola EC2. El beneficio principal es operación/estabilidad. Para costo cero total cuando no uses el sistema, usa el flujo de delete de infraestructura y luego create cuando vuelvas a necesitarlo.

### Flujos operativos

1. Ejecutar workflow `AWS Infra Create`.
2. Guardar outputs del stack: `Ec2PublicIp`, `RdsEndpoint`, `RedisEndpoint`.
3. Configurar en GitHub Secrets:
    - `EC2_HOST` = `Ec2PublicIp`
    - `AWS_STACK_NAME`
    - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
4. Configurar secretos de aplicación en GitHub (recomendado) para generar `.env` automáticamente en cada deploy:

- `APP_DATABASE_URL`
- `APP_REDIS_URL`
- `APP_AUTH_SESSION_SECRET`
- `APP_GITHUB_CLIENT_ID`
- `APP_GITHUB_CLIENT_SECRET`
- `APP_SMTP_URL`
- `APP_SMTP_FROM`

Referencia de formato en `.env.aws.example`.

5. (Opcional) Si no quieres usar secretos de GitHub, puedes crear `.env` manual en EC2 con:

```env
DATABASE_URL=postgresql://saas:<password>@<RdsEndpoint>:5432/saas_reports
REDIS_URL=redis://<RedisEndpoint>:6379
REPORTS_OUTPUT_DIR=/app/artifacts
AUTH_SESSION_SECRET=<secret>
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
SMTP_URL=
SMTP_FROM=report-bot@example.com
```

6. Ejecutar workflow `AWS App Deploy` o levantar manualmente:

```bash
docker compose -f docker-compose.aws.yml up -d --build
```

7. Apagar sin borrar todo (ahorro parcial): workflow `AWS Infra Stop`

8. Eliminar todo (ahorro máximo): workflow `AWS Infra Delete`

### Workflows incluidos

- `.github/workflows/ci.yml`: validación en PR y push.
- `.github/workflows/aws-infra-create.yml`: crea/actualiza toda la infraestructura.
- `.github/workflows/aws-infra-stop.yml`: apaga EC2 y RDS.
- `.github/workflows/aws-infra-delete.yml`: elimina stack completo.
- `.github/workflows/aws.yml`: despliegue de la app sobre EC2 (genera `.env` desde GitHub Secrets y ejecuta migraciones).

### Comandos de apagado manual (alternativa)

Si prefieres CLI local en vez de workflow:

```bash
aws ec2 stop-instances --instance-ids <ec2-id>
aws rds stop-db-instance --db-instance-identifier <rds-id>
```

Para costo cero de toda la infra:

```bash
aws cloudformation delete-stack --stack-name <stack-name>
aws cloudformation wait stack-delete-complete --stack-name <stack-name>
```

### Observabilidad mínima

- Los servicios corren con logs a stdout/stderr, así que puedes verlos con `docker compose logs -f`.
- El worker ya emite logs estructurados con `pino`.
- Si quieres, el siguiente paso es sumar CloudWatch Logs y métricas básicas.

## 📈 Próximas Características

- [ ] Gestión de usuarios (admin panel)
- [ ] Upgrades de plan (modal checkout)
- [ ] Enforcing de límites mensales por plan
- [ ] Webhooks para eventos
- [ ] E2E tests (Playwright)
- [ ] Deployment a Azure/AWS
- [ ] Soporte OAuth2

## 📄 Licencia

Proyecto portfolio. Ver LICENSE.
