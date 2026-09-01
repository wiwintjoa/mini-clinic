# Frontend Route Map

Public: `/login`.

Authenticated shells and landing routes:

- `/front-office/dashboard`, `/patients`, `/patients/:id`, `/appointments`, `/queue`, `/billing`
- `/doctor/dashboard`, `/queue`, `/patients/:id`, `/consultations/:visitId`
- `/pharmacy/dashboard`, `/prescriptions`, `/prescriptions/:id`, `/inventory`, `/inventory/:id`
- `/admin/dashboard`, `/doctors`, `/staff`, `/services`, `/medicines`, `/schedules`, `/reports`
- `/patient/dashboard`, `/appointments`, `/queue`, `/history`, `/prescriptions`, `/invoices`

Phase 1 activates login, protected shells and role landing dashboards. Route metadata controls navigation visibility; API authorization controls data/action access. Unauthorized routes show a clear 403 state and unknown routes show 404.

