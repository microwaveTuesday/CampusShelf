# CampusShelf — Campus Library Borrowing System

Proposal draft for instructor review. Approval has not been obtained by this software.

## Team and approval status

- Eugene Ricafort
- Arjei Lacayanga
- John Lei Madrona
- John Gilbert Sevilla

Instructor approval: pending; the team reports the topic has not yet been approved. Submission deadline: none provided. Shared GitHub repository: [microwaveTuesday/CampusShelf](https://github.com/microwaveTuesday/CampusShelf). A working AI-assisted foundation already exists; do not represent this proposal as having been approved before that work. Use [the concise approval proposal](PROPOSAL-FOR-APPROVAL.md) for the instructor's review.

## Problem and users

A small campus library needs to identify available physical book copies, track student requests and record which copy is checked out to whom. A spreadsheet or paper log makes overlapping requests, missed returns and unclear availability harder to manage. CampusShelf provides one shared catalog and a controlled borrowing workflow.

Students discover titles and manage their own requests. Librarians maintain the catalog, approve/reject requests, verify physical checkout and record returns. Administrators also manage account roles/access and delete unused titles. The project uses synthetic identities and borrowing data during development.

## Midterm scope

One campus, three roles, four related entities: Account, Book, BookCopy and Loan. A title describes a bibliographic work; an accession number identifies an actual physical copy. Open Library assists a librarian with title discovery and metadata entry; it is not the source of truth for local stock or loans.

Excluded: fines/payment, ebooks, SSO, barcode hardware, automatic email, inter-campus transfers, automatic due-date extensions, lost-book assessment and a public production deployment. No claim of institutional approval or real student usage is made.

## Functional requirements and evidence

| ID | Requirement | Implementation / acceptance evidence |
|---|---|---|
| FR-01 | Students register and all roles sign in using hashed passwords and a token. | AuthController, AuthService; HTTP security tests |
| FR-02 | Readers search and filter the persistent catalog. | BooksController, Catalog page; PostgreSQL query |
| FR-03 | Librarians/Admins create, view, update and delete unused copies; maintain title metadata. | BooksController; CRUD and conflict tests |
| FR-04 | An active Student requests an available copy of a title. | CirculationService; actual copy reservation |
| FR-05 | The system prevents two active loans on the same copy, duplicate active titles per reader and more than three active requests/loans. | DB partial unique index + transactional rules + competing-request test |
| FR-06 | Library staff approve/reject pending requests, check out approved copies for 14 days, and record physical returns. | Loan state machine and browser/API workflow |
| FR-07 | Students see/cancel only their own pending or approved requests. | Actor-filtered queries and server-side ownership checks |
| FR-08 | Overdue loans appear clearly and prevent new borrowing. | Derived overdue status, service validation and PostgreSQL test |
| FR-09 | Staff search Open Library and import selected work metadata. | Real HTTP client, cached search and server-verified selection |
| FR-10 | Core catalog/circulation continue during external provider errors; manual catalog entry remains available. | 503 Problem Details, independent manual workflow and timeout tests |
| FR-11 | Admins change other members' roles and active status. Existing sessions are revoked. | UsersController + per-request token-version check |
| FR-12 | Historical borrowing records remain traceable. | Restricted foreign keys; used titles/copies cannot be deleted; archive instead |

## Non-functional requirements

| ID | Requirement | Verification |
|---|---|---|
| NFR-01 Security | Server independently enforces role and ownership rules; no plaintext passwords or committed runtime secrets. | ASP.NET password hasher/JWT, negative HTTP tests, ignore rules |
| NFR-02 Integrity | Competing reservations cannot claim the same copy; writes preserve foreign keys and valid states. | PostgreSQL transaction/advisory lock, constraints, concurrency test |
| NFR-03 Reliability | Provider timeout is bounded to six seconds; failures do not disable existing catalog/loans. | HttpClient timeout, 503 handling and failure regression |
| NFR-04 Usability | Catalog, requests and current loans are accessible from the main navigation; forms show actionable errors and work at mobile widths. | Responsive React components, native form constraints, browser walkthrough |
| NFR-05 Maintainability | HTTP, business rules, persistence and provider access have separate responsibilities. | Controllers → services → EF DbContext / provider client |
| NFR-06 Reproducibility | Another developer can start PostgreSQL, apply committed migrations, seed synthetic records and run checks. | README, scripts/dev.py, committed migration and CI workflow |

## Core journey

Student signs in → Axios sends authenticated request → ASP.NET validates token and role → CirculationService reserves a free copy inside a PostgreSQL transaction → EF Core persists Loan → React displays Requested → Librarian approves → verifies pickup and checks out → Student sees due date → Librarian records return → copy becomes available again.

## Authentication and authorization

Public registration always creates Student accounts, ignoring any supplied role. A private seed command provisions the initial Admin/Librarian demonstration accounts. JWT access tokens last 30 minutes and live only in browser memory. Refreshing requires sign-in; this is intentional. Logout revokes all of that account's tokens. Role/access changes invalidate prior tokens. Password hashing uses Microsoft's established ASP.NET Core Identity PasswordHasher.

## External dependency

Open Library Search API: https://openlibrary.org/dev/docs/api/search . Backend sends only the entered book query, requests eight results and caches results for ten minutes. Requests are serialized to at most one new lookup per 1.1 seconds in this single-process classroom build. Imported work key/title/author/year are checked against the provider search result, rather than trusting arbitrary submitted metadata. Imported metadata is stored locally in PostgreSQL with its source work key. A work's first publication year may differ from the physical edition; library staff review their copy. Do not bulk harvest the provider.

## Team and development plan — proposed responsibilities

The roster above was supplied by the team. The responsibilities below are suggestions for discussion, not a record of completed work. Confirm them together and record actual contributions in [the team work log](TEAM-WORK-LOG.md).

| Responsibility | Actual member | Branch / PR evidence | Oral defense |
|---|---|---|---|
| React/TypeScript/Axios and integration coordination | Eugene Ricafort — proposed | Not yet recorded | Trace a browser request through the system |
| ASP.NET authentication, authorization and accounts | Arjei Lacayanga — proposed | Not yet recorded | Demonstrate 401/403 and token revocation |
| EF Core/PostgreSQL and circulation rules | John Lei Madrona — proposed | Not yet recorded | Explain relationships, transactions and last-copy test |
| Open Library, verification and submission documentation | John Gilbert Sevilla — proposed | Not yet recorded | Demonstrate live lookup, failure behavior and test evidence |

All four members review the requirements, diagrams and demo. Each proposed owner should review a different member's work. Change this allocation if your skills or preferences suggest a better fit.

Recommended sequence: approve proposal → agree schema/contracts → implement a vertical borrowing slice → integrate provider → test negative paths → team review → rehearse defense. Use small meaningful feature branches and reviewed PRs; each member explains actual code they changed or verified. The initial generated implementation is not evidence of four people's contributions.

## AI assistance disclosure

This foundation was created with OpenAI Codex assistance, including code, styling, documentation and test authoring. Team members must review and understand it, record their own changes, verify the evidence on their machines and follow the instructor's specific disclosure policy. This statement does not replace required institutional forms.

## Midterm-to-final continuity

- Week 10: controlled cover/document uploads with type/size validation.
- Week 11: borrowing trends and collection-utilization reporting.
- Week 12: finer-grained locking and query tuning after measured load testing.
- Week 13: broaden integration/browser tests and document defect investigations.
- Week 14: formal security review, access review and privacy retention decisions.
- Week 15: HTTPS hosting, backups and deployed CI/CD after approval.
- Weeks 16–18: integration documentation, retrospective and individual defense.

The exact required stack is implemented: React + TypeScript + Axios, ASP.NET Core Web API, EF Core and PostgreSQL. No core technology substitution is proposed.
