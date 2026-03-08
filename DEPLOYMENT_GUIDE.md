# EduYantra — Deployment Guide

> Complete guide to deploying EduYantra in production.

| Layer | Service | URL |
|---|---|---|
| **Frontend** | Vercel | `https://<your-app>.vercel.app` |
| **Backend** | Render | `https://saas-q8nb.onrender.com` |
| **Database** | Neon PostgreSQL | Managed (ap-southeast-1) |

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Part 1 — Backend (Render)](#part-1--deploy-backend-on-render)
4. [Part 2 — Frontend (Vercel)](#part-2--deploy-frontend-on-vercel)
5. [Part 3 — Seed the Database](#part-3--seed-the-database)
6. [Part 4 — Post-Deployment Checklist](#part-4--post-deployment-checklist)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Default Login Credentials](#default-login-credentials)
9. [Custom Domain Setup](#custom-domain-optional)
10. [Performance & Scaling](#performance--scaling)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GitHub repo pushed to `AyanAhmedKhan/SaaS` (branch: `main`)
- A [Neon](https://neon.tech) PostgreSQL database
- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- Node.js ≥ 18 (for local development)

---

## Architecture Overview

```
┌──────────────┐       ┌──────────────────┐       ┌────────────────┐
│   Browser    │──────▶│  Vercel (Static)  │       │  Neon Postgres │
│  React SPA   │       │   Vite + React    │       │  (ap-southeast)│
└──────────────┘       └────────┬─────────┘       └────────▲───────┘
                                │ /api/* rewrite            │
                                ▼                           │
                       ┌──────────────────┐                │
                       │  Render (Node)   │────────────────┘
                       │  Express API     │   DATABASE_URL
                       └──────────────────┘
```

**How API calls work in each environment:**

| Environment | Mechanism |
|---|---|
| **Development** | Vite dev server proxies `/api/*` → `http://localhost:3001` |
| **Production** | `vercel.json` rewrites `/api/*` → Render backend URL |

Both approaches let the frontend use relative `/api` paths — no code changes needed between environments.

---

## Part 1 — Deploy Backend on Render

### 1.1 Create the Web Service

1. Go to [render.com/dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo `AyanAhmedKhan/SaaS`
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `saas` (or any name you prefer) |
| **Region** | Singapore (closest to Neon ap-southeast-1) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free or Starter ($7/mo for always-on) |

### 1.2 Set Environment Variables

Go to your Render service → **Environment** → Add:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | Render auto-assigns, but explicit is safer |
| `DATABASE_URL` | `postgresql://neondb_owner:<pwd>@<host>/neondb?sslmode=require` | From Neon dashboard → Connection Details |
| `JWT_SECRET` | *(generate: `openssl rand -base64 32`)* | **Never reuse the dev secret** |
| `CORS_ORIGIN` | `https://<your-app>.vercel.app` | Update after Vercel deploy; comma-separate multiple origins |
| `geminiapi` | `<your-gemini-api-key>` | For AI Insights feature |

> **Security**: `JWT_SECRET` is **required** — the server will refuse to start without it.  
> `CORS_ORIGIN` supports comma-separated values (e.g., `https://app.vercel.app,https://app.eduyantra.com`).

### 1.3 Deploy

Click **Create Web Service**. Render will:

1. Clone the repo
2. `cd server && npm install`
3. `npm start` → runs `node src/index.js`
4. Auto-creates the database schema on first boot

Note your Render URL (e.g., `https://saas-q8nb.onrender.com`).

### 1.4 Verify Backend

```bash
curl https://saas-q8nb.onrender.com/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "PostgreSQL (Local)",
    "timestamp": "2026-03-08T...",
    "uptime": 42.5
  }
}
```

---

## Part 2 — Deploy Frontend on Vercel

### 2.1 How It Works (already configured)

The project is already set up for production:

- **`src/lib/api.ts`** reads `VITE_API_URL` at build time, falling back to `/api`:
  ```ts
  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  ```

- **`vercel.json`** rewrites `/api/*` to Render:
  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "https://saas-q8nb.onrender.com/api/:path*" }
    ]
  }
  ```

- **`.env.production`** sets the API URL for production builds:
  ```
  VITE_API_URL=https://saas-q8nb.onrender.com/api
  ```

> You can use **either** the `VITE_API_URL` env var **or** the `vercel.json` rewrites. Both are configured — the env var takes precedence when set.

### 2.2 Create Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Import GitHub repo `AyanAhmedKhan/SaaS`
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (or `eduyantra` if repo root contains the folder) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 2.3 Set Environment Variables on Vercel

Go to **Settings** → **Environment Variables**:

| Key | Value | Environments |
|---|---|---|
| `VITE_API_URL` | `https://saas-q8nb.onrender.com/api` | Production, Preview |

> This is already in `.env.production`, so it's optional on Vercel — but setting it explicitly ensures it's always correct.

### 2.4 Deploy

Click **Deploy**. Vercel will:

1. `npm install`
2. `npm run build` → `vite build`
3. Serve the static `dist/` folder on a CDN

Your app will be live at `https://<your-app>.vercel.app`.

### 2.5 Update CORS on Render

After Vercel is live, go back to **Render → Environment** and update:

```
CORS_ORIGIN=https://<your-app>.vercel.app
```

Trigger a manual redeploy on Render for the change to take effect.

---

## Part 3 — Seed the Database

The seed endpoint creates demo data including institutes, users, students, attendance, timetables, and more.

### First-time seed (no auth required)

If the database has no users yet, the seed endpoint is open:

```bash
curl -X POST https://saas-q8nb.onrender.com/api/seed
```

### Re-seed (requires super_admin auth)

Once users exist, you must authenticate as `super_admin`:

```bash
# 1. Login as super admin
TOKEN=$(curl -s -X POST https://saas-q8nb.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@eduyantra.com","password":"demo123"}' \
  | jq -r '.data.token')

# 2. Re-seed with token
curl -X POST https://saas-q8nb.onrender.com/api/seed \
  -H "Authorization: Bearer $TOKEN"
```

### Alternative: Seed from local machine

```bash
cd server
DATABASE_URL="your-neon-connection-string" node src/db/seed.js
```

---

## Part 4 — Post-Deployment Checklist

- [ ] **Backend health**: `curl https://saas-q8nb.onrender.com/api/health`
- [ ] **Frontend loads**: Visit your Vercel URL in a browser
- [ ] **Database seeded**: Run the seed endpoint (Part 3)
- [ ] **Login works**: Try all roles (see credentials below)
- [ ] **CORS configured**: No CORS errors in browser DevTools console
- [ ] **API proxy works**: Frontend API calls return data (not 404/502)

---

## Environment Variables Reference

### Render (Backend)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require
JWT_SECRET=<generate-with-openssl-rand-base64-32>
CORS_ORIGIN=https://<your-app>.vercel.app
geminiapi=<your-gemini-api-key>
```

### Vercel (Frontend)

```env
VITE_API_URL=https://saas-q8nb.onrender.com/api
```

### Local Development

No `.env` file is strictly required for local dev — the server defaults to:

| Variable | Default |
|---|---|
| `PGHOST` | `localhost` |
| `PGUSER` | `postgres` |
| `PGPASSWORD` | `ayan` |
| `PGDATABASE` | `eduyantra` |
| `PGPORT` | `5432` |

---

## Default Login Credentials

After seeding, use these accounts (password: **`demo123`** for all):

| Role | Email | Institute Code |
|---|---|---|
| **Super Admin** | `super@eduyantra.com` | — |
| **Institute Admin** | `admin@springfield.edu` | `SPRING01` |
| **Class Teacher** | `priya.sharma@springfield.edu` | `SPRING01` |
| **Subject Teacher** | `sunita.verma@springfield.edu` | `SPRING01` |
| **Student** | `arjun@springfield.edu` | `SPRING01` |
| **Parent** | `ramesh.sharma@gmail.com` | `SPRING01` |

---

## Custom Domain (Optional)

### Vercel (Frontend)

1. Go to **Settings → Domains** → Add your domain (e.g., `app.eduyantra.com`)
2. Update DNS: `CNAME → cname.vercel-dns.com`

### Render (Backend)

1. Go to **Settings → Custom Domains** → Add (e.g., `api.eduyantra.com`)
2. Update DNS per Render's instructions

### After adding custom domains

Update these values to match your new domains:

| Where | Variable | New Value |
|---|---|---|
| Render env | `CORS_ORIGIN` | `https://app.eduyantra.com` |
| Vercel env | `VITE_API_URL` | `https://api.eduyantra.com/api` |
| `vercel.json` | rewrite destination | `https://api.eduyantra.com/api/:path*` |

---

## Performance & Scaling

### Free Tier Limitations

| Service | Limitation | Mitigation |
|---|---|---|
| **Render Free** | Spins down after 15 min idle; cold start ~30s | Use [cron-job.org](https://cron-job.org) to ping `/api/health` every 14 min |
| **Neon Free** | Auto-suspends after 5 min idle; wake-up ~1-2s | First query after wake is slow; connection pooler helps |

### Upgrading

| Service | Paid Tier | Benefit |
|---|---|---|
| **Render Starter** | $7/mo | Always-on, no cold starts |
| **Neon Pro** | $19/mo | No auto-suspend, more compute, autoscaling |

### Production Recommendations

1. **Keep Render warm** — set up a cron ping to `/api/health` every 14 minutes
2. **Use Neon's connection pooler** — the `DATABASE_URL` should use the `-pooler` endpoint
3. **Monitor Render logs** — slow queries (>500ms) are logged automatically by the backend
4. **Rate limiting** is enabled: 1000 req/15min general, 50 req/15min for login

---

## Troubleshooting

| Problem | Solution |
|---|---|
| **CORS errors in browser** | Ensure `CORS_ORIGIN` on Render matches your exact Vercel URL (no trailing slash). Supports comma-separated origins. |
| **502/503 on Render** | Check Render logs → likely DB connection issue. Verify `DATABASE_URL` is correct. |
| **API calls return 404 on Vercel** | Ensure `vercel.json` rewrites are configured, or check `VITE_API_URL` is set. |
| **"JWT_SECRET not set" crash** | `JWT_SECRET` env var is required on Render. The server exits immediately without it. |
| **Slow first load** | Render free tier cold start (~30s). Set up a keep-alive cron job. |
| **DB connection timeout** | Neon may be suspended. First request wakes it. Use the `-pooler` connection string. |
| **Build fails on Vercel** | Check Node.js version (≥18 required). Add `"engines": { "node": ">=18" }` to `package.json` if needed. |
| **Seed fails with faker error** | Ensure server code is up to date on the deployed branch (recent fix for `@faker-js/faker` v9 API change). |
| **Re-seed returns 401** | Database already has users. Authenticate as `super_admin` first (see Part 3). |

---

## Useful Commands

```bash
# Health check
curl https://saas-q8nb.onrender.com/api/health

# Seed (first time)
curl -X POST https://saas-q8nb.onrender.com/api/seed

# Local dev — start backend
cd server && npm install && npm start

# Local dev — start frontend
npm install && npm run dev

# Local dev — seed local DB
cd server && npm run seed

# Production build (test locally)
npm run build && npm run preview
```
