# Phase 8 handoff: Patient portal

## Outcome

Phase 8 is complete. The patient portal provides profile, dashboard, appointment booking/cancellation, queue tracking, medical history, prescription history, and invoices.

## Security and data ownership

- The seeded patient account is linked to `CLN-000001` through `patients.portal_user_id`.
- Every portal query resolves the authenticated user to a patient record on the backend and filters by that patient ID.
- Staff billing endpoints remain inaccessible to patient tokens.

## API and UI changes

- Added `/api/patient-portal/*` self-service endpoints.
- Added responsive `/patient/dashboard`, `/patient/profile`, `/patient/appointments`, `/patient/queue`, `/patient/history`, `/patient/prescriptions`, and `/patient/invoices` screens.
- Added TanStack Query caching/invalidation, Zod/RHF booking validation, loading, error, and empty states.

## Verification

- Active portal files pass scoped ESLint and TypeScript; frontend production build passes.
- Backend typecheck, 10 tests, and production build pass.
- Docker verified login as `patient@clinic.local`, profile ownership (`CLN-000001`), self-booking and cancellation, one visit, dispensed prescription, paid invoice with zero balance, and HTTP 403 on the staff billing API.
- All seven portal routes resolve from the frontend container.

## Next phase

Phase 9 implements filterable operational reports and CSV exports.
