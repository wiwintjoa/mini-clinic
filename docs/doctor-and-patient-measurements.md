# Compact Doctor Workflow and Patient Measurements

## Data model

Migration `0007_patient_measurements_doctor_workflow.sql` adds `patient_vital_signs`. Measurements are time-based records and are never stored as patient master columns. Each record belongs to a patient, may belong to a visit, records the user and measurement time, and keeps required blood pressure, weight, and height plus optional temperature, pulse, respiratory rate, and SpO2.

Patient registration creates the patient, generated MRN, and initial measurement in one PostgreSQL transaction. NIK remains uniquely constrained. The duplicate-search API warns on NIK, phone, or exact name plus date of birth before staff choose whether to create another patient.

Check-in creates a new measurement with the patient and recorder in the queue transaction. When the doctor starts the consultation, the newest unlinked check-in measurement is linked to the new visit. Subsequent doctor corrections update that visit record and create an audit entry containing old and new values.

The migration also adds compact consultation fields to `visits`: `examination_findings`, `clinical_note`, `treatment_note`, `follow_up_note`, and `follow_up_date`. Legacy SOAP columns remain for safe migration compatibility.

## Patient APIs

- `GET /api/patients/duplicates`
- `POST /api/patients` — patient master plus required `initialMeasurement`
- `GET /api/patients/:id` — includes `latestMeasurement`
- `GET /api/patients/:id/vital-signs?page=1&limit=20`
- `POST /api/patients/:id/vital-signs`
- `PATCH /api/patients/:id/vital-signs/:measurementId`
- `POST /api/queue/check-in/:appointmentId` — accepts optional `measurement`

## Doctor APIs and workflow

- `POST /api/visits/from-queue/:queueId`
- `GET /api/visits/:id`
- `PATCH /api/visits/:id/consultation` — saves a draft
- `PUT /api/visits/:id/vitals`
- `POST /api/visits/:id/diagnoses`
- `POST /api/visits/:id/complete`
- `GET /api/doctor/patients/:patientId/history`

Completion requires only a non-empty chief complaint and one primary diagnosis. It transactionally completes the visit, queue entry, and appointment. If a draft prescription has at least one valid item, it is submitted to Pharmacy in the same transaction. An empty optional prescription draft is not submitted.

## UI

Patient registration uses five responsive Mantine sections: personal, contact, emergency contact, payment, and initial measurement. Patient detail shows latest measurement cards, paginated history, and an append-only Add Measurement action. Appointment check-in opens a measurement form before queue creation.

The doctor dashboard contains only today’s total, waiting, current, and completed counters plus the assigned queue. The consultation screen is one vertical page containing the patient summary, current measurements, complaint, findings, diagnosis search, optional prescription, optional treatment/clinical notes, and advice/follow-up. Patient history and completion confirmation use drawers/modals without splitting the consultation into wizard steps.

## Verification

- Frontend TypeScript check, ESLint, and production build
- Backend build and 14 unit tests
- Docker migration and health checks
- Playwright critical workflow covering transactional registration, check-in measurements linked to the visit, compact consultation, automatic prescription submission, FEFO dispensing, inventory deduction, billing/payment, and patient portal history
