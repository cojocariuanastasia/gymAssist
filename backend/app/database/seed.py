import csv
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.database.db import engine, Base, ExerciseORM


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CSV_PATH = DATA_DIR / "gym_exercise_data.csv"


COLUMN_MAP = {
    "name": "Title",          
    "muscle_group": "BodyPart", 
    "equipment": "Equipment",    
    "difficulty": "Level",       
    "type": "Type",             
}


MUSCLE_GROUP_MAPPING = {
    "Back": [
        "Lats",
        "Lower Back",
        "Middle Back",
        "Traps",
        "Neck",
    ],
    "Chest": [
        "Chest",
    ],
    "Legs": [
        "Quadriceps",
        "Hamstrings",
        "Calves",
        "Adductors",
        "Abductors",
    ],
    "Abdominals": [
        "Abdominals",
    ],
    "Glutes": [
        "Glutes",
    ],
    "Shoulders": [
        "Shoulders",
    ],
    "Arms": [
        "Biceps",
        "Triceps",
        "Forearms",
    ],
}


def map_muscle_group(csv_muscle: str) -> str:
    for group, source_muscles in MUSCLE_GROUP_MAPPING.items():
        if csv_muscle in source_muscles:
            return group
    raise ValueError(f"Muscle '{csv_muscle}' nu are mapare in MUSCLE_GROUP_MAPPING")


def seed() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV file not found at {CSV_PATH}. Place Kaggle gym-exercise-data here.")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = Session(bind=engine)

    try:
        with CSV_PATH.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row[COLUMN_MAP["name"]].strip()
                raw_muscle = row[COLUMN_MAP["muscle_group"]].strip()
                muscle_group = map_muscle_group(raw_muscle)
                equipment = row[COLUMN_MAP["equipment"]].strip() or "Bodyweight"
                difficulty = row[COLUMN_MAP["difficulty"]].strip()
                ex_type = row[COLUMN_MAP["type"]].strip() or "Strength"

                exercise = ExerciseORM(
                    id=str(uuid.uuid4()),
                    name=name,
                    muscleGroup=muscle_group,
                    specificMuscle=raw_muscle,
                    equipment=equipment,
                    difficulty=difficulty,
                    type=ex_type,
                )
                session.add(exercise)

        session.commit()
        print("Seed completed successfully")
    finally:
        session.close()


if __name__ == "__main__":
    seed()
