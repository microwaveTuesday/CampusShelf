# Team collaboration

The foundation was generated with Codex assistance. Do not represent its initial creation as independent work by four or five students. Record actual contributions and disclose assistance under instructor policy.

1. Complete the member/responsibility table in docs/PROPOSAL-AND-REQUIREMENTS.md.
2. Create a shared GitHub repository owned by the team and invite actual members.
3. Work in short feature branches with descriptive commits explaining why behavior changed.
4. Open pull requests with the change, reproduction steps, tests run and limitations. Ask another member to review the relevant behavior and code.
5. Keep migrations and API/TypeScript contracts synchronized. Never replace PostgreSQL with mock data for the assessment.
6. Run the integration suite, lint/build and relevant browser story before merging.
7. Document problems found, failed checks and fixes honestly. Commit count alone does not measure contribution.

Never commit `.runtime/`, real student data, passwords, JWT keys, access tokens, database dumps or logs. Use synthetic data and the generated ignored local credentials. Do not share account sessions between students during normal operation. For a demo, use separate browser tabs/contexts for different roles.

The oral defense should trace one component the member actually worked on from UI → Axios → controller → service/EF Core → PostgreSQL → response. Be able to explain a negative test and a design limitation.
