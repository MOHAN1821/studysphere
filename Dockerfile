# Smart Student Productivity Assistant - single container, one public URL.
# Stage 1 builds the React frontend; stage 2 runs FastAPI which serves API + frontend.

# ---------- Stage 1: build frontend ----------
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY frontend/ ./
# Same-origin deployment: leave VITE_API_URL empty so the app calls relative /api.
ENV VITE_API_URL=""
RUN npx vite build

# ---------- Stage 2: runtime ----------
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./frontend/dist

# Persistent data lives in /data - mount a volume/disk here or data is lost on redeploy.
ENV DATA_DIR=/data \
    PORT=8080 \
    WEB_CONCURRENCY=2 \
    GUNICORN_TIMEOUT=120 \
    PYTHONUNBUFFERED=1
RUN mkdir -p /data && chmod -R 777 /data
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fs http://127.0.0.1:${PORT:-8080}/api/health || exit 1

CMD ["sh", "-c", "cd /app/backend && exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8080} --workers ${WEB_CONCURRENCY:-2} --timeout ${GUNICORN_TIMEOUT:-120} --forwarded-allow-ips='*' --access-logfile - --error-logfile -"]
