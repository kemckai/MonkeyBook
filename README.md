# Monkeybook

A social media site where you can be anonymously negative through monkey identities.

Every user creates an account, gets a random monkey persona (like "Grumpy Mandrill" or "Chaotic Lemur"), and can post, react with bananas or poop, add friends, and join troops.

## Features

- **Accounts** — email/password or Google OAuth
- **Monkey personas** — random identity linked to your account
- **Feed** — fresh, trending, and friends-only tabs
- **Friends** — send requests, accept, see friend posts
- **Troops** — private group feeds
- **Moderation** — report posts, admin dashboard
- **Real-time** — WebSocket live updates

## Setup

```bash
npm run install:all
cp .env.example .env   # set ADMIN_EMAILS to your email
```

## Development

Starts both the API server (port **3001**) and Vite dev server (port **3000**):

```bash
npm run dev
```

Open **http://localhost:3000** in the browser. The UI is served by Vite; API calls and WebSockets are proxied to the backend.

**If the page is blank or you only see errors:** do not open port 3001 unless you have run `npm run build` — without `client/dist`, the API process shows a short help page at `/` instead of the React app.

## Test Quality Gate

Run all automated tests before shipping:

```bash
npm run test
```

- `npm run test:server` — auth, troops, bananas, friends, reports
- `npm run test:client` — UI component tests

## Deployment

See [DEPLOY.md](DEPLOY.md) for Railway + PostgreSQL + Cloudflare R2 setup.

## Go Live Checklist

1. Railway (or Render) project with PostgreSQL database
2. `ADMIN_EMAILS` set before first admin registers
3. `npm run test` passes on clean install
4. `npm run build` succeeds
5. `NODE_ENV=production` and `CLIENT_ORIGIN` set
6. R2 configured for persistent image uploads (optional)
7. Google OAuth configured (optional)
8. Privacy policy and terms pages live at `/privacy` and `/terms`

## Architecture

- **`client/`** — React (Vite) frontend
- **`server/`** — Express API with SQLite (dev) or PostgreSQL (production)
- Anonymous posting via monkey personas; accounts tracked on backend for moderation
