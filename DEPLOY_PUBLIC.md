# Make StudySphere public - any device, any network

The app is a **single server**: FastAPI serves both the API (`/api/...`) and the built React site,
so you only need **one public URL**. Pick ONE option below.

| Option | URL type | Stays live when your PC is off? | Cost | Time |
|---|---|---|---|---|
| **A. Instant tunnel** | `https://xxxx.trycloudflare.com` (changes each run) | No | Free | 2 min |
| **B. Render (recommended)** | `https://<name>.onrender.com` permanent | **Yes, 24/7** | ~$7/mo (needed for always-on + saved data) | 10 min |
| **C. Your own server / Azure VM** | `http://<server-ip>:8080` or your domain | **Yes, 24/7** | VM cost | 15 min |

---
## A. Instant public URL from your own PC (demo / presentation)
Windows: double-click **`run_public_windows.bat`** (first run installs the free Cloudflare Tunnel, then run it again).
Mac/Linux: `./run_public.sh`

The window prints a link like `https://random-words.trycloudflare.com`. Open it from any phone/laptop.
It works only while that window is open and the PC is on and online.

## B. Permanent URL on Render (recommended for "always live")
1. Create a **private GitHub repo** and push this folder (`.env`, `data/`, `*.db` are already git-ignored).
2. Render dashboard -> **New -> Blueprint** -> select the repo. It reads `render.yaml`.
3. When asked, paste **`AI_API_KEY`** (your Claude API key from console.anthropic.com). `SECRET_KEY` is auto-generated.
4. Click **Apply**. After the build (~5-8 min) Render shows your permanent link:
   `https://smart-student-productivity-assistant.onrender.com`
5. Check `https://<your-link>/api/health` -> should show `"status":"ok","frontend_served":true`.

Why the paid plan: the free plan sleeps after 15 minutes idle and has no persistent disk, so user
accounts/tasks would be deleted on every restart. `render.yaml` attaches a 1 GB disk at `/var/data`.
Optional custom domain: Render -> Settings -> Custom Domains.

## C. Your own server (Azure VM, AWS, DigitalOcean, college server...)
```bash
# on a Linux VM with Docker installed
git clone <your-repo> && cd <repo>
./deploy.sh              # builds, starts, health-checks, prints http://<public-ip>:8080
```
* Open **TCP 8080** in the cloud firewall (Azure: Network Security Group inbound rule).
* For HTTPS + your own domain, put Caddy in front (automatic certificates):
  ```
  # /etc/caddy/Caddyfile
  studysphere.yourdomain.com {
      reverse_proxy localhost:8080
  }
  ```
  then set `COOKIE_SECURE=true` in `.env` and `docker compose up -d`.
* Data is stored in the Docker volume `studysphere-data` (survives restarts/rebuilds).
  Back it up: `docker run --rm -v studysphere-data:/d -v $PWD:/b alpine tar czf /b/backup.tgz -C /d .`

---
## What changed in this update (bugs that would have broken a public launch)
1. **`passlib` was missing from `requirements.txt`** -> the server crashed on start in Docker. Added.
2. **Login secret was random per process** -> with 2 workers users got randomly logged out. Now taken from
   `SECRET_KEY`, or saved once in the data folder and shared by all workers.
3. **Database was inside the app folder** -> wiped on every cloud redeploy. Now stored in `DATA_DIR`
   (persistent disk/volume) with WAL mode for safe multi-worker access.
4. **Fake hard-coded IP `103.21.244.0` removed** from `deploy.sh` / `start_server.py` (it was not your server).
5. Multi-stage Dockerfile (smaller image, healthcheck, proxy headers for HTTPS), fixed `docker-compose.yml`
   (it bind-mounted the code and had no data volume), fixed `render.yaml` (disk, secure cookies),
   removed the conflicting `backend/render.yaml`.

## AI model
The chat/study assistant runs on **Claude** (`AI_PROVIDER=anthropic`, model `claude-sonnet-5-5`). Only `AI_API_KEY` is needed. Change the model with `AI_MODEL` (e.g. `claude-haiku-5-5` for lower cost).

## Honest limits
* A link can only be "live 24/7" if the code runs on a machine that is always on - that is what B and C do.
  No ZIP can create the URL by itself; the URL appears once you deploy it to an account you control.
* SQLite on one disk is fine for a class/demo/portfolio. For thousands of simultaneous users, migrate to
  managed PostgreSQL (Azure Database for PostgreSQL) and load-test first.
* Offline mode only works after the first online visit; AI chat, login and writes need internet.
* Never put `AI_API_KEY` in the code or GitHub - only in the host's environment settings.
