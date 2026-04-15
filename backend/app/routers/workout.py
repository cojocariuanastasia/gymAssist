from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.models.schemas import GenerateWorkoutRequest, ReplaceExerciseRequest
from app.services.workout_service import generate_workout, replace_exercise

router = APIRouter(prefix="/api/workout", tags=["workout"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate")
async def generate(req: GenerateWorkoutRequest, db: Session = Depends(get_db)):
    workout = generate_workout(db, req)
    return workout


@router.post("/{workout_id}/replace")
async def replace(
    workout_id: str,
    req: ReplaceExerciseRequest,
    db: Session = Depends(get_db),
):

    replacement = replace_exercise(db=db, req=req)

    if replacement is None:
        raise HTTPException(status_code=404, detail="No replacement exercise found for this muscle group.")

    return replacement
