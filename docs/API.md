# HTTP API and security contract

Swagger UI (development): http://127.0.0.1:5088/swagger . OpenAPI JSON: http://127.0.0.1:5088/swagger/v1/swagger.json . The committed snapshot is docs/openapi.json. Regenerate after API changes using scripts/export_openapi.py.

Authenticated calls use `Authorization: Bearer <accessToken>`. Public registration creates Student only. No cookies carry authority; CSRF tokens are not required for this in-memory bearer-token design. The frontend calls same-origin /api through the Vite development proxy. Production must use HTTPS and a same-origin reverse proxy; the development proxy is not production hosting.

| Method | Route | Who | Behavior |
|---|---|---|---|
| GET | /api/health | Public | 200 when PostgreSQL connection succeeds |
| POST | /api/auth/register | Public | Valid name/email/password → 201 Student session |
| POST | /api/auth/login | Public | 200 token + account; invalid credentials 401 |
| GET | /api/auth/me | Signed-in | Current safe account projection |
| POST | /api/auth/logout | Signed-in | 204; revoke all tokens for this account |
| GET | /api/books | Signed-in | Search/category/page, 12 titles per page; Student sees active only |
| GET | /api/books/categories | Signed-in | Active categories |
| GET | /api/books/{id} | Signed-in | Book/copy availability; 404 for Student on archived title |
| POST | /api/books | Librarian/Admin | Create manual title; 201 + Location |
| PUT | /api/books/{id} | Librarian/Admin | Version-checked edit/archive; 204 or stale 409 |
| DELETE | /api/books/{id} | Admin | 204; used title protected with 409 |
| POST | /api/books/{id}/copies | Librarian/Admin | Unique accession and shelf; 201 |
| DELETE | /api/books/{id}/copies/{copyId} | Librarian/Admin | 204 only without history |
| GET | /api/books/external?query=... | Librarian/Admin | Real Open Library search; 200 or controlled 503 |
| POST | /api/books/import | Librarian/Admin | query/workKey/category → provider-verified title; 201 or duplicate 409 |
| GET | /api/loans | Signed-in | 20 per page; Student's own only; status including Overdue filter |
| GET | /api/loans/{id} | Signed-in | Own-only Student lookup; cross-student 404 |
| POST | /api/loans | Student | bookId → reserve actual copy; 201 or 409 |
| POST | /api/loans/{id}/actions | Staff / owning Student | action/version/note → 200; Student may only cancel |
| GET | /api/loans/summary | Signed-in | Counts; borrowing counts scoped to Student's account |
| GET | /api/users | Admin | Paginated safe account list; search supported |
| PUT | /api/users/{id} | Admin | Name/role/active changes invalidate tokens; cannot edit own access |

Loan action values: approve, reject, checkout, return, cancel. Reject requires a nonblank reason. State transitions and version are checked server-side. Account role changes/deactivation are blocked while Student has active requests/loans. Role changes must be intentional Admin actions; account deletion is excluded to preserve history.

Standard validation errors use application/problem+json with title, status, errors and trace identifier. Domain errors use title/status/detail/traceId. 401 = sign-in needed; 403 = role disallowed; 404 = missing or hidden resource; 409 = conflict/stale state; 429 = auth throttle; 503 = provider unavailable; 500 = safe generic unexpected error. Passwords, database diagnostics, provider exception bodies and stack traces are not sent in controlled errors.

Login/registration share a 15-attempt/minute per-direct-IP in-process throttle. Behind proxies this is intentionally conservative; shared cache/trusted-client-IP configuration is future deployment work. Tokens last 30 minutes, are validated against current account role/active/version on every request and are not renewed automatically. A fresh page requires sign-in. No email verification, reset-password or institutional identity proof is included; this is a synthetic-data classroom foundation.
