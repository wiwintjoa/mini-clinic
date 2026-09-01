# System Architecture

Mini Clinic is a modular monolith for one outpatient clinic. A React/Vite single-page application communicates with a NestJS REST API under `/api`; only the API accesses PostgreSQL through Drizzle ORM.

## Runtime boundaries

- **Web:** role-specific Mantine UI, React Router, TanStack Query, React Hook Form and Zod. Client authorization improves navigation but is never authoritative.
- **API:** business-focused NestJS modules, DTO validation, use-case services, permission guards, transactions, consistent envelopes and audit logging.
- **Database:** PostgreSQL UUID keys, constraints and indexes protect invariants. Drizzle owns schema and migrations.
- **Deployment:** three Docker Compose services (`frontend`, `backend`, `postgres`). The API is the sole trust boundary.

Authentication uses short-lived JWT access tokens and rotating opaque refresh tokens stored as hashes. The browser receives the refresh token in an HttpOnly cookie; the access token is held in memory. All protected operations resolve permissions from server-side persistence.

The existing Supabase/Tailwind prototype is retained temporarily as product reference but is not the target architecture. New work uses Mantine and the Nest API; Supabase artifacts will be retired incrementally when their replacement phase is complete.

## Quality attributes

- Simplicity: one deployable API and one database.
- Security: least privilege, ownership checks, DTO validation, rate-limited login, Helmet, CORS allowlist, hashed secrets and auditable mutations.
- Reliability: database transactions for check-in, dispensing and payment; idempotency where external retries are likely.
- Scalability: stateless API, server pagination, indexed search, horizontal API scaling.
- Observability: request correlation IDs, structured errors, health endpoint, audit trail; metrics/log shipping is production configuration.

