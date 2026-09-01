# Mini Clinic Management System

Production-oriented outpatient clinic MVP built as a modular monolith with React, TypeScript, Mantine, NestJS, Drizzle ORM, PostgreSQL, Docker, and Playwright.

## Implemented workflow

The application supports the complete MVP path:

Patient registration → appointment or walk-in preparation → check-in → queue → consultation → vital signs → SOAP → diagnosis → prescription → pharmacy processing → transactional FEFO dispensing → inventory deduction → invoice → payment → patient-owned history, prescription, and invoice access.

It also includes JWT/refresh-cookie authentication, granular RBAC, role dashboards, doctor schedules, server pagination/search, audit logs, operational reports, and CSV export.

## Run with Docker

Copy `.env.example` to `.env` and replace the JWT secrets and database password before any shared deployment.

```bash
docker compose up --build
```

Default development URLs:

- Frontend: http://localhost:5173/login
- Backend health: http://localhost:3000/api/health
- PostgreSQL: localhost:5432

If those ports are occupied, set `FRONTEND_PORT`, `BACKEND_PORT`, `POSTGRES_PORT`, `VITE_API_URL`, and `CORS_ORIGIN` in `.env`. For example, this workspace has also been verified on frontend `5174`, backend `3001`, and PostgreSQL `5433`.

The backend container runs pending Drizzle migrations and idempotent development seeds before starting NestJS. PostgreSQL and backend health checks gate dependent containers.

## Development credentials

All seeded accounts use the value of `SEED_PASSWORD` (`ClinicDemo123!` by default):

| Role | Email |
| --- | --- |
| Admin | `admin@clinic.local` |
| Receptionist | `receptionist@clinic.local` |
| Doctor | `doctor@clinic.local` |
| Pharmacist | `pharmacist@clinic.local` |
| Patient | `patient@clinic.local` |

These credentials are synthetic development data only. Change or disable them outside local development.

## Local checks

```bash
npm ci
npm run typecheck
npm run lint
npm run build

cd backend
npm ci
npm run typecheck
npm test
npm run build
```

With Docker running, execute the critical workflow:

```bash
npm run test:e2e
```

The default E2E backend is `http://localhost:3001/api/`. Override it when using the default Docker port:

```bash
E2E_API_URL=http://localhost:3000/api/ npm run test:e2e
```

The Playwright test uses its API request engine and does not require a browser download. It creates synthetic, uniquely named records on each run.

## Repository map

- `src/ClinicApp.tsx` — active React shell, authorization-aware navigation, and lazy routes.
- `src/features/` — active feature-based frontend modules.
- `backend/src/modules/` — business-focused NestJS modules.
- `backend/src/database/schema/` — Drizzle schemas.
- `backend/src/database/migrations/` — ordered PostgreSQL migrations.
- `e2e/clinic-workflow.spec.ts` — critical MVP acceptance workflow.
- `docs/` — architecture, ERD, RBAC, API, screens, roadmap, and phase handoffs.

## Security notes

- Backend guards enforce every role/permission decision; frontend navigation is only a usability layer.
- Patient portal queries resolve `portal_user_id` and apply patient ownership filters server-side.
- Refresh tokens are opaque, hashed in PostgreSQL, rotated on refresh, and sent in an HTTP-only same-site cookie.
- Passwords use Argon2. DTO validation rejects unknown fields. Helmet, CORS allowlists, authentication throttling, parameterized Drizzle queries, transaction boundaries, and audit trails are enabled.
- Configure TLS at the reverse proxy and use high-entropy secrets in production.

## Current limitations

- Docker Compose is optimized for reproducible development; a production deployment should build immutable runtime images and place frontend/backend behind TLS termination.
- Refunds, external payment gateways, messaging, insurance/BPJS claims, laboratory integration, and multi-clinic tenancy remain out of MVP scope.
