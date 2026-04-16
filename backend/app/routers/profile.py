import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database.db import SessionLocal, WorkoutLogORM
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _extract_token(authorization: str) -> str:
    return authorization.removeprefix("Bearer ").strip()


def _calculate_streak(date_set: set[str]) -> int:
    streak = 0
    check = date.today()
    if check.isoformat() not in date_set:
        check -= timedelta(days=1)
    while check.isoformat() in date_set:
        streak += 1
        check -= timedelta(days=1)
    return streak


@router.get("")
def get_profile(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    user = get_current_user(db, _extract_token(authorization))
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    logs = db.query(WorkoutLogORM).filter(WorkoutLogORM.user_id == user.id).all()
    dates = sorted({log.date for log in logs})
    date_set = set(dates)

    this_month = date.today().strftime("%Y-%m")

    return {
        "username": user.username,
        "email": user.email,
        "streak": _calculate_streak(date_set),
        "days_this_month": sum(1 for d in dates if d.startswith(this_month)),
        "total_days": len(dates),
        "workout_dates": dates,
    }


@router.get("/workouts/{workout_date}")
def get_workouts_for_date(
    workout_date: str,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, _extract_token(authorization))
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    logs = (
        db.query(WorkoutLogORM)
        .filter(WorkoutLogORM.user_id == user.id, WorkoutLogORM.date == workout_date)
        .all()
    )

    return [
        {
            "id": log.id,
            "muscle_group": log.muscle_group,
            "difficulty": log.difficulty,
            "exercises": json.loads(log.exercises_json),
        }
        for log in logs
    ]
