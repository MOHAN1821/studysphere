# Smart Student Productivity Assistant (StudySphere)

React + Vite (TypeScript) frontend and Python FastAPI backend. Existing project preserved (UI, pages, features) — no rebuild from scratch.

## 1) Project analysis (current state)

- **Frontend:** `frontend/` — React 18, Vite, TypeScript, Tailwind. Routes/pages: Dashboard (`/`), AI Chat (`/chat`), AI Study Assistant (`/study-assistant`), Tasks (`/tasks`), Study Planner (`/planner`), Notes & Documents (`/notes`), Learning Hub (`/learning`), Calendar (`/calendar`), Analytics (`/analytics`), Focus (`/focus`), Settings (`/settings`), NotFound.
- **Backend:** `backend/app/` — FastAPI app (`main.py`), SQLite DB `backend/campus_copilot.db` (`database.py`), CRUD/schemas/routes under `/api/*` (`tasks, analytics, ai, planner, notes, learning, calendar, goals, achievements, notifications, focus, settings`), SPA fallback serves `frontend/dist`.
- **API client:** `frontend/src/services/api.ts` uses `VITE_API_URL` when set, otherwise relative paths (same-origin `/api`) — suitable for single-origin production.
- **Auth/login/registration:** **not implemented** in the current codebase (no auth routes, no user model, no login/register UI). All existing functionality preserved as-is.
- **Data store:** SQLite (single file). Not designed for multi-instance HA, durable managed backups, or high-concurrency production traffic without migration.
- **Local:** backend can run at `http://127.0.0.1:8000` (dev only). A prebuilt `frontend/dist` is served by FastAPI when present.

## 2) Deployment-hardening changes implemented (in-repo)

- **CORS (production-ready):** `backend/app/main.py` reads `CORS_ORIGINS` (comma-separated HTTPS origins). If unset, defaults to `*` for local/dev only — **set explicit origins in production**.
- **Health/readiness:** `GET /api/health` and `GET /api/ready`.
- **Production process model:** Docker runs **Gunicorn + Uvicorn workers**; tunables `WEB_CONCURRENCY`, `GUNICORN_TIMEOUT`. `gunicorn` added to `backend/requirements.txt`.
- **Config cleaned:** root `Dockerfile` updated for multi-worker serving; root `render.yaml` adds `healthCheckPath`, removes hardcoded public URL, expects `VITE_API_URL`/`CORS_ORIGINS` to be set to the **actual** public URL; `frontend/vercel.json` no longer hardcodes `VITE_API_URL`; `frontend/.env.example` and `backend/.env.example` documented.
- **No localhost in production config:** production must use your real public HTTPS domain/origin via env vars/build config (not `127.0.0.1`/`localhost`).
- **Secrets:** env examples contain no real keys; `.gitignore`/`.dockerignore` exclude env/DB artifacts. **Never commit API keys, tokens, or DB credentials.**

## 3) Permanent public hosting (one HTTPS URL, no tunnels, works when your PC is off)

> I cannot create cloud accounts, purchase domains, or access your hosting dashboard from this workspace, so **I cannot provide a real final frontend URL or backend API URL**. After you deploy using the steps below, your platform will assign/provision the permanent public HTTPS URL(s). Do **not** use ngrok or temporary tunnels.

### Recommended: single Docker web service (one origin = frontend + `/api`)
This is the simplest path to **one permanent public HTTPS URL** usable from any modern browser/device worldwide.

**Target platforms (examples):** Render Web Service, Railway, Fly.io, Azure App Service/Container Apps, AWS App Runner/ECS behind ALB, GCP Cloud Run. Requirements: Docker support, always-on instance(s), managed HTTPS/TLS, stable public domain.

#### Steps (Render Docker blueprint example)
1. **Push** this repository to GitHub (verify no secrets committed).
2. In **Render**: New → **Blueprint** (or Web Service) using root `render.yaml` and `Dockerfile`.
3. **Plan:** choose an always-on/production plan (free tiers may sleep; app must be available when your PC is off).
4. **Environment variables (platform dashboard, not in git):**
   - `VITE_API_URL` = your actual public HTTPS origin, e.g. `https://<your-service>.onrender.com` (or your custom domain). *Note:* Vite embeds this at **build time**; if you change domain/API base, rebuild/redeploy.
   - `CORS_ORIGINS` = same public HTTPS origin(s), comma-separated (e.g. `https://<your-service>.onrender.com`).
   - `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` only if using a real AI provider (store key as a secret).
   - `WEB_CONCURRENCY`, `GUNICORN_TIMEOUT` tuned to instance CPU/RAM.
5. **Health check:** `/api/health`.
6. **Deploy** and confirm the platform-issued permanent `https://...` URL loads over HTTPS. Optionally attach a **custom domain** + managed TLS certificate, then update `VITE_API_URL`/`CORS_ORIGINS` to that domain and redeploy.
7. **Result:** one public frontend URL; backend API is available at the same origin under `/api` (e.g. `https://<your-domain>/api/health`).

#### Alternative: split deploy (Vercel frontend + separate backend)
1. Deploy backend as a public HTTPS service (Docker/Python) binding `$PORT`; set `CORS_ORIGINS` to the exact frontend HTTPS origin(s).
2. Deploy `frontend/` to Vercel with SPA rewrites (`frontend/vercel.json`); set **build-time** `VITE_API_URL=https://<your-backend-public-domain>` and redeploy on change.
3. Use always-on hosting + managed TLS for both origins.

**Important:** `frontend` and `backend` must use the real production HTTPS URLs in production — never `localhost`/`127.0.0.1`.

## 4) Backend/API, security, and data (facts & required production work)

- **CORS:** restrict `CORS_ORIGINS` to trusted HTTPS origins in production.
- **HTTPS everywhere:** terminate TLS at the platform/load balancer/custom domain (managed certs). Do not serve public traffic over plain HTTP.
- **Secrets/auth tokens:** no app-level auth tokens exist today; keep all provider keys/credentials in secret env vars only.
- **Database:** current DB is **SQLite** (`backend/campus_copilot.db`). This is **not production-grade** for public multi-user, multi-instance, or durable-at-scale workloads. For a real public deployment you must: migrate to managed PostgreSQL, add migrations/backups/retention, secure credentials, and (if user accounts/data are added) enforce isolation and access control. **No existing user records** are present beyond local app data; preserve/migrate any data carefully and back up before changes.
- **SQLite persistence on containers:** many platforms have ephemeral disks; without a persistent volume or managed DB, data can be lost on redeploy/restart — plan storage accordingly.
- **Rate limiting/caching/optimizations:** not fully implemented for high scale in this codebase; add reverse-proxy/WAF rate limits, app-level limits, caching (e.g. Redis), and DB/query tuning as part of production hardening.

## 5) Concurrency & capacity (not claimed)

- **Requested:** support at least 1,000 simultaneous users, load balancing, multiple workers, caching/DB optimization, autoscaling, and load testing at 100/500/1,000 concurrent users.
- **Status:** Docker now supports multiple Gunicorn workers (tunable). However, **1,000 concurrent users are NOT supported/verified by this change alone**. SQLite, single-node defaults, lack of managed DB/cache/LB/autoscaling config, and absence of executed load tests mean capacity is unproven.
- **To make/validate claims:** deploy to production-grade infra (managed PostgreSQL, connection pooling, Redis/cache where appropriate, horizontal instances behind HTTPS load balancer, autoscaling, observability), then run staged load tests (e.g. k6/Locust/JMeter) at **100, 500, and 1,000 concurrent users** and report latency (p50/p95/p99), error rate, throughput, and instance/DB sizing. **Do not claim 1,000-user capacity without evidence.**

## 6) Mobile/desktop compatibility (current + verification)

- **Implemented/present:** responsive viewport meta (`frontend/index.html`), Tailwind-based responsive UI, SPA routing. Designed for modern browsers (Chrome, Safari, Firefox, Edge) across phones/tablets/laptops/desktops.
- **Action required:** test the **deployed public HTTPS URL** on Android (mobile data), iPhone, Windows, macOS, Linux, and tablets; verify navigation/buttons, forms, all pages/features, and API calls on each. Optimize further based on real-device findings.

## 7) Final deployment verification checklist (run after your deploy)

1. Open the application from your computer via the public HTTPS URL.
2. Open the same URL from another laptop/network.
3. Open from an Android phone using mobile data.
4. Open from an iPhone.
5. Test all existing flows (and login/registration if/when implemented) on multiple devices.
6. Verify all API calls work (e.g. `/api/health`, tasks/notes/AI/etc.).
7. Verify access works with your personal computer switched off.
8. Verify 1,000 concurrent-user capacity **only** through executed load tests (100/500/1,000) with recorded results.

## 8) Local run & build

```bash
# Frontend build
cd frontend
npm install
npm run build

# Backend (serves frontend/dist + API) — local dev
cd ../backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# open http://127.0.0.1:8000 (local only)

# Docker (production-like)
docker build -t studysphere .
docker run --rm -p 8000:8000 -e CORS_ORIGINS=http://127.0.0.1:8000 studysphere
```

Frontend dev server: `cd frontend && npm run dev` (proxies `/api` to `127.0.0.1:8000`).

## 9) Deliverables status (honest)

- **Final frontend URL / backend API URL:** **not available from this workspace** — deploy to obtain your permanent public HTTPS URL(s) (single-origin recommended: same URL serves UI and `/api`).
- **Complete deployment instructions:** provided above (single-origin Docker recommended, split option included), with env/TLS/CORS/build-time notes.
- **Preserved functionality:** existing UI/pages/features and API behavior maintained; no rebuild from scratch.
- **Not provided/verified here:** real public deployment, real domain/TLS issuance, managed production DB/backups, auth system (not present), autoscaling/LB infrastructure, or 1,000-user load-test evidence.
