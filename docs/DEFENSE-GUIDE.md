# CampusShelf defense preparation

Use this guide to understand the implementation and practice in your own words. Link answers to code and demonstrated behavior. If you have not personally verified a result, say who recorded it and what you will check.

## A short opening

CampusShelf organizes a small campus library's catalog, physical book copies and borrowing. Students request books; librarians approve requests, verify physical checkout and record returns; administrators manage account access. Our technical path is React and TypeScript, Axios, ASP.NET Core Web API, EF Core and PostgreSQL. Open Library supplies book metadata, while our database owns local copies and loans. Development and demonstrations use synthetic accounts and borrowing data.

Describe approval accurately: until the instructor responds, this is the team's proposed topic. Do not claim stakeholder interviews or institutional deployment that have not happened.

## Explain the complete request

1. A Student presses Request to borrow in `frontend/src/components/BookDialog.tsx`.
2. Axios in `frontend/src/api.ts` sends JSON and a bearer token to `POST /api/loans`.
3. Authentication in `Program.cs` validates the token, then checks current account access, role and token version in PostgreSQL.
4. `Controllers/LoansController.cs` restricts creation to Student and obtains the borrower ID from the authenticated principal.
5. `Services/CirculationService.cs` starts a transaction, acquires the database lock, checks eligibility and selects a free physical copy.
6. EF Core writes the Loan to PostgreSQL. The database separately enforces foreign keys and its unique active-copy index.
7. The API returns 201 with the saved loan. The interface displays success and reloads current availability.

Practice showing each step in VS Code and the browser's Network panel without revealing a real access token in screenshots.

## Likely questions and answer points

### Why separate Book from BookCopy?

Book stores shared title/author metadata. BookCopy identifies a physical item through its accession number and shelf. Multiple copies can share one title. A Loan references a copy, so the system knows which actual item is reserved or checked out. Show `Domain/Entities.cs` and the foreign keys in `Data/LibraryDbContext.cs`.

### Where is persistence implemented?

ASP.NET uses EF Core's `LibraryDbContext` with the Npgsql PostgreSQL provider. The committed initial migration creates tables, relationships, checks and indexes. `--migrate` applies migrations; `--seed` also adds synthetic starter records. Restarting the API does not remove database rows. Explain the difference between a fresh seed and a fake in-memory application store.

### How are passwords protected?

`AuthService` uses Microsoft's established ASP.NET Core Identity PasswordHasher. It stores a hash rather than the entered password and verifies the submitted value through the hasher. Runtime credentials are generated privately and ignored by Git. The team did not invent its own password hashing algorithm.

### Authentication versus authorization?

Authentication establishes who signed in. Authorization decides what that identity may do. A valid Student token still cannot create a book or approve a loan. Role annotations protect staff actions; additional service/query checks protect ownership. Hiding staff buttons is only a usability feature.

### What do 401, 403, 404, 400 and 409 mean here?

- 401: missing, expired or revoked authentication.
- 403: signed-in identity lacks the required permission.
- 404: missing resource, or another Student's loan intentionally hidden from the requester.
- 400: invalid request fields or business input such as an empty rejection reason.
- 409: current state conflicts with the operation, including stale versions or unavailable copies.

Demonstrate actual responses rather than repeating only the definitions.

### Why cannot a Student request on behalf of someone else?

The borrow request supplies the book ID, not the authoritative borrower ID. The server derives the borrower from the token. Loan queries and transitions also check ownership. Changing a URL to another person's loan does not grant access.

### What prevents two people from borrowing the last copy?

The service checks eligibility and allocation inside a PostgreSQL transaction with a shared advisory transaction lock. That serializes critical library mutations in this small system. A partial unique index on BookCopyId for Requested/Ready/CheckedOut loans is the final database guard. A real concurrent test returns one 201 and one 409 for a single copy. Explain the scaling tradeoff: the broad lock favors simplicity over high write throughput.

### Why do Requested and Ready consume availability?

They reserve an actual physical copy before checkout. Otherwise several approved readers could be promised the same item. There is no automatic expiration yet; staff or the borrower must cancel an abandoned request.

### How does the due date work?

Checkout records a UTC timestamp and sets the due time fourteen days later. A checked-out loan whose due time has passed is derived as overdue. The UI formats dates in Asia/Manila. Overdue borrowers cannot start another request or proceed with another checkout until the overdue book is returned.

### Why retain history instead of deleting loans?

Borrowing history identifies who held a physical copy and when it moved through the process. There is no loan-delete endpoint. Used titles/copies are protected against deletion; archive the title instead. This version records the latest handler, not a complete immutable audit history.

### What is a version conflict?

An edit or loan action includes the version originally read. If another action changes the record first, the server returns 409 instead of silently applying an action to stale state. The user must refresh and decide again. Show a stale-action assertion in the integration suite.

### What exactly is external here?

The backend performs a real HTTPS search against Open Library, reads book metadata and validates an imported selection against the returned results. The selected metadata and source work key are then stored locally. Open Library does not manage campus stock or loans, and a work's metadata may differ from the physical edition.

### What if Open Library fails?

The request has a six-second timeout. Transport errors, malformed responses and timeout are translated into 503 with an actionable message. Lookup is separate from local catalog and circulation, so those continue. Manual entry is available. Automated tests use a controlled HTTP provider for reproducible failure conditions; that fixture is not the live integration. Show both live lookup evidence and the named failure test.

### Where is the token stored and why does refresh sign out?

Only in browser memory, not localStorage or sessionStorage. A page reload loses that memory and requires sign-in. Database records remain. Tokens last thirty minutes; logout invalidates the account's existing tokens, and role/access changes do the same. No automatic refresh-token flow is implemented.

### What remains unfinished?

Institutional identity verification, password recovery, automatic reservation expiry, fines, barcode hardware, uploads, full audit history, public HTTPS hosting, operational backup/restore and load testing are outside this midterm foundation. The team also needs actual approval, shared collaboration evidence, second-machine setup and a live defense. Do not claim production readiness or a guaranteed grade.

### What did you personally do, and how was AI used?

Describe only your real review, modifications, tests, documentation and explanations, supported by the work log and GitHub links. The initial foundation was created with Codex assistance. Explain how you checked its behavior and what you changed. A suggested ownership row is not proof that you authored those files.

## Four-member practice rotation

Proposed sequence, subject to team confirmation:

1. Eugene: introduce the problem and show the Student UI/Axios request.
2. Arjei: explain authentication, roles, ownership and direct forbidden requests.
3. John Lei: show the ERD, EF migration, allocation rule and checkout/return transaction.
4. John Gilbert: show live Open Library, controlled failures, tests and remaining limitations.

Then swap one question per member so everyone can explain the whole workflow. If someone cannot explain a file, walk through it together before assigning them that part of the presentation.
