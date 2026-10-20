# Team responsibilities and evidence log

## Proposed ownership — confirm together

| Member | Suggested area | Starting files | Evidence to produce |
|---|---|---|---|
| Eugene Ricafort | Frontend and integration | frontend/src/api.ts, types.ts, pages/, components/ | Explain an Axios call; document a real UI improvement or defect verification |
| Arjei Lacayanga | Authentication and authorization | backend/CampusShelf.Api/Services/AuthService.cs, Controllers/AuthController.cs, Controllers/UsersController.cs, Program.cs | Explain hash/token/role checks; demonstrate 401/403 and revoked access |
| John Lei Madrona | Database and circulation | backend/CampusShelf.Api/Data/LibraryDbContext.cs, Domain/Entities.cs, Services/CirculationService.cs, Migrations/ | Explain relationships, a migration and competing-copy allocation |
| John Gilbert Sevilla | Provider/testing/documentation | backend/CampusShelf.Api/Services/OpenLibraryClient.cs, scripts/integration_test.py, docs/ | Explain real provider versus fixture; reproduce failure handling and report results |

These are proposed future responsibilities, not evidence that a member authored the existing files. Rotate areas if the team prefers. All four members should understand the main borrowing workflow.

## Actual contribution entries

Add a new row only after the work occurs. Describe what was reviewed, changed, tested or explained. Keep the original AI-assisted baseline attribution intact.

| Date | Member | Concrete task / finding | Files or requirements | Branch / commit / PR | Verification result | Reviewer |
|---|---|---|---|---|---|---|
| Not yet recorded | — | No individual evidence supplied yet | — | — | — | — |

Useful task types: trace an API request; reproduce and fix a real defect; clarify a requirement; strengthen a meaningful negative test; correct an inaccurate diagram; verify setup on another computer; review a teammate's change. Do not create meaningless edits, backdated logs or invented reviews to inflate activity.

## Instructor decision record

Current status: topic not approved yet.

| Actual response date | Decision | Conditions / requested revisions | Where recorded | Team action |
|---|---|---|---|---|
| Pending | Not received | Not known | — | Send proposal for review |

## Reproduction and rehearsal record

| Date | Machine / environment | Member | Scenario or checks | Actual result / failures | Follow-up |
|---|---|---|---|---|---|
| Not yet recorded | — | — | Second-machine setup | Not demonstrated yet | Follow SUBMISSION-PACK.md |
| Not yet recorded | — | All four | Timed demo and individual questions | Not demonstrated yet | Follow DEFENSE-GUIDE.md |

## GitHub evidence

Repository: [microwaveTuesday/CampusShelf](https://github.com/microwaveTuesday/CampusShelf). Hosted CI: backend and frontend passed for source revision `d088dd9` in [Actions run 39412425563](https://github.com/microwaveTuesday/CampusShelf/actions/runs/39412425563) on 20 October 2026. Member PR/review links: not supplied. Add real links once those actions occur. Existing local baseline commits were created by Codex; they are not evidence of four-person collaboration.
