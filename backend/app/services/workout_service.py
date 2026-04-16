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

TIME_BASED_EXERCISES = {"plank", "lateral plank", "wall sit"}
SETS_SECONDS_BY_DIFFICULTY: dict[Difficulty, tuple[int, int]] = {
    Difficulty.BEGINNER: (3, 20),
    Difficulty.INTERMEDIATE: (4, 30),
    Difficulty.EXPERT: (5, 45),
}


def _default_sets(difficulty: Difficulty, exercise_name: str) -> list[SetEntry]:
    sets, metric = (
        SETS_SECONDS_BY_DIFFICULTY[difficulty]
        if exercise_name.strip().lower() in TIME_BASED_EXERCISES
        else SETS_REPS_BY_DIFFICULTY[difficulty]
    )
    return [
        SetEntry(setNumber=i + 1, weight=None, reps=metric, completed=False)
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
    exercises = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.muscleGroup == req.muscleGroup.value)
        .filter(ExerciseORM.difficulty == req.difficulty.value)
        .all()
    )

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
                specificMuscle=ex.specificMuscle,
                equipment=ex.equipment,
                sets=_default_sets(req.difficulty, ex.name),
                description=ex.description,
            )
        )

    return Workout(
        id=str(uuid.uuid4()),
        muscleGroup=req.muscleGroup,
        difficulty=req.difficulty,
        exercises=workout_exercises,
        createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )


def replace_exercise(
    db: Session,
    req: ReplaceExerciseRequest,
) -> ReplaceExerciseResponse | None:
    excluded_ids = set(req.excludeExerciseIds or [])
    excluded_ids.add(req.currentExerciseId)

    current = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.id == req.currentExerciseId)
        .first()
    )
    if current is None:
        return None

    candidates = (
        db.query(ExerciseORM)
        .filter(ExerciseORM.specificMuscle == current.specificMuscle)
        .filter(ExerciseORM.difficulty == current.difficulty)
        .filter(ExerciseORM.id != current.id)
        .all()
    )

    if excluded_ids:
        candidates = [candidate for candidate in candidates if candidate.id not in excluded_ids]

    if not candidates:
        return None

    chosen = random.choice(candidates)
    difficulty_enum = Difficulty(chosen.difficulty)

    return ReplaceExerciseResponse(
        workoutExerciseId=req.workoutExerciseId,
        exerciseId=chosen.id,
        name=chosen.name,
        specificMuscle=chosen.specificMuscle,
        equipment=chosen.equipment,
        sets=_default_sets(difficulty_enum, chosen.name),
        description=chosen.description,
    )
