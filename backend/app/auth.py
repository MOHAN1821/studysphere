import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, Request, Response
from passlib.hash import pbkdf2_sha256

from app.database import get_db

def _load_secret_key() -> str:
    """Return a signing key that is identical across all workers and restarts.

    1. Use SECRET_KEY from the environment (recommended).
    2. Otherwise create one once and store it next to the database so every
       gunicorn worker (and every restart) uses the same key. A random key per
       process would randomly log users out when running multiple workers.
    """
    env_key = (os.getenv("SECRET_KEY") or "").strip()
    if env_key:
        return env_key
    from app.database import DATA_DIR
    key_file = os.path.join(DATA_DIR, ".secret_key")
    for _ in range(5):
        try:
            with open(key_file, "r", encoding="utf-8") as fh:
                existing = fh.read().strip()
                if existing:
                    return existing
        except FileNotFoundError:
            pass
        try:
            fd = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(secrets.token_urlsafe(48))
        except FileExistsError:
            time.sleep(0.1)  # another worker is writing it; read it next loop
        except OSError:
            break
    return secrets.token_urlsafe(48)  # last resort (read-only filesystem)


SECRET_KEY = _load_secret_key()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or "10080")  # 7 days
COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME") or "ssp_token"
COOKIE_SECURE = (os.getenv("COOKIE_SECURE") or "false").strip().lower() in ("1", "true", "yes")
COOKIE_SAMESITE = (os.getenv("COOKIE_SAMESITE") or "lax").strip().lower()
if COOKIE_SAMESITE not in ("lax", "strict", "none"):
    COOKIE_SAMESITE = "lax"


def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return pbkdf2_sha256.verify(password, hashed)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_access_token(user_id: int, email: str) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
    header = {"alg": "HS256", "typ": "JWT"}
    h = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    p = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{h}.{p}".encode()
    sig = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        h, p, s = parts
        signing_input = f"{h}.{p}".encode()
        expected = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(s)):
            return None
        payload = json.loads(_b64url_decode(p))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def get_user_by_email(email: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email)=lower(?)", ((email or "").strip(),)
        ).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        return dict(row) if row else None


def create_user(email: str, password: str, name: str = ""):
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Valid email is required")
    if not password or len(password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    now = datetime.utcnow().isoformat()
    pwd = hash_password(password)
    display = (name or email.split("@")[0]).strip()[:120] or "Student"
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, name, created_at, updated_at) VALUES (?,?,?,?,?)",
            (email, pwd, display, now, now),
        )
        conn.commit()
        uid = cur.lastrowid
        conn.execute(
            "INSERT OR IGNORE INTO user_settings (user_id, data, updated_at) VALUES (?,?,?)",
            (uid, "{}", now),
        )
        conn.commit()
    return get_user_by_id(uid)


def public_user(user: dict) -> dict:
    if not user:
        return {}
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or "",
        "created_at": user.get("created_at"),
    }


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")


def get_token_from_request(request: Request) -> Optional[str]:
    authh = request.headers.get("Authorization") or ""
    if authh.lower().startswith("bearer "):
        return authh.split(" ", 1)[1].strip()
    return request.cookies.get(COOKIE_NAME)


def get_current_user(request: Request):
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    try:
        uid = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = get_user_by_id(uid)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def try_current_user(request: Request):
    try:
        return get_current_user(request)
    except HTTPException:
        return None
