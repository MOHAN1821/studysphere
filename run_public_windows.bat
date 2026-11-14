@echo off
REM ============================================================
REM  Instant PUBLIC https URL for StudySphere, from this Windows PC
REM  Works on any device/network. Live only while this PC is on
REM  and this window stays open. For 24/7 use, see DEPLOY_PUBLIC.md
REM ============================================================
setlocal
cd /d "%~dp0"

where python >nul 2>nul || (echo Python 3.11+ is required & pause & exit /b 1)
where npm    >nul 2>nul || (echo Node.js 20+ is required & pause & exit /b 1)
where cloudflared >nul 2>nul || (
  echo Installing Cloudflare Tunnel ^(free, no account needed^)...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  echo Close this window and run the script again so cloudflared is on PATH.
  pause & exit /b 0
)

if not exist frontend\dist\index.html (
  echo Building frontend...
  pushd frontend & call npm ci & call npm run build & popd
)

if not exist backend\.venv (
  python -m venv backend\.venv
  call backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
)

set COOKIE_SECURE=true
set DATA_DIR=%~dp0data
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

echo Starting server on port 8080...
start "StudySphere server" /d backend cmd /k ".venv\Scripts\python start_server.py"
timeout /t 6 >nul

echo.
echo Your public URL appears below as  https://xxxx.trycloudflare.com
echo Share that link - it works on phones, tablets and laptops anywhere.
echo.
cloudflared tunnel --url http://localhost:8080
