import random
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.db import ExerciseORM
from app.models.schemas import (
    Difficulty,
    Exercise,
    GenerateWorkoutRequest,
    ReplaceExerciseRequest,
    ReplaceExerciseResponse,
    SetEntry,
    Workout,
    WorkoutExercise,
)


SETS_REPS_BY_DIFFICULTY: dict[Difficulty, tuple[int, int]] = {
    Difficulty.BEGINNER: (3, 8),
    Difficulty.INTERMEDIATE: (4, 10),
    Difficulty.EXPERT: (5, 12),
}


def _default_sets(difficulty: Difficulty) -> list[SetEntry]:
    sets, reps = SETS_REPS_BY_DIFFICULTY[difficulty]
    return [
        SetEntry(setNumber=i + 1, weight=None, reps=reps, completed=False)
        for i in range(sets)
    ]


def _orm_to_exercise(model: ExerciseORM) -> Exercise:
    return Exercise(
        id=model.id,
        name=model.name,
        muscleGroup=model.muscleGroup,  # type: ignore[arg-type]
        specificMuscle=model.specificMuscle,
        equipment=model.equipment,
        difficulty=model.difficulty,  # type: ignore[arg-type]
        type=model.type,
    )


def generate_workout(db: Session, req: GenerateWorkoutRequest) -> Workout:
    query = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.muscleGroup == req.muscleGroup.value)
        .filter(ExerciseORM.difficulty == req.difficulty.value)
        .filter(ExerciseORM.type == "Strength")
    )

    exercises = query.all()
    if not exercises:
        raise ValueError("No exercises found for given filters")

    count = min(len(exercises), random.randint(4, 6))
    selected = random.sample(exercises, count)

    workout_exercises: list[WorkoutExercise] = []

    for ex in selected:
        workout_exercises.append(
            WorkoutExercise(
                workoutExerciseId=str(uuid.uuid4()),
                exerciseId=ex.id,
                name=ex.name,
                equipment=ex.equipment,
                sets=_default_sets(req.difficulty),
            )
        )

    workout = Workout(
        id=str(uuid.uuid4()),
        muscleGroup=req.muscleGroup,
        difficulty=req.difficulty,
        exercises=workout_exercises,
        createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )

    return workout


def replace_exercise(
    db: Session,
    req: ReplaceExerciseRequest,
) -> ReplaceExerciseResponse | None:
    """Find a replacement exercise that targets the same specific muscle.

    We match on:
    - same specificMuscle (ex: "Lats", "Quadriceps"),
    - same difficulty,
    - type == "Strength",
    and we exclude the current exercise itself.
    """

    current = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.id == req.currentExerciseId)
        .first()
    )
    if current is None:
        return None

    query = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.specificMuscle == current.specificMuscle)
        .filter(ExerciseORM.difficulty == current.difficulty)
        .filter(ExerciseORM.type == "Strength")
        .filter(ExerciseORM.id != current.id)
    )

    candidates = query.all()
    if not candidates:
        return None

    chosen = random.choice(candidates)

    # Difficulty is taken from current exercise row; ensure it matches enum
    difficulty_enum = Difficulty(chosen.difficulty)
    sets = _default_sets(difficulty_enum)

    return ReplaceExerciseResponse(
        workoutExerciseId=req.workoutExerciseId,
        exerciseId=chosen.id,
        name=chosen.name,
        equipment=chosen.equipment,
        sets=sets,
    )
