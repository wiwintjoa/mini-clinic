# Module Architecture

Each module owns its tables and business rules. Controllers translate HTTP, services implement use cases, and Drizzle repositories remain thin query code inside the owning module.

| Module | Ownership | Key dependencies |
|---|---|---|
| auth | login, refresh rotation, logout, current identity | users, roles |
| users / roles | staff accounts and RBAC assignments | audit |
| patients | demographics, MRN, portal ownership | audit |
| doctors | doctor profile and schedules | users |
| appointments | booking, conflicts and status lifecycle | patients, doctors, services |
| queue | daily numbering, call/check-in lifecycle | appointments, visits |
| visits / diagnoses | consultation, vitals, SOAP, diagnosis | patients, doctors |
| prescriptions | prescribing and submission | visits, medicines |
| pharmacy / inventory | verification, FEFO dispensing, batches and ledger | prescriptions |
| billing / payments | invoices, balance and settlement | visits, pharmacy |
| reports | read-only aggregate queries and CSV | operational modules |
| audit | immutable security/business event records | users |

Cross-module calls use injected services within the monolith. Critical workflows use a single database transaction. Circular ownership is avoided by referencing identifiers and exposing narrow service methods.

