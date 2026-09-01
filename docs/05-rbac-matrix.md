# RBAC Matrix

`*_SELF` permissions additionally require an API ownership predicate. Role checks alone never grant access to another patient's data.

| Capability | Admin | Receptionist | Doctor | Pharmacist | Patient |
|---|:---:|:---:|:---:|:---:|:---:|
| USER_MANAGE / REPORT_READ | ✓ |  |  |  |  |
| PATIENT_READ_ANY | ✓ | ✓ | ✓ |  |  |
| PATIENT_CREATE / PATIENT_UPDATE | ✓ | ✓ |  |  |  |
| PATIENT_READ_SELF |  |  |  |  | ✓ |
| APPOINTMENT_MANAGE_ANY | ✓ | ✓ |  |  |  |
| APPOINTMENT_READ_ASSIGNED |  |  | ✓ |  |  |
| APPOINTMENT_MANAGE_SELF |  |  |  |  | ✓ |
| VISIT_READ_ANY | ✓ |  | ✓ |  |  |
| VISIT_CREATE / DIAGNOSIS_CREATE / PRESCRIPTION_CREATE |  |  | ✓ |  |  |
| VISIT_READ_SELF |  |  |  |  | ✓ |
| PRESCRIPTION_PROCESS / PRESCRIPTION_DISPENSE |  |  |  | ✓ |  |
| INVENTORY_READ | ✓ |  | ✓ | ✓ |  |
| INVENTORY_UPDATE | ✓ |  |  | ✓ |  |
| BILLING_CREATE / PAYMENT_CREATE | ✓ | ✓ |  |  |  |
| BILLING_READ_SELF |  |  |  |  | ✓ |

Phase 1 seeds the complete permission vocabulary and default mappings. Endpoints declare permissions with metadata; `PermissionsGuard` loads the trusted user and permissions from the validated JWT/database context.

