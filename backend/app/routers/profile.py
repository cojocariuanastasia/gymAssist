import json
import random
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import ExerciseORM, SessionLocal, WorkoutLogORM
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


class MockBackWorkoutsRequest(BaseModel):
    count: int = 4
    token: str | None = None


# class DeleteTodaysWorkoutsRequest(BaseModel):
#     token: str | None = None


def _build_mock_back_exercises(back_exercises: list[ExerciseORM], seed_index: int) -> list[dict]:
    sample_size = min(3, len(back_exercises))
    chosen = random.sample(back_exercises, sample_size)
    exercises = []
    for index, exercise in enumerate(chosen):
        exercises.append(
            {
                "exerciseId": exercise.id,
                "name": exercise.name,
                "equipment": exercise.equipment,
                "sets": 3 + (index % 2),
                "reps": 8 + (seed_index % 3) * 2,
                "weight": 35 + seed_index * 5 + index * 2,
            }
        )
    return exercises


def _build_workout_payload(log: WorkoutLogORM, db: Session) -> dict:
    exercises = json.loads(log.exercises_json)
    reconstructed = []

    for entry in exercises:
        exercise = db.query(ExerciseORM).filter(ExerciseORM.id == entry.get("exerciseId")).first()
        set_count = int(entry.get("sets", 0) or 0)
        reps = entry.get("reps")
        weight = entry.get("weight")

        reconstructed.append(
            {
                "workoutExerciseId": str(uuid.uuid4()),
                "exerciseId": entry.get("exerciseId"),
                "name": entry.get("name"),
                "specificMuscle": exercise.specificMuscle if exercise is not None else "",
                "equipment": entry.get("equipment", exercise.equipment if exercise is not None else ""),
                "sets": [
                    {
                        "setNumber": i + 1,
                        "weight": weight,
                        "reps": reps,
                        "completed": False,
                    }
                    for i in range(set_count)
                ],
                "description": exercise.description if exercise is not None else None,
            }
        )

    return {
        "id": str(uuid.uuid4()),
        "muscleGroup": log.muscle_group,
        "difficulty": log.difficulty,
        "exercises": reconstructed,
        "createdAt": f"{log.date}T00:00:00Z",
    }


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


@router.post("/mock-workouts/back")
def seed_mock_back_workouts(
    req: MockBackWorkoutsRequest,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    token = _extract_token(authorization) or (req.token or "").strip()
    user = get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized. Pass the token in the Authorization header or in the request body as token.")

    if req.count < 1:
        raise HTTPException(status_code=400, detail="count must be at least 1")

    back_exercises = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.muscleGroup == "Back")
        .all()
    )
    if len(back_exercises) < 3:
        raise HTTPException(status_code=404, detail="Not enough back exercises found to seed mock workouts.")

    offsets = [2, 5, 8, 12, 15, 19, 23, 28]
    inserted = 0

    for index, days_ago in enumerate(offsets[: req.count]):
        workout_date = (date.today() - timedelta(days=days_ago)).isoformat()
        already_exists = (
            db.query(WorkoutLogORM)
            .filter(
                WorkoutLogORM.user_id == user.id,
                WorkoutLogORM.date == workout_date,
                WorkoutLogORM.muscle_group == "Back",
            )
            .first()
        )
        if already_exists:
            continue

        log = WorkoutLogORM(
            id=str(uuid.uuid4()),
            user_id=user.id,
            date=workout_date,
            muscle_group="Back",
            difficulty=random.choice(["Beginner", "Intermediate", "Expert"]),
            exercises_json=json.dumps(_build_mock_back_exercises(back_exercises, index)),
        )
        db.add(log)
        inserted += 1

    db.commit()
    return {"ok": True, "inserted": inserted}


# @router.delete("/workouts/today")
# def delete_todays_workouts(
#     req: DeleteTodaysWorkoutsRequest,
#     authorization: str = Header(default=""),
#     db: Session = Depends(get_db),
# ):
#     token = _extract_token(authorization) or (req.token or "").strip()
#     user = get_current_user(db, token)
#     if not user:
#         raise HTTPException(status_code=401, detail="Unauthorized. Pass the token in the Authorization header or in the request body as token.")

#     today = date.today().isoformat()
#     deleted = (
#         db.query(WorkoutLogORM)
#         .filter(WorkoutLogORM.user_id == user.id, WorkoutLogORM.date == today)
#         .delete(synchronize_session=False)
#     )
#     db.commit()

#     return {"ok": True, "deleted": deleted, "date": today}


@router.get("/last-workout/{muscle_group}")
def get_last_workout_for_muscle(
    muscle_group: str,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    user = get_current_user(db, _extract_token(authorization))
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    log = (
        db.query(WorkoutLogORM)
        .filter(WorkoutLogORM.user_id == user.id, WorkoutLogORM.muscle_group == muscle_group)
        .order_by(WorkoutLogORM.date.desc(), WorkoutLogORM.id.desc())
        .first()
    )

    if log is None:
        raise HTTPException(status_code=404, detail="No previous workout found for this muscle group.")

    return _build_workout_payload(log, db)


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
