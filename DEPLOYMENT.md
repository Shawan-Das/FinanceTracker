# Deployment Guide

## Architecture

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Browser   │ ──────▶ │  Vercel (React) │ ──────▶ │  Backend API │
│             │         │  finance.vercel  │         │  your-domain │
└─────────────┘         └─────────────────┘         └──────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │  PostgreSQL   │
                                                        │  (Neon/Supa)  │
                                                        └──────────────┘
```

**Frontend** → Vercel (free tier works)
**Backend** → Railway / Render / Fly.io / your own server
**Database** → Neon / Supabase / Railway Postgres

---

## Step 1: Deploy the Backend

Vercel runs serverless functions — Express with sessions doesn't work there.
Deploy the backend to a separate hosting service.

### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project → "Deploy from GitHub repo"
3. Select this repository
4. Add a PostgreSQL database (Railway provides this)
5. Set environment variables:

```env
DATABASE_URL=postgresql://...  (Railway provides this automatically)
SESSION_SECRET=your-random-secret-here
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Finance Tracker <noreply@yourdomain.com>
```

6. Railway will auto-deploy. Note the deployment URL (e.g., `https://your-app.up.railway.app`)

### Option B: Render

1. Go to [render.com](https://render.com)
2. Create a "Web Service" from your GitHub repo
3. Build command: `cd FinanceTracker/server && npm install && npm run build`
4. Start command: `cd FinanceTracker/server && node dist/app.js`
5. Add a PostgreSQL database and connect it
6. Set the same environment variables as above

### Option C: Fly.io

1. Go to [fly.io](https://fly.io)
2. `fly launch` in the server directory
3. Set secrets with `fly secrets set`

---

## Step 2: Deploy the Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New Project"
3. Import this repository
4. **Important settings:**
   - **Root Directory:** `FinanceTracker/client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Set environment variables:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
```

6. Click "Deploy"

---

## Step 3: Update Backend CORS

After deploying both, update the backend environment variable:

```env
FRONTEND_URL=https://your-app.vercel.app
```

This allows the Vercel frontend to make API requests to your backend.

---

## Step 4: Set Up the Database

After the backend is deployed, the database schema needs to be applied.

### Option 1: Run setup script

```bash
# Set DATABASE_URL to your production database
DATABASE_URL=postgresql://... npx tsx FinanceTracker/server/src/database/setup.ts
```

### Option 2: Use the Makefile

```bash
DATABASE_URL=postgresql://... make db-create
```

### Option 3: Run directly via psql

```bash
psql "postgresql://..." -f DatabaseDesign/database.sql
```

---

## Environment Variables Reference

### Backend (Railway/Render/Fly.io)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/finance_tracker` |
| `SESSION_SECRET` | ✅ | `a-long-random-string-here` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | Optional | `3000` |
| `FRONTEND_URL` | ✅ | `https://your-app.vercel.app` |
| `SMTP_HOST` | For email | `smtp.gmail.com` |
| `SMTP_PORT` | For email | `587` |
| `SMTP_USER` | For email | `your@gmail.com` |
| `SMTP_PASS` | For email | `your-app-password` |
| `EMAIL_FROM` | For email | `Finance Tracker <noreply@you.com>` |

### Frontend (Vercel)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | ✅ | `https://your-backend.up.railway.app` |

---

## Gmail SMTP Setup (for verification emails)

If using Gmail for sending verification codes:

1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create a new app password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

---

## Quick Commands

```bash
# Local development
make dev

# Build for production
make build

# Run tests
make test

# Check project status
make status

# Reset database
make db-reset
```
