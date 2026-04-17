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

DIFFICULTY_ORDER = [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.EXPERT]


def _lower_difficulties(difficulty: Difficulty) -> list[Difficulty]:
    """Returns difficulties lower than given one, from highest to lowest."""
    idx = DIFFICULTY_ORDER.index(difficulty)
    return list(reversed(DIFFICULTY_ORDER[:idx]))


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

    target_count = random.randint(4, 6)
    selected: list[ExerciseORM] = []
    excluded_ids: set[str] = set()

    if exercises:
        count = min(len(exercises), target_count)
        selected = random.sample(exercises, count)
        excluded_ids = {ex.id for ex in selected}

    # If fewer than 4 exercises at target difficulty, fill from lower difficulties
    if len(selected) < 4:
        for lower_diff in _lower_difficulties(req.difficulty):
            if len(selected) >= target_count:
                break
            needed = target_count - len(selected)
            fallback = (
                db.query(ExerciseORM)
                .filter(ExerciseORM.muscleGroup == req.muscleGroup.value)
                .filter(ExerciseORM.difficulty == lower_diff.value)
                .all()
            )
            fallback = [ex for ex in fallback if ex.id not in excluded_ids]
            if fallback:
                fill_count = min(len(fallback), needed)
                fill = random.sample(fallback, fill_count)
                selected.extend(fill)
                excluded_ids.update(ex.id for ex in fill)

    if not selected:
        raise ValueError("No exercises found for given filters")

    workout_exercises: list[WorkoutExercise] = []
    for ex in selected:
        workout_exercises.append(
            WorkoutExercise(
                workoutExerciseId=str(uuid.uuid4()),
                exerciseId=ex.id,
                name=ex.name,
                specificMuscle=ex.specificMuscle,
                equipment=ex.equipment,
                # Always use target difficulty sets/reps (more volume for lower-difficulty fillers)
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

    # If no candidates at same difficulty, fall back to lower difficulties in same muscle group
    if not candidates:
        for lower_diff in _lower_difficulties(Difficulty(current.difficulty)):
            fallback = (
                db.query(ExerciseORM)
                .filter(ExerciseORM.muscleGroup == current.muscleGroup)
                .filter(ExerciseORM.difficulty == lower_diff.value)
                .all()
            )
            fallback = [ex for ex in fallback if ex.id not in excluded_ids]
            if fallback:
                candidates = fallback
                break

    if not candidates:
        return None

    chosen = random.choice(candidates)
    # Use the original exercise's difficulty for sets/reps so lower-difficulty replacements
    # get more volume (making them harder to compensate)
    original_difficulty = Difficulty(current.difficulty)

    return ReplaceExerciseResponse(
        workoutExerciseId=req.workoutExerciseId,
        exerciseId=chosen.id,
        name=chosen.name,
        specificMuscle=chosen.specificMuscle,
        equipment=chosen.equipment,
        sets=_default_sets(original_difficulty, chosen.name),
        description=chosen.description,
    )
