from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from pydantic import BaseModel

from app.api.routes import router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
async def login(payload: LoginRequest):
    roles = {"admin": "Admin", "ops": "Ops Manager", "acct": "Accountant"}
    role = roles.get(payload.username)
    if not role or payload.password != "password":
        raise HTTPException(status_code=401, detail="Invalid credentials")
    exp = datetime.now(tz=timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    token = jwt.encode({"sub": payload.username, "role": role, "exp": exp}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return {"access_token": token, "token_type": "bearer", "role": role}


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(router)
