# CampusShelf frontend

React 19, TypeScript, Axios and Vite. Main setup and accounts are documented in [the project README](../README.md).

```text
npm ci
npm run dev
```

Open http://127.0.0.1:5178 . API and Swagger requests proxy to http://127.0.0.1:5088 . Start PostgreSQL and the backend first, normally using `python scripts/dev.py start` from the repository root.

`src/pages/` contains role-aware overview, catalog, circulation, import and account screens. `src/components/` contains shared accessible controls and book dialogs. `src/api.ts` configures Axios and in-memory bearer authentication. `src/types.ts` documents the response shapes. No business records are hardcoded in the frontend; all catalog, availability, borrowing and account data comes from the API.

Run `npm run lint`, `npm run format:check` and `npm run build` before submitting. Production output is `dist/`; it needs HTTPS hosting with a same-origin API reverse proxy. `vite preview` alone is not an application deployment. Fonts use online Google Fonts with local fallbacks; decorative book graphics are CSS. No third-party cover image needs to load for core use.

Page reload intentionally clears the memory-only token; PostgreSQL records remain. There is no browser-local mock database or saved JWT. UI restrictions are usability features; authorization is enforced separately on the server.
