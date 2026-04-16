import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database.db import SessionLocal, ExerciseORM
from app.models.schemas import Difficulty, Exercise, MuscleGroup

load_dotenv()

router = APIRouter(prefix="/api", tags=["exercises"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/muscle-groups")
async def get_muscle_groups():
    return {
        "groups": [
            MuscleGroup.BACK.value,
            MuscleGroup.CHEST.value,
            MuscleGroup.LEGS.value,
            MuscleGroup.ABDOMINALS.value,
            MuscleGroup.GLUTES.value,
            MuscleGroup.SHOULDERS.value,
            MuscleGroup.ARMS.value,
        ]
    }


@router.get("/exercises")
async def list_exercises(
    muscleGroup: MuscleGroup | None = Query(default=None),
    difficulty: Difficulty | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(ExerciseORM)

    if muscleGroup is not None:
        query = query.filter(ExerciseORM.muscleGroup == muscleGroup.value)
    if difficulty is not None:
        query = query.filter(ExerciseORM.difficulty == difficulty.value)

    rows = query.all()

    return {
        "exercises": [
            Exercise(
                id=row.id,
                name=row.name,
                muscleGroup=row.muscleGroup,
                specificMuscle=row.specificMuscle,
                equipment=row.equipment,
                difficulty=row.difficulty,
                type=row.type,
            )
            for row in rows
        ]
    }


@router.get("/exercises/{exercise_id}/image")
async def get_exercise_image(exercise_id: str, db: Session = Depends(get_db)):
    row = db.query(ExerciseORM).filter(ExerciseORM.id == exercise_id).first()
    if row is None or not row.image:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=row.image.encode("utf-8"), media_type="image/svg+xml")
