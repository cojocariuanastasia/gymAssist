import json
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import SessionLocal, WorkoutLogORM
from app.models.schemas import GenerateWorkoutRequest, ReplaceExerciseRequest
from app.services.auth_service import get_current_user
from app.services.workout_service import generate_workout, replace_exercise

router = APIRouter(prefix="/api/workout", tags=["workout"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class LoggedExercise(BaseModel):
    exerciseId: str
    name: str
    equipment: str
    sets: int
    reps: int


class CompleteWorkoutRequest(BaseModel):
    muscleGroup: str
    difficulty: str
    exercises: list[LoggedExercise]


@router.post("/generate")
async def generate(req: GenerateWorkoutRequest, db: Session = Depends(get_db)):
    try:
        workout = generate_workout(db, req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return workout


@router.post("/{workout_id}/replace")
async def replace(
    workout_id: str,
    req: ReplaceExerciseRequest,
    db: Session = Depends(get_db),
):
    replacement = replace_exercise(db=db, req=req)
    if replacement is None:
        raise HTTPException(status_code=404, detail="No replacement exercise found.")
    return replacement


@router.post("/complete")
def complete_workout(
    req: CompleteWorkoutRequest,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    token = authorization.removeprefix("Bearer ").strip()
    user = get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    log = WorkoutLogORM(
        id=str(uuid.uuid4()),
        user_id=user.id,
        date=date.today().isoformat(),
        muscle_group=req.muscleGroup,
        difficulty=req.difficulty,
        exercises_json=json.dumps([
            {
                "exerciseId": e.exerciseId,
                "name": e.name,
                "equipment": e.equipment,
                "sets": e.sets,
                "reps": e.reps,
            }
            for e in req.exercises
        ]),
    )
    db.add(log)
    db.commit()
    return {"ok": True}
