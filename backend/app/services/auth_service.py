import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.db import UserORM, UserSessionORM


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{h}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == h
    except Exception:
        return False


def register_user(db: Session, username: str, email: str, password: str) -> tuple["UserORM", str]:
    existing = db.query(UserORM).filter(
        (UserORM.email == email) | (UserORM.username == username)
    ).first()
    if existing:
        raise ValueError("Username or email already in use")

    user = UserORM(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        password_hash=_hash_password(password),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    db.flush()  # assign user.id without committing yet

    token = str(uuid.uuid4())
    db.add(UserSessionORM(token=token, user_id=user.id))
    db.commit()
    db.refresh(user)
    return user, token


def login_user(db: Session, email: str, password: str) -> tuple[str, "UserORM"]:
    user = db.query(UserORM).filter(UserORM.email == email).first()
    if not user or not _verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    token = str(uuid.uuid4())
    db.add(UserSessionORM(token=token, user_id=user.id))
    db.commit()
    return token, user


def get_current_user(db: Session, token: str) -> "UserORM | None":
    if not token:
        return None
    session = db.query(UserSessionORM).filter(UserSessionORM.token == token).first()
    if not session:
        return None
    return db.query(UserORM).filter(UserORM.id == session.user_id).first()


def logout_user(db: Session, token: str) -> None:
    db.query(UserSessionORM).filter(UserSessionORM.token == token).delete()
    db.commit()
