> **Public URL / always-live setup: see `DEPLOY_PUBLIC.md`** (instant tunnel, Render, or your own server).

# Quick Start & Deployment Notes

## Run locally (Windows)
1. Install Node.js 20+ and Python 3.11.
2. Open a terminal in this project folder.
3. Build frontend:
   `cd frontend`
   `npm ci`
   `npm run build`
4. Install backend:
   `cd ../backend`
   `python -m venv .venv`
   `.venv\\Scripts\\activate`
   `pip install -r requirements.txt`
5. Start API + built website:
   `uvicorn app.main:app --host 0.0.0.0 --port 8000`
6. Open `http://127.0.0.1:8000` on this PC. Other devices cannot use 127.0.0.1 to reach your PC.

## Public hosting
- The root `Dockerfile` and root `render.yaml` define a single-service Docker deployment.
- Push this folder to a private GitHub repository (do not upload `.env` or database files).
- In Render, create a Blueprint from that repository and configure the required secret variables in the Render dashboard.
- Render will assign the public HTTPS hostname. A permanent public URL cannot be created from this ZIP alone; it requires a cloud account and deployment.
- Set `AI_PROVIDER=gemini` and `AI_API_KEY` to a valid provider key in the hosting dashboard if AI chat is required. Never put API keys in source control.
- The current app uses SQLite. Render/container filesystems may be ephemeral; configure durable storage or migrate to managed PostgreSQL before relying on saved user data or multi-instance scaling.
- The project has not been load-tested. Do not promise 1,000/9,000 concurrent users until database, authentication, rate limits, autoscaling and load tests are completed.

## Offline limitations
The service worker caches the app shell and previously fetched GET data after the first successful online visit. First visit, AI generation, login/API writes and synchronization still require a network connection. Offline edits are not guaranteed to sync.

## What was updated in this delivery
- Removed bundled `node_modules`, stale build output, Vercel cache, Python bytecode and local `.env` secrets from the distributable ZIP.
- Removed an unused Vite plugin import that could stop Vite from loading when the plugin is not installed.
- Reworked the service worker to cache the current build's JS/CSS assets instead of hard-coded outdated hashed filenames.
- Removed the explicit Render `port` field; the Docker app binds to Render's injected `$PORT`.
- Preserved the existing React pages, FastAPI routes, and project source.

## Important existing limitations found during inspection
- No load test evidence for the requested high concurrent-user target.
- SQLite is used; multi-instance production requires durable shared database storage.
- `backend/.env` was not included in this delivery. AI API key is not configured in the provided environment; add it privately in the hosting dashboard.
