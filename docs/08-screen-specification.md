# Screen Specification

## Shared foundations

The staff shell uses a collapsible left navigation, compact header, breadcrumb/title region and readable main content width. The patient shell uses bottom-friendly mobile navigation. Statuses have consistent semantic colors; keyboard focus, labels, contrast, loading skeletons, empty states and error recovery are mandatory.

## Phase 1 screens

- **Login:** email, password, reveal control, validation, submitting state and non-enumerating error. Development credentials are documented outside the UI.
- **Role dashboard shell:** greeting, role badge, navigation appropriate to trusted permissions, logout, responsive menu, and a foundation-status card until the dashboard phase is implemented.
- **Forbidden / not found:** explanation and safe return action.

## Later workflow screens

Patient list/detail/form; appointment calendar/list/form; check-in and queue board; doctor queue and consultation workspace; prescription composer; pharmacy verification/FEFO allocation; inventory and batches; invoice/payment; responsive patient history; filterable/exportable reports. Each follows list loading/error/empty patterns and minimizes modal depth during clinical work.

