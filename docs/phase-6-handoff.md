# Phase 6 handoff: Pharmacy and inventory

## Outcome

Phase 6 is complete. Pharmacists can process submitted prescriptions, mark them ready, and dispense them transactionally against non-expired medicine batches using FEFO.

## Database changes

- Added `medicine_batches`, `stock_transactions`, and `dispense_allocations`.
- Added positive-quantity and unique batch/allocation constraints plus inventory lookup indexes.
- Seeded two non-expired batches for each of 20 medicines and matching purchase ledger entries.

## API changes

- `GET /api/inventory`
- `GET /api/inventory/:medicineId/batches`
- `POST /api/inventory/batches`
- `POST /api/inventory/batches/:id/adjust`
- `POST /api/pharmacy/prescriptions/:id/process`
- `POST /api/pharmacy/prescriptions/:id/ready`
- `POST /api/pharmacy/prescriptions/:id/dispense`

## UI changes

- Added permission-aware pharmacy inventory navigation and stock overview.
- Extended prescription processing through submitted, processing, ready, and dispensed states.
- Added loading, empty, and error states for active pharmacy screens.

## Verification

- Backend typecheck, 8 tests, and production build pass.
- Active Phase 6 frontend files pass scoped ESLint; frontend typecheck and production build pass.
- Docker runtime verified `RX-20260901-0001` dispensed 9 Paracetamol tablets from `MED-001-B1` (expiry 2027-06-30), leaving 41 in that batch and 100 in the later batch.
- The stock ledger records a `DISPENSE` transaction of `-9`; the prescription item records 9 dispensed.

## Known issues

- The repository-wide frontend lint script includes an inactive prototype tree and generated backend declarations. Phase-specific scoped lint is clean; cleanup is tracked for Phase 10.
- Vite reports a non-blocking initial chunk-size warning.

## Next phase

Phase 7 implements invoices, invoice items, payments, receipt UI, and transactional balance/status updates.
