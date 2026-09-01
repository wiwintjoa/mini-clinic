# Implementation Roadmap

Each phase follows: architecture note, schema and migration, backend/API, frontend, validation, tests, verification and documentation. A phase is closed only after its acceptance checks pass.

1. **Foundation:** workspace, Docker/PostgreSQL, Drizzle, Nest conventions, Mantine theme, JWT refresh flow, RBAC and role shells.
2. **Patients:** constrained patient schema, transactional MRN generation, CRUD/search/pagination and front-office UX.
3. **Appointments:** doctors, schedules, services, booking conflicts, walk-in/check-in and daily queues.
4. **Consultation:** visits, vital signs, SOAP, diagnosis and medical history.
5. **Prescription:** draft/submission lifecycle, item validation and pharmacy queue.
6. **Pharmacy:** medicines, batches, stock ledger, transactional FEFO allocation/dispensing.
7. **Billing:** invoice generation, partial/full payment and receipt.
8. **Patient portal:** server-enforced ownership across appointment, queue, history, prescriptions and invoices.
9. **Reports:** filterable aggregates and streamed CSV exports.
10. **Hardening:** complete audit coverage, end-to-end Playwright workflow, security/performance/accessibility review and production runbook.

Phase 1 acceptance: Compose configuration is coherent; migration and seed are repeatable; login/refresh/logout/me work; guards deny missing permission; frontend uses Mantine and restores a session; lint, typecheck, unit tests and production builds pass.

