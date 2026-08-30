# Deploying Monkeybook

Monkeybook runs as a single Node.js process that serves the built React app and API.

## Railway (recommended)

### 1. Create project

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the Monkeybook repo

### 2. Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway sets `DATABASE_URL` automatically on your service

### 3. Configure environment variables

In your web service → **Variables**, set:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `ADMIN_EMAILS` | Your email (gets admin access) |
| `CLIENT_ORIGIN` | Your Railway app URL |
| `GOOGLE_CLIENT_ID` | (optional) Google OAuth client ID |
| `VITE_GOOGLE_CLIENT_ID` | Same as above (needed at build time) |

### 4. Cloudflare R2 for images (optional)

1. Create an R2 bucket in Cloudflare dashboard
2. Create API token with read/write access
3. Set these variables:

| Variable | Value |
|----------|-------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET` | Bucket name |
| `R2_PUBLIC_URL` | Public bucket URL (enable public access or custom domain) |

Without R2, uploads are stored on the server filesystem (not persistent across Railway redeploys).

### 5. Deploy

Railway uses **Railpack** and reads `railpack.json` in the repo root. The build installs client + server dependencies, builds the Vite app, then starts `node server/index.js`.

Set these variables on your **web service** (not just Postgres):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `ADMIN_EMAILS` | `hello@brightliaison.com` |
| `CLIENT_ORIGIN` | Your Railway public URL |
| `DATABASE_URL` | Auto-set if Postgres is linked to the service |

**Important:** In Railway, open your **web service** → **Variables** → **Add Reference** → select the Postgres `DATABASE_URL`. Deploying Postgres alone does not inject it into the app unless linked.

After the first deploy, copy your public URL and set `CLIENT_ORIGIN`, then redeploy.

Optional: SMTP vars for password-reset emails (see `.env.example`).

## Google Sign-In setup (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized JavaScript origins: your production URL and `http://localhost:3000`
4. Set `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` to the client ID

## Local development

```bash
npm run install:all
cp .env.example .env   # edit ADMIN_EMAILS
npm run dev
```

Open http://localhost:3000. Uses SQLite locally (no Postgres needed).

## Admin access

Set `ADMIN_EMAILS=your@email.com` before registering. That account gets access to `/admin` for moderation.

## Health check

- `GET /api/auth/me` — returns `null` if not logged in (200 OK)

## Render alternative

Same env vars apply. Build command: `npm run install:all && npm run build`. Start command: `node server/index.js`. Add a PostgreSQL database and link `DATABASE_URL`.
