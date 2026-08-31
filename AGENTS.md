# Monkeybook

A social media app with anonymous monkey identities. React (Vite) frontend + Express/SQLite backend.

## Cursor Cloud specific instructions

### Quick Reference

- **Install deps:** `npm run install:all` (installs root + client + server)
- **Dev servers:** `npm run dev` (starts Vite on :3000, Express API on :3001 concurrently)
- **Tests:** `npm run test` (server + client), or `npm run test:server` / `npm run test:client` individually
- **Build:** `npm run build` (Vite builds client to `client/dist`)

### Architecture Notes

- Fully self-contained: SQLite is embedded (auto-creates `server/monkeybook.db`), no external DB/Redis/Docker needed.
- The Vite dev server (port 3000) proxies `/api` and `/ws` to the Express backend (port 3001). Always use port 3000 for browser testing in dev.
- `better-sqlite3` is a native addon requiring `python3`, `make`, and `g++` at install time (pre-installed on Cloud Agent VMs).
- There is no lint command configured in this repo — only tests serve as the quality gate.
- The server auto-creates `server/uploads/` directory for image uploads on startup.

### Gotchas

- Do NOT open port 3001 in a browser during development unless you've run `npm run build` first — without `client/dist`, the API shows a help page instead of the React app.
- The SQLite DB file (`server/monkeybook.db`) is gitignored and created fresh on first server start. Tests use a separate temp DB and clean up after themselves.
- No `.env` file is needed; the app runs with sane defaults (`PORT=3001`, `NODE_ENV` unset for dev).
