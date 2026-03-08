# EduYantra Deployment Guide

> **Backend** → Render (Web Service)  
> **Frontend** → Vercel  
> **Database** → Neon PostgreSQL (already configured)

---

## Prerequisites

- GitHub repository pushed to `AyanAhmedKhan/SaaS` (main branch)
- A [Neon](https://neon.tech) PostgreSQL database (you already have one)
- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account

---

## Part 1 — Deploy Backend on Render

### Step 1: Prepare the backend for production

The server already reads env vars for DB connection. Ensure `server/src/db/connection.js` uses `DATABASE_URL` when available (for Neon in production) alongside the individual `PGHOST`/`PGUSER` vars it already supports.

**Edit `server/src/db/connection.js`** — update the pool creation to support `DATABASE_URL`:

```js
export function getPool() {
    if (!pool) {
        const connectionConfig = process.env.DATABASE_URL
            ? {
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false },
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
              }
            : {
                host: process.env.PGHOST || 'localhost',
                user: process.env.PGUSER || 'postgres',
                password: process.env.PGPASSWORD || 'ayan',
                database: process.env.PGDATABASE || 'eduyantra',
                port: parseInt(process.env.PGPORT || '5432'),
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
              };

        pool = new Pool(connectionConfig);
        // ... rest of pool event handlers
    }
    return pool;
}
```

### Step 2: Update CORS for production

In `server/src/index.js`, the CORS origin reads from `process.env.CORS_ORIGIN`. Set this on Render to your Vercel domain.

### Step 3: Create Render Web Service

1. Go to [render.com/dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo `AyanAhmedKhan/SaaS`
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `eduyantra-api` |
| **Region** | Singapore (closest to Neon ap-southeast-1) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter $7/mo for always-on) |

### Step 4: Set Environment Variables on Render

Go to your Render service → **Environment** → Add these:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgresql://neondb_owner:<password>@ep-polished-unit-a142rzat-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | `<a-strong-random-secret>` (use `openssl rand -base64 32`) |
| `CORS_ORIGIN` | `https://your-app.vercel.app` (update after Vercel deploy) |
| `geminiapi` | `<your-gemini-api-key>` |

> ⚠️ **Important**: Replace placeholders with your actual values. Never use the default JWT secret in production.

### Step 5: Deploy

Click **Create Web Service**. Render will:
1. Clone your repo
2. `cd server && npm install`
3. `npm start`

Once deployed, note your Render URL (e.g., `https://eduyantra-api.onrender.com`).

### Step 6: Seed Database (one-time)

Use Render's **Shell** tab or run locally pointing to Neon:

```bash
DATABASE_URL="your-neon-connection-string" node src/db/seed.js
```

### Step 7: Verify

Visit `https://eduyantra-api.onrender.com/api/health` — you should see:

```json
{ "success": true, "data": { "status": "healthy", "database": "PostgreSQL (Local)" } }
```

---

## Part 2 — Deploy Frontend on Vercel

### Step 1: Update API base URL for production

The frontend uses `const API_BASE = '/api'` in `src/lib/api.ts` with Vite's dev proxy. In production, API calls need to hit the Render backend directly.

**Option A — Environment Variable (Recommended)**

Update `src/lib/api.ts`:

```ts
const API_BASE = import.meta.env.VITE_API_URL || '/api';
```

Then set `VITE_API_URL` on Vercel to your Render backend URL (e.g., `https://eduyantra-api.onrender.com/api`).

**Option B — Vercel Rewrites (Zero code change)**

Create `vercel.json` at the project root:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://eduyantra-api.onrender.com/api/:path*" }
  ]
}
```

This proxies all `/api/*` requests to Render, so the frontend code stays unchanged.

### Step 2: Create Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Import your GitHub repo `AyanAhmedKhan/SaaS`
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (project root, since `package.json` is at root level inside `eduyantra/`) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> **Note**: If your repo root is the `eduyantra/` folder itself, leave Root Directory as `./`. If the repo contains the `eduyantra/` folder, set Root Directory to `eduyantra`.

### Step 3: Set Environment Variables on Vercel

Go to **Settings** → **Environment Variables**:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://eduyantra-api.onrender.com/api` (only if using Option A) |

### Step 4: Deploy

Click **Deploy**. Vercel will:
1. `npm install`
2. `npm run build` (runs `vite build`)
3. Serve the static `dist/` folder

Your app will be live at `https://your-app.vercel.app`.

### Step 5: Update CORS on Render

Go back to Render → **Environment** → Update:

```
CORS_ORIGIN=https://your-app.vercel.app
```

Then manually redeploy the Render service for the change to take effect.

---

## Part 3 — Post-Deployment Checklist

### Verify end-to-end

- [ ] Backend health check: `https://eduyantra-api.onrender.com/api/health`
- [ ] Frontend loads: `https://your-app.vercel.app`
- [ ] Login works (API calls reach backend)
- [ ] Database operations work (CRUD)

### Custom Domain (Optional)

**Vercel:**
1. Settings → Domains → Add your domain (e.g., `app.eduyantra.com`)
2. Update DNS: CNAME → `cname.vercel-dns.com`

**Render:**
1. Settings → Custom Domains → Add (e.g., `api.eduyantra.com`)
2. Update DNS per Render instructions

After adding custom domains, update:
- `CORS_ORIGIN` on Render → `https://app.eduyantra.com`
- `VITE_API_URL` on Vercel → `https://api.eduyantra.com/api` (if using Option A)
- Or update `vercel.json` rewrites destination (if using Option B)

### Performance Tips

1. **Render Free Tier** spins down after 15 min of inactivity (cold starts ~30s). Upgrade to Starter ($7/mo) for always-on.
2. **Neon Free Tier** has auto-suspend after 5 min idle. First query after wake-up takes ~1-2s.
3. Add a cron job to ping `/api/health` every 14 min to keep Render warm (use [cron-job.org](https://cron-job.org) for free).

---

## Quick Reference — All Environment Variables

### Render (Backend)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://neondb_owner:<password>@ep-polished-unit-a142rzat-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=https://your-app.vercel.app
geminiapi=<your-gemini-api-key>
```

### Vercel (Frontend)

```env
VITE_API_URL=https://eduyantra-api.onrender.com/api
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| CORS errors in browser | Ensure `CORS_ORIGIN` on Render matches your exact Vercel URL (no trailing slash) |
| 502/503 on Render | Check Render logs; likely DB connection issue — verify `DATABASE_URL` |
| API calls return 404 on Vercel | Ensure `vercel.json` rewrites are set (Option B) or `VITE_API_URL` is correct (Option A) |
| Slow first load | Render free tier cold start; ping `/api/health` periodically |
| DB connection timeout | Neon may be suspended; first request wakes it up — add retry logic or use Neon's connection pooler |
| Build fails on Vercel | Check Node.js version; add `"engines": { "node": ">=18" }` to root `package.json` |
