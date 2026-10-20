# CampusShelf submission preparation

## Current status

| Item | Status |
|---|---|
| Team | Eugene Ricafort, Arjei Lacayanga, John Lei Madrona, John Gilbert Sevilla |
| Instructor approval | Pending — team confirms not approved yet |
| Deadline | None provided |
| Shared GitHub repository | [microwaveTuesday/CampusShelf](https://github.com/microwaveTuesday/CampusShelf); initial publication in progress |
| Technical foundation | Built; prior local verification is in VERIFICATION.md |
| Individual work evidence | Not supplied yet; proposed areas are not completed contributions |
| Second-machine setup and team rehearsal | Not recorded yet |

## Step 1 — obtain the topic and scope decision

Give the instructor [the concise proposal](PROPOSAL-FOR-APPROVAL.md). It includes the actual roster, required stack, requirements, roles, workflow, related entities, provider/failure plan, suggested responsibilities and final extensions. It discloses the existing AI-assisted foundation. Keep the response and date; do not change approval to complete until an actual decision arrives. Apply requested revisions before treating the software as your approved submission.

## Step 2 — confirm responsibilities and review the foundation

Discuss the suggested assignments in [the work log](TEAM-WORK-LOG.md). Each member should run the app, study their proposed area, identify a concrete improvement or verification task and explain its effect. Record the work when it actually happens. Review the other members' changes. Ask for a walkthrough of any file you cannot explain.

The generated baseline is openly attributed to AI assistance; it is not four independent contributions. Genuine fixes, requirements analysis, tests, documentation corrections and code reviews can all be recorded accurately, subject to the instructor's policy.

## Step 3 — publish and collaborate in the shared GitHub repository

The team has created [microwaveTuesday/CampusShelf](https://github.com/microwaveTuesday/CampusShelf). Push the existing local history and invite the other members. Keep the existing provenance; do not rewrite commit authors to invent member activity.

From the project's VS Code terminal, first inspect:

```powershell
git status
git log --oneline -5
git remote -v
```

Use `https://github.com/microwaveTuesday/CampusShelf.git` as the origin URL and push the existing `main` branch. Confirm repository visibility according to the instructor's instructions. Runtime credentials and PostgreSQL files are ignored and must remain unshared.

The included workflow runs on GitHub after publication. Inspect its actual result and resolve failures; a workflow file alone is not a successful run. Keep useful PR, review and Actions links in the work log.

## Step 4 — verify a second computer

Prefer another team member's Windows computer for the supplied launcher:

1. Install .NET 10 SDK, Node 24, Python 3.11+ and PostgreSQL 17 tools if missing.
2. Clone the shared repository into a writable directory.
3. Open the whole folder in VS Code. Run `python scripts/dev.py start`.
4. If PostgreSQL binaries are outside the default path, set `PG_BIN` to their bin directory. Ensure ports 5088, 5178 and 55439 are available.
5. Read the credentials generated on **that computer** in `.runtime/DEMO-ACCOUNTS.md`. Do not copy the original machine's runtime directory.
6. Test Student request → Librarian approve → checkout → return in separate tabs. Verify catalog/copy CRUD, live provider lookup/import and persisted data after API restart.
7. Run `python scripts/integration_test.py`. From `frontend`, run `npm run lint`, `npm run format:check` and `npm run build`.
8. Record machine/versions, date, exact result, failures/fixes and reviewer in the work log. Do not attach passwords, tokens or runtime database files.

For an existing PostgreSQL server or Linux, follow the separate environment-based instructions in the root README. The Windows launcher depends on permission to start a private local PostgreSQL process; institutional lab policies may require an approved existing server instead.

## Step 5 — rehearse and defend

Use [the timed demo](MIDTERM-CHECKLIST.md) and [the individual defense guide](DEFENSE-GUIDE.md). Practice once without reading prepared answers. Keep the demo's catalog entry and student data synthetic. Before evaluation, confirm both servers, PostgreSQL and live Open Library connectivity. Know how to explain the controlled failure test without claiming a fixture is the real provider.

## Submission gate

- [ ] Actual approval/conditions recorded and addressed.
- [ ] All four members confirm their responsibilities and explain their work.
- [ ] Shared repository URL and substantive contribution/review links recorded.
- [ ] Actual hosted CI outcome recorded; failures resolved or explicitly documented.
- [ ] Another machine runs the submitted instructions successfully.
- [ ] Proposal, requirements and diagrams match the final implementation.
- [ ] AI disclosure follows the instructor's actual policy.
- [ ] Demo and individual defense rehearsed.
- [ ] Submitted branch/commit and required submission format confirmed.

Do not mark these items complete based only on the earlier local technical tests. No deadline or institution-specific submission format has been assumed.
