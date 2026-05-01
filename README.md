# Monkeybook

A social media site where you can be anonymously negative through monkey identities.

Every visitor gets a random monkey persona (like "Grumpy Mandrill" or "Chaotic Lemur") and can post, react with bananas or poop, and delete their own posts.

## Setup

```bash
npm run install:all
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

- `npm run test:server` checks core API flows (identity, troop membership enforcement, banana budget limit)
- `npm run test:client` checks key UI interactions and behavior

## Go Live Checklist

1. Production deploy target configured (frontend + API)
2. `npm run test` passes on clean install
3. `npm run build` succeeds
4. `NODE_ENV=production` and secure cookie/cors settings set
5. Persistent database backup strategy in place
6. Basic monitoring and error logs configured

## Architecture

- **`client/`** — React (Vite) frontend
- **`server/`** — Express API with SQLite database
- Anonymous identity via session cookies + random monkey names
