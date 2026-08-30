# Deployment Guide — Single Server

## Architecture

The Personal Finance Tracker is deployed as **one application** on a single server.
The Express server serves both the React frontend and the REST API from the same URL.

```
┌──────────────┐         ┌──────────────────────────┐         ┌──────────────┐
│   Browser    │ ──────▶ │  Single Server            │ ──────▶ │  PostgreSQL  │
│              │         │  (Node.js + Express)      │         │  (Neon /     │
│              │         │                            │         │   Supabase / │
│              │         │  /          → React SPA    │         │   Railway)   │
│              │         │  /api/*     → REST API     │         └──────────────┘
│              │         │  /dashboard → React SPA    │
└──────────────┘         └──────────────────────────┘
```

**One URL. One server. One process.**

---

## Prerequisites

- Node.js 18+ installed on the server
- PostgreSQL database (Neon, Supabase, Railway, or self-hosted)
- A domain name (optional, but recommended for production)
- SMTP credentials for verification emails (optional — codes are logged to console if not configured)

---

## Quick Start (Local)

```bash
# 1. Install dependencies
make install

# 2. Set up the database
make db-create

# 3. Start development servers (frontend + backend separately)
make dev
```

## Quick Start (Production)

```bash
# 1. Install dependencies
make install

# 2. Set up the database
DATABASE_URL="postgresql://..." make db-create

# 3. Build everything (client + server)
make build

# 4. Start the production server
make start
# The server runs on http://localhost:3000 (or the PORT you set)
```

That's it. The server serves the React frontend AND handles API requests from the same URL.

---

## Deploy to Vercel (Recommended)

Vercel is the easiest way to deploy. Everything runs from **one URL** — the React frontend is served as static files, and the Express API runs as a serverless function.

```
┌──────────────┐         ┌──────────────────────────────────────┐         ┌──────────────┐
│   Browser    │ ──────▶ │  Vercel                              │ ──────▶ │  PostgreSQL  │
│              │         │                                      │         │  (Neon /     │
│              │         │  /          → React SPA (static)     │         │   Supabase)  │
│              │         │  /api/*     → Express (serverless)   │         └──────────────┘
│              │         │  /dashboard → React SPA              │
└──────────────┘         └──────────────────────────────────────┘
```

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New Project"**
3. Import your repository
4. **Important settings:**
   - **Root Directory:** `FinanceTracker` (not the repo root)
   - **Framework Preset:** Other
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `public`
5. Click **Deploy**

### Step 3: Set Environment Variables

In the Vercel dashboard → your project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/finance_tracker` |
| `JWT_SECRET` | A long random string (generate: `openssl rand -hex 32`) |
| `NODE_ENV` | `production` |
| `SMTP_HOST` | `smtp.gmail.com` (optional) |
| `SMTP_PORT` | `587` (optional) |
| `SMTP_USER` | Your email (optional) |
| `SMTP_PASS` | Your app password (optional) |

> **Note:** `JWT_SECRET` replaces `SESSION_SECRET`. Both work, but `JWT_SECRET` is preferred.

### Step 4: Set Up the Database

```bash
# Using Neon (free tier): create a database, then run:
psql "postgresql://..." -f DatabaseDesign/database.sql
```

### Step 5: Redeploy

After setting environment variables, redeploy:
- Vercel Dashboard → your project → Deployments → click **Redeploy**

Your app is now live at `https://your-project.vercel.app`.

### How Vercel Deployment Works

- **Static files** (`public/`) → served by Vercel's global CDN
- **API routes** (`/api/*`) → handled by the Express serverless function (`api/index.js`)
- **SPA routing** → any non-API, non-file URL returns `index.html` for client-side routing
- **Auth** → JWT tokens in httpOnly cookies (no server-side sessions needed)

### Verifying the Deployment

Visit your Vercel URL:
- `https://your-app.vercel.app/` → React app loads
- `https://your-app.vercel.app/api/health` → `{"success":true,"data":{"status":"ok"}}`
- `https://your-app.vercel.app/dashboard` → React app (client-side route)

---

## Detailed Production Deployment (Self-Hosted)

### Step 1: Get a Server

Any of these work:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Railway** | $5 credit/mo | Easiest — auto-deploys from GitHub |
| **Render** | Free tier available | Good for small apps |
| **Fly.io** | Free tier available | Global edge deployment |
| **DigitalOcean** | $4/mo droplet | Full control |
| **AWS Lightsail** | Free tier | AWS ecosystem |
| **Your own VPS** | — | Any Linux server with Node.js |

### Step 2: Get a Database

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Neon** | 0.5 GB free | Serverless PostgreSQL |
| **Supabase** | 500 MB free | PostgreSQL + extras |
| **Railway** | $5 credit/mo | Can host DB + app together |

### Step 3: Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd personal-finance-tracker

# Install dependencies
make install

# Set up environment
cd FinanceTracker/server
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://user:password@host:5432/finance_tracker
SESSION_SECRET=<generate-with-openssl-rand-hex-32>
NODE_ENV=production
PORT=3000
```

### Step 4: Set Up the Database

```bash
# Option A: Using the Makefile
DATABASE_URL="postgresql://..." make db-create

# Option B: Using psql directly
psql "postgresql://..." -f DatabaseDesign/database.sql
```

### Step 5: Build and Start

```bash
# Build the React frontend and compile the server
make build

# Start the production server
make start
```

The server is now running. Visit `http://your-server-ip:3000` (or your domain).

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` or `SESSION_SECRET` | ✅ | Random string for JWT signing (generate: `openssl rand -hex 32`) |
| `NODE_ENV` | ✅ | Set to `production` for single-server mode |
| `PORT` | Optional | Server port (default: `3001`) |
| `SMTP_HOST` | Optional | SMTP server for verification emails |
| `SMTP_PORT` | Optional | SMTP port (default: `587`) |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password |
| `EMAIL_FROM` | Optional | Sender email address |
| `MAX_LOGIN_ATTEMPTS` | Optional | Failed login lockout threshold (default: `5`) |
| `LOCKOUT_DURATION_MINUTES` | Optional | Account lockout duration (default: `10`) |

---

## How It Works

### Development Mode

In development, the frontend and backend run separately:
- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend**: `http://localhost:3001` (Express server)

Vite's dev server proxies `/api` requests to the backend automatically.

### Production Mode

In production, the Express server does everything:
1. Serves the compiled React frontend as static files
2. Handles all `/api/*` routes as the REST API
3. Returns `index.html` for any non-API route (SPA routing)

```
Browser requests:
  GET /              → Express serves React index.html
  GET /dashboard     → Express serves React index.html (client-side routing)
  GET /api/accounts  → Express handles the API request
  POST /api/login    → Express handles the API request
```

### The Key Code

In `server/src/app.ts`:

```javascript
if (isProduction) {
  const clientBuildPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}
```

This is what makes single-server deployment work. The React build output is served directly by Express.

---

## Behind a Reverse Proxy (Nginx / Caddy)

For production, you typically run the app behind a reverse proxy for HTTPS:

### Nginx Example

```nginx
server {
    listen 80;
    server_name finance.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name finance.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/finance.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/finance.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy Example

```
finance.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Caddy auto-configures HTTPS with Let's Encrypt.

---

## Systemd Service (Linux)

Create `/etc/systemd/system/finance-tracker.service`:

```ini
[Unit]
Description=Personal Finance Tracker
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/personal-finance-tracker/FinanceTracker/server
ExecStart=/usr/bin/node dist/app.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable finance-tracker
sudo systemctl start finance-tracker
```

---

## Docker (Optional)

Create `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY FinanceTracker/package.json FinanceTracker/package-lock.json ./
COPY FinanceTracker/server/package.json FinanceTracker/server/
COPY FinanceTracker/client/package.json FinanceTracker/client/
RUN npm ci --workspace=server --workspace=client

COPY . .
RUN npm run build --workspace=client
RUN npm run build --workspace=server

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/FinanceTracker/server/package.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/FinanceTracker/server/dist ./dist
COPY --from=builder /app/FinanceTracker/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "dist/app.js"]
```

Build and run:

```bash
docker build -t finance-tracker .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e SESSION_SECRET="your-secret" \
  -e NODE_ENV=production \
  finance-tracker
```

---

## Troubleshooting

### "Frontend build not found"

The React frontend hasn't been built. Run:

```bash
make build
```

This compiles both the client (`client/dist`) and server (`server/dist`).

### API works but frontend shows blank page

Check that `NODE_ENV=production` is set. The server only serves the React build in production mode.

### Session / cookie issues in production

Make sure:
- `SESSION_SECRET` is set to a strong random string
- If behind HTTPS proxy, the proxy sets `X-Forwarded-Proto: https`
- Cookies work cross-origin (not needed in single-server mode)

### Database connection refused

Check that `DATABASE_URL` is correct and the database server is running.

---

## Quick Commands Reference

```bash
make help           # Show all available commands
make install        # Install all dependencies
make dev            # Start development servers (frontend + backend)
make build          # Build client and server for production
make start          # Start production server
make test           # Run tests
make typecheck      # Type-check both client and server
make db-create      # Set up the database schema
make db-reset       # Reset the database schema
make db-seed        # Seed default categories
make status         # Show project status
```
