# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **Front Range Pool Hub** — a React 18 + Vite 4 frontend monorepo for a pool/billiards league management platform. It contains multiple sub-applications under `apps/` (hub, ladder, singles-league, tournament-bracket, dues-tracker, cueless) with shared code in `shared/`.

### Running the dev server

```bash
npm run dev
```

Starts Vite on port 5173 with `host: true`. The app uses `HashRouter`, so all routes are hash-based (e.g. `/#/ladder`, `/#/league`).

### Building

```bash
npm run build
```

Output goes to `dist/`. Expect a chunk-size warning for the main JS bundle (>500 kB) — this is known and non-blocking.

### Linting / Testing

- **No ESLint** is configured in the project.
- **No automated test framework** is present (no test script, no Jest/Vitest/etc.).
- The `npm run build` (Vite production build) is the primary code-validation step.

### Key caveats

- **Backend is external.** The `atlasbackend` API (configured via `VITE_BACKEND_URL`, defaults to `http://localhost:8080`) is a separate repo deployed to Render. It is **not** included in this workspace. Most authenticated features (league, ladder management, payments) require it, but guest/public views work without it.
- **Supabase is cloud-hosted.** Auth and database use a hosted Supabase instance (`vzsbiixeonfmyvjqzvxc.supabase.co`). No local Supabase setup needed — credentials are already in `.env` / `.env.local`.
- **Dues Tracker dual nature.** The legacy Dues Tracker (`public/dues-tracker/`) is a large vanilla JS app loaded via iframe. The React wrapper is in `apps/dues-tracker/`. The `public/dues-tracker/app.js` file is 17k+ lines and can cause OOM in editors — it is listed in `.cursorignore`.
- **Pre-push hook.** Husky runs `scripts/pre-push.cjs` before `git push`, which syncs `shared/` and `apps/` directories. Errors in the hook are caught and do not block pushes.
- **No Docker, no Makefile.** This is a pure frontend project managed entirely through npm.
