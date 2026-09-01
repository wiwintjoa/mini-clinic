# Phase 6: Inventory and Dispensing

Batch quantity and the signed stock ledger update in the same transaction. Dispensing locks eligible, non-expired batches and allocates earliest expiry first (FEFO). Any shortage rolls back every allocation and returns a clear 409 error. The prescription becomes `DISPENSED` only after all items are fully allocated.
