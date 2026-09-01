# Phase 7 handoff: Billing and payments

## Outcome

Phase 7 is complete. Front-office users can generate visit invoices from authoritative service and dispensed-medicine prices, receive partial or full payments, and review receipts.

## Database changes

- Added invoice/payment enums, `invoice_counters`, `invoices`, `invoice_items`, and `payments`.
- Enforced one invoice per visit, positive amounts, bounded paid totals, unique payment references, and indexed billing lookups.

## API and UI changes

- Added paginated/searchable billing endpoints, completed-unbilled visit discovery, invoice generation, invoice detail, and transactional payment creation.
- Added `/front-office/billing` with generation, payment, balance, status, and receipt states.

## Verification

- Frontend active-file lint, typecheck, and production build pass.
- Backend typecheck, 10 tests, and production build pass.
- Docker generated `INV-20260901-0001` with consultation and dispensed medicine items (subtotal IDR 172,000), applied IDR 1,000 discount, recorded two payments, and reached `PAID` with zero balance.
- Invoice and both payment audit entries were verified in PostgreSQL.

## Known issues

- Refund workflow is deferred beyond the MVP payment/receipt path.

## Next phase

Phase 8 implements the ownership-enforced patient portal.
