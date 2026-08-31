# Deploying Monkeybook

Monkeybook is designed to be **stateless at the web layer**: sessions and data live in PostgreSQL, caches in the `app_cache` table, and background work in a `jobs` queue. The web process handles HTTP + WebSocket; a separate **worker** process drains the job queue.

## Architecture

| Component | Role |
|-----------|------|
| **Web** (`node server/index.js`) | API, static client, WebSocket connections |
| **Worker** (`node server/worker.js`) | Emails, R2 uploads, notification delivery |
| **PostgreSQL** | Users, posts, jobs queue, shared cache |
| **R2** (optional) | Durable image storage |

Cross-process realtime events use **PostgreSQL `LISTEN/NOTIFY`** so workers can trigger WebSocket broadcasts on the web tier without shared memory.

### Job types

- `email.password-reset` — SMTP send (non-blocking)
- `media.upload` — R2 upload after temp file save
- `notification.deliver` — DB insert + realtime broadcast

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

### 6. Add a worker service (recommended)

1. In Railway → **+ New** → **GitHub Repo** → same Monkeybook repo
2. Name it `monkeybook-worker`
3. **Start command:** `node server/worker.js`
4. Link the same `DATABASE_URL` (and R2/SMTP vars if used)
5. Set `EMBEDDED_WORKER=false` on the **web** service

The web service listens for `pg_notify` events and fans them out over WebSocket. Multiple worker replicas are safe (jobs use `FOR UPDATE SKIP LOCKED`).

For a single-instance deploy only, you can set `EMBEDDED_WORKER=true` on the web service instead of running a separate worker.

### 7. Add an autoscaler service (optional)

Monkeybook exposes load signals for horizontal scaling:

| Endpoint | Signal | Use for |
|----------|--------|---------|
| `GET /api/metrics/load` | In-flight HTTP requests | Web replicas |
| `GET /api/metrics/queue` | Pending + processing jobs | Worker replicas |

The autoscaler (`autoscaler/index.js`) polls these signals and adjusts replica counts via the [Railway Public API](https://docs.railway.com/guides/autoscale-horizontally) (`serviceInstanceUpdate`).

1. In Railway → **+ New** → **GitHub Repo** → same Monkeybook repo
2. Name it `monkeybook-autoscaler`
3. **Start command:** `node autoscaler/index.js`
4. **Do not** attach a public domain (outbound-only service)
5. Create a **project token** in Railway project settings → Tokens
6. Set variables:

| Variable | Value |
|----------|-------|
| `RAILWAY_API_TOKEN` | Project token |
| `RAILWAY_TOKEN_TYPE` | `project` |
| `METRICS_TOKEN` | Shared secret (also set on web service) |
| `AUTOSCALE_WEB_SERVICE_ID` | Web service ID (from dashboard URL) |
| `AUTOSCALE_WEB_ENVIRONMENT_ID` | Environment ID |
| `AUTOSCALE_WEB_LOAD_URL` | `https://your-app.up.railway.app/api/metrics/load` |
| `AUTOSCALE_WEB_TARGET_INFLIGHT` | `25` (tune per replica capacity) |
| `AUTOSCALE_WEB_MIN_REPLICAS` | `1` |
| `AUTOSCALE_WEB_MAX_REPLICAS` | `10` |
| `AUTOSCALE_WORKER_ENABLED` | `true` (optional) |
| `AUTOSCALE_WORKER_SERVICE_ID` | Worker service ID |
| `AUTOSCALE_WORKER_QUEUE_URL` | `http://monkeybook.railway.internal/api/metrics/queue` (private networking) |
| `AUTOSCALE_WORKER_TARGET_JOBS` | `20` jobs per worker replica |

**Behavior:** scales up immediately when load exceeds target; scales down one replica at a time with a 5-minute cooldown to prevent flapping. Requires a stateless web tier (sessions in Postgres, jobs in queue).

Set `METRICS_TOKEN` on the **web** service too so metrics endpoints are not public.

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

This starts the Vite client, API server, and a local worker process. Open http://localhost:3000. Uses SQLite locally (no Postgres needed); jobs run via the worker using the same queue code as production.

## Admin access

Set `ADMIN_EMAILS=your@email.com` before registering. That account gets access to `/admin` for moderation.

## Health check

- `GET /api/auth/me` — returns `null` if not logged in (200 OK)

## Render alternative

Same env vars apply. Build command: `npm run install:all && npm run build`. Start command: `node server/index.js`. Add a PostgreSQL database and link `DATABASE_URL`. Add a second service with start command `node server/worker.js`.
