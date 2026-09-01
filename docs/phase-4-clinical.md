# Phase 4: Consultation

Starting a consultation is transactional: validate doctor ownership, create the visit, move queue to `IN_CONSULTATION`, and appointment to `IN_PROGRESS`. The visit owns SOAP notes, one current vital-sign set, and multiple ICD-10 diagnoses with one optional primary diagnosis. Completing a visit requires a chief complaint and at least one diagnosis, then completes the visit, appointment, and queue together.
