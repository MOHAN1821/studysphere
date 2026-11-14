from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app import auth

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(default="", max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def _norm_email(email: str) -> str:
    return (email or "").strip().lower()


@router.post("/register")
def register(payload: RegisterRequest, response: Response):
    email = _norm_email(payload.email)
    user = auth.create_user(email, payload.password, payload.name)
    token = auth.create_access_token(user["id"], user["email"])
    auth.set_auth_cookie(response, token)
    return {"ok": True, "user": auth.public_user(user), "token": token}


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    email = _norm_email(str(payload.email))
    user = auth.get_user_by_email(email)
    if not user or not auth.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token(user["id"], user["email"])
    auth.set_auth_cookie(response, token)
    return {"ok": True, "user": auth.public_user(user), "token": token}


@router.post("/logout")
def logout(response: Response):
    auth.clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    user = auth.try_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": auth.public_user(user)}
