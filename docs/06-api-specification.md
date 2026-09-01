# API Specification

Base path: `/api`. JSON success responses use `{ "data": ..., "message": "Success" }`. Lists use `{ "data": [], "meta": { "page", "limit", "total", "totalPages" } }`. Errors use `{ "statusCode", "message", "errors?", "requestId?" }`.

## Phase 1 endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | liveness |
| POST | `/auth/login` | public, throttled | credentials to access token + refresh cookie |
| POST | `/auth/refresh` | refresh cookie | rotate refresh token |
| POST | `/auth/logout` | authenticated/cookie | revoke refresh session |
| GET | `/auth/me` | authenticated | trusted profile, role and permissions |

Login accepts `{ email, password }`; passwords are never returned or logged. Access tokens contain user/session identifiers, not frontend-supplied authority. Pagination defaults to page 1 and limit 20, capped at 100. Sorting uses endpoint allowlists.

Future resource roots are `/users`, `/patients`, `/doctors`, `/appointments`, `/queue`, `/visits`, `/diagnoses`, `/prescriptions`, `/pharmacy`, `/inventory`, `/services`, `/billing`, `/payments`, and `/reports`. Their endpoint contracts are finalized in their phase to avoid speculative API surface.

