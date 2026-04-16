from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.services.auth_service import register_user, login_user, logout_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user, token = register_user(db, req.username, req.email, req.password)
        return {"token": token, "username": user.username}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        token, user = login_user(db, req.email, req.password)
        return {"token": token, "username": user.username}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
def logout(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    logout_user(db, token)
    return {"ok": True}
