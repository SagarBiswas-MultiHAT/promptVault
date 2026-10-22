# Production Deployment Guide & Runbook: PromptVault

| Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Document Type** | Production Deployment Guide, Configuration Manual & Operations Runbook |
| **Status** | Approved (Production Baseline) |
| **Version** | v2.2.1 |
| **Owner / Lead Architect** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Reference Documents** | [Architecture Blueprint](file:///o:/github/promptVault/docs/03-architecture/architecture.md), [SRS](file:///o:/github/promptVault/docs/02-requirements/srs.md), [Threat Model](file:///o:/github/promptVault/docs/04-security/threat-model.md), [API Spec](file:///o:/github/promptVault/docs/05-api/api-spec.md) |

---

## 1. Deployment in Plain English (Executive Overview)

Deploying a software application simply means making it live on the internet so you and your team can access it from anywhere, on any device, at any time.

Because PromptVault uses a **local-first, zero-knowledge architecture**, its deployment is much simpler and more cost-effective than traditional web platforms:
- **No Heavy Database Servers**: You do not need to provision or manage expensive, resource-heavy SQL database clusters just to run PromptVault.
- **Your Browser Does the Heavy Lifting**: Encryption, search, filtering, and tag management happen locally inside the user's web browser.
- **The Server is a Lightweight Courier**: The backend server has only one primary job: securely forwarding prompt text to Google Gemini and Groq Cloud, keeping your third-party API keys safe and out of reach of public visitors.

### Deployment Topologies

PromptVault supports two deployment topologies:

```
[ Topology 1: Unified Container (Recommended) ]
User Browser ---> [ Reverse Proxy / Cloudflare ] ---> [ Node 22 + Express 5 ]
                                                        - Serves Frontend (dist/)
                                                        - Serves API (/api/*)

[ Topology 2: Split Architecture ]
User Browser ---> [ CDN: Vercel / Cloudflare Pages ] ---> Static HTML/JS
       |
       +---------> [ Container: Render / Railway ]   ---> Express AI Proxy (/api/*)
```

1. **Unified Container (Recommended)**: A single Node.js instance serves both the compiled static frontend files and the AI proxy API on a single port. This is the simplest to deploy and cheapest to run.
2. **Split Architecture**: The frontend is hosted on a global static Content Delivery Network (like Cloudflare Pages, Vercel, or Netlify), while the backend API runs inside a container on Render, Railway, Fly.io, or an AWS EC2/ECS instance.

---

## 2. System Prerequisites & Hardware Sizing

### Minimum Sizing Requirements (Unified Node.js Service)
- **CPU**: 1 vCPU (shared CPU is completely adequate).
- **RAM**: 512 MB minimum (1 GB recommended for high concurrent traffic).
- **Disk Storage**: 500 MB (for Node runtime, application bundle, and dependencies).
- **Node.js**: Version 22.x LTS or higher.
- **Package Manager**: npm v10.x or higher.

### Required External Service Accounts
1. **Google AI Studio or Google Cloud Console**: At least one Gemini API key (e.g. `AIzaSy...` or `AQ...`).
2. **Groq Cloud (Optional but Recommended)**: Groq API key (`gsk_...`) for automatic, seamless high-speed fallback when Google is rate-limited.
3. **Supabase (Optional)**: A free Supabase account if you plan to enable multi-device cloud synchronization.

---

## 3. Environment Variables Reference

PromptVault resolves configuration once at startup using a strict three-tier precedence hierarchy:

```
Process Environment Variables  >  .env File  >  Hardcoded Defaults (server/config.ts)
```

This precedence model prevents stale `.env` files baked into container images from overriding live platform configuration.

### Server Environment Variables

| Variable | Required? | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** in prod | `development` | Set to `production` in live environments. Enables static asset serving, HSTS security headers, and strict config validation. |
| `PORT` or `AI_PROXY_PORT` | No | `3002` | Network port where Express listens for incoming HTTP connections. |
| `ALLOWED_ORIGINS` | **Yes** in prod | *(None)* | Comma-separated list of allowed web origins (e.g. `https://promptvault.app,https://myvault.com`). **The server refuses to start in production if this is empty.** |
| `TRUST_PROXY_HOPS` | No | `1` (prod) / `0` (dev) | Number of upstream reverse proxies (e.g. Cloudflare, Render, Traefik). Required so rate-limiting tracks real client IPs rather than proxy IPs. |
| `GEMINI_API_KEYS` | Recommended | *(None)* | Comma-separated pool of Gemini API keys. The server rotates through these keys sequentially to provide higher rate limits. |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Google Gemini model identifier used for analysis and improvements. |
| `GEMINI_TIMEOUT_MS` | No | `35000` | Deadline in milliseconds before the server gives up on Gemini and falls back to Groq. |
| `GROQ_API_KEY` | Recommended | *(None)* | Groq API key used as the secondary fallback provider. |
| `GROQ_MODEL` | No | `qwen/qwen3.8-27b` | Groq model identifier used when falling back. |
| `GROQ_TIMEOUT_MS` | No | `20000` | Deadline in milliseconds before abandoning a Groq request. |
| `MAX_OUTPUT_TOKENS` | No | `8192` | Generation token limit. Preserves budget for reasoning models. |

### Client-Side Build Variables (Vite)

> [!IMPORTANT]
> `VITE_*` variables are **build-time** variables. Vite permanently embeds them into the compiled JavaScript bundle during `npm run build`. Changing these variables in a hosting dashboard requires running a fresh build to take effect.

| Variable | Required? | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | No | Full URL of your Supabase project (e.g. `https://xyzcompany.supabase.co`). Leave blank to disable cloud sync. |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase public anonymous API key (`eyJ...`). Safe to ship in client bundles; access is enforced by PostgreSQL Row-Level Security. |

---

## 4. Method A: Unified Node.js Deployment (Recommended)

This is the fastest, cleanest way to run PromptVault on any virtual machine, VPS (Ubuntu, Debian, macOS), or bare-metal server.

### Step 1: Clone the Repository
```bash
git clone https://github.com/SagarBiswas-MultiHAT/promptVault.git
cd promptVault
```

### Step 2: Install Dependencies
```bash
npm ci --omit=dev
```
*(If building on the same machine, run `npm ci` first to include Vite for building, then prune dev dependencies).*

### Step 3: Configure Production Environment
Create a `.env` file in the project root:
```ini
NODE_ENV=production
AI_PROXY_PORT=3002
ALLOWED_ORIGINS=https://promptvault.yourdomain.com
TRUST_PROXY_HOPS=1

# AI Keys
GEMINI_API_KEYS=AIzaSyA_KEY1,AIzaSyB_KEY2
GROQ_API_KEY=gsk_YOUR_GROQ_KEY

# Optional: Cloud Sync (Build time)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Build the Frontend Bundle
```bash
npm run build
```
This compiles the React 19 application into optimized, content-hashed static files inside the `dist/` directory.

### Step 5: Start the Production Server
```bash
npm run start
```
The server will start listening on port `3002`, serving both the application UI and the `/api/` endpoints.

### Step 6: Process Management with PM2
To keep PromptVault running continuously in the background and restart it automatically after reboots:
```bash
npm install -g pm2
pm2 start "npm run start" --name "promptvault"
pm2 save
pm2 startup
```

---

## 5. Method B: Docker Container Deployment

Docker provides isolated, repeatable deployments across any cloud provider (AWS, Google Cloud Run, DigitalOcean, Hetzner, Railway).

### Multi-Stage Dockerfile
Create a `Dockerfile` in the root of the repository:

```dockerfile
# Stage 1: Build the client assets
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig*.json ./

# Run as non-root user for container security
USER node

EXPOSE 3002
CMD ["node", "--import", "tsx", "server/index.ts"]
```

### Building & Running the Container
```bash
# Build the Docker image
docker build -t promptvault:latest .

# Run the container with environment variables
docker run -d \
  --name promptvault \
  -p 3002:3002 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS="https://promptvault.yourdomain.com" \
  -e GEMINI_API_KEYS="AIzaSy..." \
  -e GROQ_API_KEY="gsk_..." \
  --restart unless-stopped \
  promptvault:latest
```

---

## 6. Method C: Cloud Platform Quickstarts

### 6.1 Deploying on Railway
1. Fork or push your PromptVault repository to GitHub.
2. In Railway, click **New Project** and select **Deploy from GitHub repo**.
3. In **Variables**, add:
   - `NODE_ENV`: `production`
   - `ALLOWED_ORIGINS`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   - `GEMINI_API_KEYS`: your Gemini key
   - `GROQ_API_KEY`: your Groq key
   - `TRUST_PROXY_HOPS`: `1`
4. Set **Build Command**: `npm ci && npm run build`
5. Set **Start Command**: `npm run start`

### 6.2 Deploying on Render
1. Create a new **Web Service** pointing to your repository.
2. Set Environment to **Node**.
3. Set **Build Command**: `npm ci && npm run build`
4. Set **Start Command**: `npm run start`
5. Under **Advanced / Environment Variables**, add your keys and set `NODE_ENV=production`.
6. Set `ALLOWED_ORIGINS` to your Render service URL (`https://promptvault.onrender.com`).

---

## 7. Optional Database Setup: Supabase Cloud Sync

If your users wish to sync their encrypted vaults across mobile phones, laptops, and desktop computers, follow these steps:

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Navigate to **Project Settings > API** to copy your **Project URL** and **anon public key**.

### Step 2: Run the SQL Schema Migration
Open the Supabase **SQL Editor** and execute the schema located at [supabase/migrations/0001_vaults.sql](file:///o:/github/promptVault/supabase/migrations/0001_vaults.sql):

```sql
create table if not exists public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  schema_version text not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

create policy "Users can view own vault" on public.vaults for select using (auth.uid() = user_id);
create policy "Users can insert own vault" on public.vaults for insert with check (auth.uid() = user_id);
create policy "Users can update own vault" on public.vaults for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own vault" on public.vaults for delete using (auth.uid() = user_id);
```

### Step 3: Configure Authentication Providers
In the Supabase Dashboard, go to **Authentication > Providers**:
- Enable **Google** or **GitHub** OAuth.
- Add your domain to the **Redirect URLs** list:
  `https://promptvault.yourdomain.com`

---

## 8. Post-Deployment Verification & Smoke Testing

Run the following checks immediately after completing a deployment:

### 1. Health Probe Check
Send a GET request to verify server status, uptime, and cache initialization:
```bash
curl -i https://promptvault.yourdomain.com/api/health
```
**Expected Response**: HTTP `200 OK` with JSON containing `status: "ok"` and provider statuses.

### 2. Verify AI Provider Keys
Run the dedicated diagnostic verification tool from the server terminal:
```bash
npm run test:keys
```
**Expected Output**: Confirms that all configured Gemini and Groq keys authenticate successfully.

### 3. Verify Client Encryption
Open the live website in an Incognito window:
1. Create a new prompt named `Canary Test`.
2. Click the shield icon to enable vault protection (set a 6-digit PIN or passphrase).
3. Open browser Developer Tools (`F12`), go to **Application > Local Storage**, and inspect `prompt-vault-data`.
4. Verify that `ciphertext`, `iv`, and `salt` are present, and that `Canary Test` **does not appear in plaintext anywhere in storage**.

---

## 9. Rollback Procedures & Zero-Downtime Updates

### Rolling Back an Application Version
If a newly deployed code release exhibits unexpected issues:
1. **Container / PaaS Deployments**: Re-deploy the previous Git commit hash or container image tag in your PaaS dashboard (Render/Railway/Docker). The previous build will resume serving immediately.
2. **VPS Deployments**:
   ```bash
   git checkout <PREVIOUS_STABLE_TAG_OR_COMMIT>
   npm run build
   pm2 restart promptvault
   ```

### Database Compatibility During Rollbacks
The Supabase `public.vaults` table stores user libraries in a flexible `data jsonb` column. Because entity schemas are versioned and backward-compatible, rolling back application code does not require rolling back the database.

### Client Cache Busting Guarantee
PromptVault assets are built using Vite with deterministic SHA content hashes (e.g. `assets/index-Dk39Fj.js`).
- Files in `/assets/` are served with `Cache-Control: public, max-age=31536000, immutable`.
- The shell `index.html` is served with `Cache-Control: no-cache`.
- Whenever a new version is deployed, browsers fetch the new `index.html` on the next visit and immediately download the updated asset bundles without any stale cache conflicts.

---

## 10. Operational Troubleshooting Guide

### Error 1: "Refusing to start in production with the configuration above: ALLOWED_ORIGINS is empty."
- **Why It Happens**: In production (`NODE_ENV=production`), PromptVault refuses to boot if CORS origins are unspecified. Falling back to wildcard `*` is prohibited for security.
- **Fix**: Add `ALLOWED_ORIGINS=https://yourdomain.com` to your environment variables and restart.

### Error 2: "No API keys configured. The AI Librarian will not work."
- **Why It Happens**: Neither `GEMINI_API_KEYS` nor `GROQ_API_KEY` was detected in the environment.
- **Fix**: Verify your `.env` file or cloud environment variables. Provide at least one valid Gemini key or Groq key.

### Error 3: "All users are being rate-limited simultaneously."
- **Why It Happens**: `TRUST_PROXY_HOPS` is set to `0` while running behind a reverse proxy (Cloudflare, Render, Railway). As a result, the server sees the proxy's IP address for all incoming requests, pooling all users into one 30 req/min rate limit bucket.
- **Fix**: Set `TRUST_PROXY_HOPS=1` (or `2` if behind both Cloudflare and a PaaS proxy).

### Error 4: "Cloud sync shows Disconnected or Auth Fails."
- **Why It Happens**: `VITE_SUPABASE_URL` was not present during the `npm run build` step, or the user's redirect URL is missing from the Supabase dashboard.
- **Fix**: Rebuild the client using `npm run build` with `VITE_SUPABASE_URL` present in the environment, and check Supabase Redirect URLs.

---