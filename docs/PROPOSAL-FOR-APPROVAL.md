# Project proposal for instructor approval

## CampusShelf — Campus Library Borrowing System

**Course:** Integrative Programming 1, Midterm Project

**Team members:** Eugene Ricafort; Arjei Lacayanga; John Lei Madrona; John Gilbert Sevilla.

**Status:** For instructor review. The library topic and scope have not been approved yet. No submission deadline has been provided to the team. An AI-assisted working foundation exists; this document does not claim prior approval or completed individual contributions.

## Problem statement

A small campus library needs a clear record of which physical books are available, which students have requested them and when borrowed copies are due. Paper logs and separate spreadsheets can make availability and borrowing status difficult to reconcile. CampusShelf proposes a shared catalog and controlled request, checkout and return process.

The problem is a proposed scenario, not a claim that the team has conducted stakeholder interviews or obtained permission to use a real institution's records. The midterm demonstration will use synthetic accounts and borrowing data.

## Users and scope

- **Students:** browse available titles, request a copy, view their own borrowing history and cancel requests before checkout.
- **Librarians:** maintain the catalog/copies, review requests, verify physical checkout and record returns.
- **Administrators:** manage member roles/access and remove unused titles in addition to librarian functions.

The midterm covers one campus and four related entities: Account, Book, BookCopy and Loan. It excludes fines/payment, ebooks, barcode hardware, institutional SSO, automatic email, password recovery and public production deployment.

## Functional requirements

1. Register Student accounts and authenticate all roles using established password hashing and JWT access tokens.
2. Search and filter a persistent book catalog.
3. Allow authorized staff to create, read, update and delete unused catalog records and copies, while protecting borrowing history.
4. Reserve an available physical copy for an eligible Student without allocating it to two active borrowers.
5. Allow staff to approve/reject requests, check out approved copies for fourteen days and record returns.
6. Limit each Student to three active requests/loans, block duplicate active borrowing of a title and restrict new borrowing while overdue.
7. Enforce staff permissions and Student ownership rules on the server.
8. Search real Open Library metadata and import a selected title, retaining its source reference in the local database.
9. Validate forms and direct API requests; return controlled errors and preserve core operations when Open Library is unavailable.

## Non-functional requirements

1. **Security:** hash passwords, enforce roles/ownership independently of the interface and keep runtime secrets outside source control.
2. **Integrity:** use PostgreSQL constraints and transactional circulation logic so simultaneous requests cannot reserve the same physical copy.
3. **Reliability:** bound the external provider request timeout to six seconds and retain working manual catalog/borrowing operations during provider failure.
4. **Maintainability:** separate React pages, HTTP controllers, circulation/authentication services, provider access and EF Core persistence.
5. **Reproducibility:** supply migrations, synthetic seed data, setup instructions, Swagger and executable tests.

## Required technology stack

**React + TypeScript + Axios → ASP.NET Core Web API → Entity Framework Core → PostgreSQL.** No core technology substitution is proposed.

## Complete core workflow

A Student signs in and requests a title through React. Axios sends an authenticated JSON request to ASP.NET Core. The API validates the request and role; the circulation service checks the Student's eligibility and reserves an available copy in a PostgreSQL transaction through EF Core. React displays the saved request. A Librarian approves it, verifies physical pickup and checks it out. When the book is returned, the Librarian records the return and the copy becomes available again.

Architecture:

```text
React / TypeScript
       | Axios + JSON + JWT
ASP.NET Core controllers
       | authentication / circulation / catalog
EF Core → PostgreSQL

Staff lookup → OpenLibraryClient → official Open Library Search API
```

Relationships: Account 1→many Loans; Book 1→many BookCopies; BookCopy 1→many historical Loans. A Loan also references its latest handling account. See [the architecture, use-case, ERD and sequence diagrams](ARCHITECTURE.md).

## Authentication and authorization

Public registration creates only Student accounts. An operator provisions initial demonstration staff privately. The backend uses ASP.NET Core Identity PasswordHasher, validates bearer tokens against current account access and roles, and checks Student ownership of every loan lookup/action. Only staff may approve, check out or record returns; only Admins manage roles. Logout and access changes revoke existing tokens.

## External API and failure behavior

The official [Open Library Search API](https://openlibrary.org/dev/docs/api/search) supplies titles, authors, publication years and work identifiers for catalog entry. Imported data is stored in PostgreSQL; local copies and loans remain the library's responsibility. A work record does not certify a physical edition, so staff review the metadata.

The backend caches lookups, limits new provider requests and handles timeout, HTTP failure and malformed responses with a controlled unavailable-service message. Existing catalog/borrowing/returns continue; staff may enter a book manually. The demonstration will distinguish a real live lookup from controlled failure fixtures used in tests.

## Proposed collaboration

| Member | Proposed review and implementation area |
|---|---|
| Eugene Ricafort | React/TypeScript/Axios and integration coordination |
| Arjei Lacayanga | API authentication, authorization and account access |
| John Lei Madrona | Database design, EF migrations and circulation rules |
| John Gilbert Sevilla | External integration, verification and documentation |

These assignments require team confirmation and do not assert completed contributions. The shared repository is [microwaveTuesday/CampusShelf](https://github.com/microwaveTuesday/CampusShelf). The team will use feature branches and reviewed pull requests and record each member's actual changes, verification and explanations. Collaborator access and individual work evidence still need to be established.

## Final-project extensions

After the midterm, proposed extensions include validated uploads, borrowing/utilization reports, improved audit history, measured performance improvements, expanded tests, a formal security review and an approved HTTPS deployment/backup process. Extensions will preserve the midterm codebase and required stack.

## AI assistance and approval request

The initial working foundation, documentation and tests were created with OpenAI Codex assistance. Team members remain responsible for reviewing, understanding, verifying and disclosing assistance under the instructor's policy. Local technical tests do not establish team participation or instructor approval.

**Requested instructor decision:** approve this topic and scope, approve with specified conditions, or request revisions. The team will record the actual decision and adapt the implementation before presenting it as the approved project.
