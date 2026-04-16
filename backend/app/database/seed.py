"""
Seed the database with exercise data.
Run with: python -m app.database.seed

Priority:
  1. Uses app/data/exercises.json if present (no API calls needed — safe to commit on git)
  2. Falls back to WorkoutAPI if the JSON is missing (requires WORKOUT_API_KEY in .env)
"""
import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database.db import engine, Base, ExerciseORM

load_dotenv()

API_URL = "https://api.workoutapi.com/exercises"
API_KEY = os.getenv("WORKOUT_API_KEY", "")
LOCAL_JSON = Path(__file__).resolve().parent.parent / "data" / "exercises.json"

MUSCLE_GROUP_MAP = {
    "BACK": "Back", "TRAPEZIUS": "Back",
    "CHEST": "Chest",
    "QUADRICEPS": "Legs", "HAMSTRINGS": "Legs", "CALVES": "Legs",
    "ADDUCTORS": "Legs", "ABDUCTORS": "Legs",
    "ABS": "Abdominals", "OBLIQUES": "Abdominals",
    "GLUTES": "Glutes",
    "SHOULDERS": "Shoulders",
    "BICEPS": "Arms", "TRICEPS": "Arms", "FOREARMS": "Arms",
}

CATEGORY_EQUIPMENT_MAP = {
    "BODY_WEIGHT": "Bodyweight",
    "FREE_WEIGHT": "Free Weight",
    "CABLE": "Cable",
    "MACHINE": "Machine",
}

TYPE_MAP = {
    "POLYARTICULAR": "Compound",
    "ISOLATION": "Isolation",
}


# ── Local JSON path ────────────────────────────────────────────────────────────

def _load_from_json() -> list[dict]:
    with LOCAL_JSON.open(encoding="utf-8") as f:
        return json.load(f)


def _seed_from_json(session: Session, records: list[dict]) -> int:
    """Insert pre-processed records directly — no mapping needed."""
    for rec in records:
        session.add(ExerciseORM(**rec))
    return len(records)


# ── WorkoutAPI path ────────────────────────────────────────────────────────────

def _assign_difficulty(category_codes: list[str], type_codes: list[str]) -> str:
    has_bodyweight = "BODY_WEIGHT" in category_codes
    has_free_weight = "FREE_WEIGHT" in category_codes
    has_machine = "MACHINE" in category_codes
    has_cable = "CABLE" in category_codes
    is_compound = "POLYARTICULAR" in type_codes

    if has_bodyweight and not has_free_weight:
        return "Beginner"
    if is_compound and (has_free_weight or has_machine or has_cable):
        return "Expert"
    return "Intermediate"


def _fetch_exercises() -> list[dict]:
    req = urllib.request.Request(
        API_URL,
        headers={"x-api-key": API_KEY, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def _fetch_image(exercise_id: str) -> str | None:
    url = f"https://api.workoutapi.com/exercises/{exercise_id}/image"
    req = urllib.request.Request(url, headers={"x-api-key": API_KEY})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError:
        return None


def _fetch_all_images_parallel(exercise_ids: list[str]) -> dict[str, str | None]:
    results: dict[str, str | None] = {}
    total = len(exercise_ids)
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(_fetch_image, eid): eid for eid in exercise_ids}
        done = 0
        for future in as_completed(futures):
            done += 1
            eid = futures[future]
            results[eid] = future.result()
            print(f"  images: {done}/{total}", end="\r", flush=True)
    print()
    return results


def _seed_from_api(session: Session) -> int:
    if not API_KEY:
        raise RuntimeError("WORKOUT_API_KEY not set in .env and exercises.json not found.")

    exercises = _fetch_exercises()
    print(f"Fetched {len(exercises)} exercises from WorkoutAPI")

    valid = []
    for ex in exercises:
        primary = ex.get("primaryMuscles", [])
        if not primary:
            continue
        code = primary[0]["code"]
        group = MUSCLE_GROUP_MAP.get(code)
        if group is None:
            print(f"  Skipping unknown muscle: {code}")
            continue
        valid.append((ex, group))

    print(f"Fetching {len(valid)} images in parallel...")
    images = _fetch_all_images_parallel([ex["id"] for ex, _ in valid])

    for ex, muscle_group in valid:
        category_codes = [c["code"] for c in ex.get("categories", [])]
        type_codes = [t["code"] for t in ex.get("types", [])]
        equipment = CATEGORY_EQUIPMENT_MAP.get(category_codes[0], "Other") if category_codes else "Other"
        ex_type = TYPE_MAP.get(type_codes[0], "Isolation") if type_codes else "Isolation"

        session.add(ExerciseORM(
            id=ex["id"],
            name=ex["name"],
            muscleGroup=muscle_group,
            specificMuscle=ex["primaryMuscles"][0]["name"],
            equipment=equipment,
            difficulty=_assign_difficulty(category_codes, type_codes),
            type=ex_type,
            description=ex.get("description", ""),
            image=images.get(ex["id"]),
        ))

    return len(valid)


# ── Entry point ────────────────────────────────────────────────────────────────

def seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = Session(bind=engine)
    try:
        if LOCAL_JSON.exists():
            print(f"Using local exercises.json...")
            records = _load_from_json()
            count = _seed_from_json(session, records)
        else:
            print("exercises.json not found — fetching from WorkoutAPI...")
            count = _seed_from_api(session)

        session.commit()
        print(f"Seed completed: {count} exercises stored.")
    finally:
        session.close()


if __name__ == "__main__":
    seed()
