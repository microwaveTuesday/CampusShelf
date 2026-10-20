# Architecture, use cases and database design

## Layering

```mermaid
flowchart LR
  R[React + TypeScript] -->|Axios / JWT / JSON| C[ASP.NET Core controllers]
  C --> A[AuthService]
  C --> S[CirculationService]
  C --> O[OpenLibraryClient]
  S --> E[EF Core / LibraryDbContext]
  A --> E
  C -->|Catalog queries and CRUD| E
  E --> P[(PostgreSQL)]
  O -->|HTTPS / timeout / cache| L[Open Library Search API]
```

Controllers own HTTP contracts, status codes and role annotations. AuthService handles registration, password verification and token creation. CirculationService owns borrowing limits, ownership checks and legal transitions. EF Core owns relational persistence. OpenLibraryClient owns third-party transport, response normalization, caching and unavailable-service translation. Simple catalog CRUD uses DbContext in its controller; an additional repository abstraction is intentionally omitted for this small application.

## Use-case diagram

```mermaid
flowchart LR
  Student[Student] --> Browse([Browse and search books])
  Student --> Request([Request available copy])
  Student --> Own([View own loans and cancel requests])
  Student --> Signin([Sign in / sign out])
  Librarian[Librarian] --> Signin
  Librarian --> Catalog([Maintain titles and copies])
  Librarian --> Decisions([Approve or reject request])
  Librarian --> Checkout([Check out and record return])
  Librarian --> Import([Lookup and import book metadata])
  Provider[Open Library] --- Import
  Admin[Administrator] --> Catalog
  Admin --> Decisions
  Admin --> Checkout
  Admin --> Import
  Admin --> Access([Manage member roles and access])
  Admin --> Delete([Delete unused titles])
```

## ERD

```mermaid
erDiagram
  APP_USER ||--o{ LOAN : borrows
  APP_USER o|--o{ LOAN : handles
  BOOK ||--o{ BOOK_COPY : has
  BOOK_COPY ||--o{ LOAN : history
  APP_USER {
    int Id PK
    string Email UK
    string Name
    string PasswordHash
    string Role
    bool IsActive
    int TokenVersion
  }
  BOOK {
    int Id PK
    string Title
    string Author
    string Category
    int PublishYear
    string OpenLibraryKey UK
    bool IsActive
    int Version
  }
  BOOK_COPY {
    int Id PK
    int BookId FK
    string AccessionNumber UK
    string Shelf
  }
  LOAN {
    int Id PK
    int BookCopyId FK
    int BorrowerId FK
    int HandledById FK
    string Status
    datetime RequestedAt
    datetime CheckedOutAt
    datetime DueAt
    datetime ReturnedAt
    int Version
  }
```

Books and physical copies are separate so a title's metadata is not repeated for each copy. Each Loan references one actual copy and a borrower. HandledBy points to the most recent actor; this field is not a full immutable audit history. Multiple authors are a display string, an explicit midterm simplification; normalized author/edition entities are a possible later extension. Category is a bounded string, not a separate lookup table. Availability and overdue status are derived from persisted loan state rather than stored as competing truth.

PostgreSQL enforces foreign keys, unique accession/email/provider identifiers, role/status/year/date checks and one active reservation per physical copy via a partial unique index. Deleting loan history is deliberately unsupported. Delete unused copies/titles; archive used titles.

## Borrowing sequence

```mermaid
sequenceDiagram
  actor Student
  participant React
  participant API as ASP.NET API
  participant Service as CirculationService
  participant DB as PostgreSQL / EF Core
  Student->>React: Request title
  React->>API: POST /api/loans + Bearer JWT
  API->>API: Validate token, Student role and request
  API->>Service: RequestAsync(bookId, actorId)
  Service->>DB: BEGIN + advisory transaction lock
  Service->>DB: Check active account, overdue, limit and duplicate title
  Service->>DB: Find available physical copy
  alt No copy / ineligible
    Service-->>API: Conflict
    API-->>React: 409 Problem Details
  else Eligible
    Service->>DB: INSERT Loan(Requested) + COMMIT
    Service-->>API: Saved loan
    API-->>React: 201 Created + Location + JSON
    React-->>Student: Request sent
  end
```

## Loan lifecycle

```mermaid
stateDiagram-v2
  [*] --> Requested: Student reserves available copy
  Requested --> Ready: Librarian approves
  Requested --> Rejected: Librarian gives reason
  Requested --> Cancelled: Borrower or staff cancels
  Ready --> Cancelled: Borrower or staff cancels
  Ready --> CheckedOut: Staff verifies pickup
  CheckedOut --> Returned: Staff verifies physical return
  Returned --> [*]
  Rejected --> [*]
  Cancelled --> [*]
```

Requested and Ready reserve stock immediately. There is no automatic reservation expiration in this version; staff must cancel abandoned requests. Checkout sets a 14-day UTC due timestamp. UI formats dates in Asia/Manila. Student identity always comes from the token, never a borrower ID sent in the request. Ownership filtering returns 404 for another student's loan. Tokens are never stored in localStorage/sessionStorage.

## Concurrency and deployment limits

Circulation, copy mutations, account access changes and title edits acquire the same PostgreSQL transaction-scoped advisory lock. This intentionally serializes a small campus's critical mutations, making the three-loan limit and last-copy allocation deterministic across API processes. The partial unique index remains the final per-copy safety net. Book/loan Version fields reject stale edits/transitions with 409. Reads remain concurrent. Provider rate limiting/cache and login rate limits are process-local; a public multi-server deployment requires shared controls. No load/soak or production certification is claimed.
