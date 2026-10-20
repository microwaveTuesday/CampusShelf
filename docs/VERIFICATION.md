# Executed verification — 20 October 2026

This evidence is from the local Windows development computer, using .NET SDK 10.0.401, Node 24.21.0, Python 3.13 and an isolated PostgreSQL 17.11 cluster. No real student data or shared institutional credentials were used. These results are not a course grade or a production security certification.

## Automated checks

| Check | Actual result |
|---|---|
| ASP.NET backend build | Passed; zero errors and zero warnings |
| EF Core committed migration | Applied successfully to real PostgreSQL |
| Migration drift check | No pending model changes |
| Real HTTP/PostgreSQL integration suite | 12 tests passed; zero failures |
| Frontend TypeScript and production build | Passed |
| Frontend lint | Passed with no warnings after cleanup |
| Frontend formatting | Passed |
| npm audit | Zero known vulnerabilities in the checked dependency graph |
| .NET transitive package vulnerability listing | No known vulnerable packages returned by the configured sources |
| OpenAPI export | 18 paths / 22 operations; bearer scheme and public-operation overrides verified |

The integration tests use a newly created disposable PostgreSQL database and a separate API process, with the configured ASP.NET password hasher. Tests verify:

1. Anonymous 401, wrong-role 403 and public registration cannot elevate privileges.
2. Server rejection of invalid fields, publication years, book IDs and page values.
3. Actual request → approval → checkout → return; duplicate/stale/ownership/history guards.
4. Two simultaneous readers competing for one physical copy: exactly one 201 and one 409.
5. Three-active-loan limit; overdue detection and borrowing restriction using actual database dates.
6. Persistent title/copy CRUD, archive behavior and stale update protection.
7. Provider success/cache/import/duplicate conflict; real HTTP failure, malformed payload and timeout all produce controlled 503 while the core catalog stays readable. This provider is a fixture, clearly separate from live-provider evidence below.
8. A new API process reads the unchanged persisted loan and reserved copy after restarting.
9. Role changes, deactivation and logout revoke previously valid tokens.
10. Established password hashes, applied migration and a direct database rejection of duplicate active-copy allocation.
11. Rejection requires a reason; an owning Student may cancel a request.
12. Repeated invalid login attempts eventually receive 429 Problem Details.

Earlier eleven-test runs passed before the explicit throttle regression was added; these are not added to the final count. The final suite is twelve distinct tests with multiple HTTP/database assertions each.

## Live provider evidence

The running app's official Open Library client searched `the hobbit`, returned eight live results and showed the first result as The Hobbit. Through the browser interface the librarian selected `/works/OL27482W`, imported the actual returned title/author/year into PostgreSQL and saw the success message and local catalog entry. This is a genuine external dependency, not the controlled provider fixture used in automated tests. Live network availability remains outside the app's control.

## Browser walkthrough

Executed in the in-app browser with synthetic accounts:

- Student login and live database-backed dashboard/catalog.
- Open Clean Code, request a physical copy, observe success and one fewer available copy.
- Student's My borrowing displays the saved Requested row.
- Separate Librarian session reads the request, approves it and sees Ready.
- Checkout persists CheckedOut with a November 3, 2026 due date (14 days after October 20).
- Record return persists Returned; the catalog shows both copies available again.
- The approved request survived an intentional backend rebuild/restart. A checkout attempt during downtime showed a controlled connection error; after the servers restarted and the browser signed in again, the same loan was checked out and returned successfully. No failed attempt was counted as a successful checkout.
- Open Library search/results/import and the imported local title were checked in the UI.
- The librarian added accession CS-009-01 at shelf LIT-09 to the imported title and observed its Available state. The demo database now has nine titles and seventeen physical copies; fresh seeding still creates eight titles and sixteen copies.
- Dialogs use native modal focus trapping and close buttons; keyboard/reduced-motion/responsive styles are implemented. No complete mobile-device or WCAG audit was performed, and no automated accessibility certification is claimed.

Screenshots under `docs/screenshots/` contain synthetic names and ordinary book metadata only. No passwords or access tokens are included.

## Reproduction

Run `python scripts/dev.py start`, then follow the README verification commands. The automated suite creates and drops only its own newly named `campusshelf_test_...` database. Keep normal demo data separate. The normal app's provider base URL is official Open Library; a development-only override allows the test HTTP provider. Production rejects nonofficial provider URLs.

The project is published at [microwaveTuesday/CampusShelf](https://github.com/microwaveTuesday/CampusShelf). On 20 October 2026, [Actions run 39412425563](https://github.com/microwaveTuesday/CampusShelf/actions/runs/39412425563) completed both backend and frontend jobs successfully for revision `d088dd90716196433aac1f58781928fcf5736825`. The backend job built the project, checked migration drift, ran the real PostgreSQL integration suite and listed dependency vulnerabilities; the frontend job installed locked dependencies and passed lint, TypeScript/production build and npm audit. Later documentation-only changes recording this result do not alter runtime code. Actual teammate reviews, contributions and oral-defense outcomes remain team responsibilities.

## Remaining limits

This version has no automatic reservation expiry, email verification, password recovery, fines, uploads, barcode hardware or production deployment. A staff member must resolve abandoned requests. Metadata represents works, not verified physical editions. The most recent loan handler is stored, not a full immutable activity audit. Public registration does not prove enrollment. Login/provider coordination is process-local, and critical library writes use a deliberately broad database lock for simple correctness. Load testing, distributed throttling, hosted HTTPS, backup/restore operations, institutional retention policies and independent penetration testing are not verified here. Use synthetic data until the institution approves a real deployment.
