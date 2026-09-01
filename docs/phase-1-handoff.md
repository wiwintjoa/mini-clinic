# Phase 1 Handoff

## Scope delivered

- Nine architecture/product specifications in `docs/`.
- NestJS modular API foundation with configuration validation, consistent responses/errors, Helmet, CORS, validation and throttling.
- PostgreSQL/Drizzle RBAC schema, migration and deterministic development seed.
- Argon2 login, short-lived JWT access tokens, hashed rotating refresh sessions in HttpOnly cookies, logout and `/auth/me`.
- Global authentication and granular permission guards.
- Mantine theme, responsive role shell, validated login, session restoration, loading and error notifications.
- Docker Compose services for PostgreSQL, backend and frontend.

## Development

Copy `.env.example` to `.env`, change secrets, then run `docker compose up --build`. Seed logins use the addresses requested in the product specification and the `SEED_PASSWORD` value.

Without Docker: run `npm install`, `npm install --prefix backend`, configure PostgreSQL, then run backend migration/seed/start scripts and `npm run dev` in separate terminals.

## Deliberately deferred

Patient CRUD/MRN starts Phase 2. Existing Supabase prototype modules remain only as migration reference and are not wired into the Phase 1 entry point.
