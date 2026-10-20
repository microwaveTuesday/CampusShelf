# Rubric evidence and demonstration

This is an evidence map, not a self-assigned grade. The original Integrative Programming 1 midterm brief remains the authority. All technical paths below use the exact required stack.

| Criterion | Weight | Implemented evidence | Team / live assessment still needed |
|---|---:|---|---|
| A: problem, requirements, design | 10 | Proposal, 12 functional and 6 non-functional requirements, scope and diagrams | Instructor approval and real team roster |
| B: architecture and organization | 10 | Controller/service/provider/data separation; typed modular React | Each member explains choices and tradeoffs |
| C: database and CRUD | 15 | PostgreSQL + EF Core migrations; four related entities; title/copy CRUD; persisted loans; constraints | Demonstrate same workflow on evaluation machine |
| D: authentication/authorization | 15 | Identity PasswordHasher, JWT, roles, token revocation and ownership filtering | Show anonymous 401, Student forbidden 403, cross-student 404 |
| E: REST/frontend | 15 | React/TypeScript/Axios; REST methods/statuses; Swagger with bearer scheme | Trace actual browser request and PostgreSQL row |
| F: external API | 10 | Real Open Library lookup/import; bounded failures, caching and manual fallback | Demonstrate live provider and unavailable-service behavior |
| G: validation/exceptions | 10 | Native browser constraints, independent DataAnnotations/service/DB checks; Problem Details | Bypass UI with invalid HTTP JSON and show rejection |
| H: Git collaboration | 5 | Contribution guide and runnable CI workflow | Actual shared repo, member branches/reviews and substantive contributions |
| I: documentation | 5 | README/setup, diagrams, endpoint guide, limitations and reproducible tests | Verify instructions from a second team machine |
| J: demo/defense | 5 | Script and evidence below | Live presentation and each individual's understanding |

## Suggested 12–16 minute demonstration

1. Explain the problem and boundaries. Show actual member roles and approved requirements.
2. Open the ERD and architecture. Explain title versus physical copy, the Loan foreign keys and why availability is derived.
3. Sign in as Student in one tab. Search a title, open copies and request borrowing. Show Requested and reduced availability.
4. In a separate tab sign in as Librarian. Approve the request; verify physical pickup and click Check out. Show the 14-day due date. As Student, revisit My borrowing to read the current status.
5. Record the physical return as Librarian. Show Returned and the copy available again. Explain that no API deletes a historical Loan.
6. Demonstrate title/copy create, read, edit and delete on a new unused record. Explain archive instead of deleting a title with borrowing history.
7. Open Discover & import. Search an actual title with Open Library, review the source link and import it. Add a local physical copy. Explain that the library owns local availability; Open Library supplies metadata only.
8. Show negative checks: anonymous GET /api/loans → 401, Student POST /api/books → 403, another Student's loan → 404, invalid publication year/blank title → 400. Use a disposable token in Swagger; never paste it into public documents.
9. Show provider-failure regression (HTTP error, malformed response, timeout → 503) and then a working core catalog/circulation call. The test provider is explicitly a fixture, not a substitute for the live lookup in step 7.
10. Show persisted records after `python scripts/dev.py restart-api`. This restarts only the API, preserving PostgreSQL. The automated suite also performs this check against an isolated database. Sign in again if needed.
11. Show real GitHub PRs/CI results and explain actual member contributions. Discuss the global mutation lock, no automatic reservation expiry, no password reset and planned final extensions.

## Defense questions

- What does Axios send, where is the JWT stored, and what checks happen on the server?
- Why does hiding a button not enforce authorization?
- Why is a book title different from a physical copy?
- What prevents two requests from taking the last copy?
- Why use both a PostgreSQL partial unique index and a service rule?
- Which status transitions are legal, and who is permitted to perform each?
- Why does a stale version return 409?
- What is actually obtained from Open Library, and how does the app behave when it fails?
- Where are EF migrations, and how do you apply them on another machine?
- Which code and tests did each member personally review/change?
