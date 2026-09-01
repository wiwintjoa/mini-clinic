# Database Schema

All identifiers are UUIDs generated with `gen_random_uuid()`. Operational tables use `created_at` and `updated_at` as timezone-aware timestamps. Money uses `numeric(14,2)` and quantities use explicit checks.

## Phase ownership

| Phase | Tables |
|---|---|
| 1 | roles, permissions, role_permissions, users, refresh_tokens |
| 2 | patients, mrn_counters |
| 3 | doctors, doctor_schedules, services, appointments, queue_entries |
| 4 | visits, vital_signs, diagnoses, visit_diagnoses |
| 5 | prescriptions, prescription_items |
| 6 | medicine_categories, medicines, medicine_batches, stock_transactions, dispense_allocations |
| 7 | invoices, invoice_items, payments |
| 8 | ownership indexes/portal-specific constraints (no duplicate clinical data) |
| 9 | reporting views/materialized views only if profiling justifies them |
| 10 | audit_logs and hardening migrations (audit integration starts earlier) |

Status fields use PostgreSQL enums or check constraints. Foreign-key delete behavior is conservative: clinical and financial records are restricted, while disposable sessions cascade from users. Search indexes cover normalized email, MRN/NIK/phone, dates and foreign keys. Inventory truth is the append-only stock ledger reconciled with batch quantity in the same transaction.

