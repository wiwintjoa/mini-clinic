# Phase 2: Patient Management

## Architecture

The `patients` module owns demographics, search and lifecycle state. MRNs are allocated inside the same PostgreSQL transaction as patient creation by atomically advancing the `CLN` counter. Controllers enforce `PATIENT_READ_ANY`, `PATIENT_CREATE` and `PATIENT_UPDATE`; the patient-portal ownership endpoint remains Phase 8.

## Database changes

Migration `0001_patients.sql` creates patient enums, `mrn_counters`, `patients`, and the audit log foundation. MRN, NIK and portal identity uniqueness are database enforced. Search and status columns are indexed.

## API

- `GET /api/patients?page=1&limit=20&search=&sortBy=createdAt&sortDirection=desc`
- `GET /api/patients/:id`
- `POST /api/patients`
- `PATCH /api/patients/:id`

Lists are server paginated. Search covers MRN, name, NIK and phone. Create/update errors preserve the global API error shape.

## UI

Authorized admin and reception users receive a Patients navigation item and responsive list. The feature includes debounced server search, loading/error/empty states, pagination, registration/edit modal, Zod validation and query invalidation.
