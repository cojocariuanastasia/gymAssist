from pydantic import BaseModel
from typing import Optional
from enum import Enum


class MuscleGroup(str, Enum):
    BACK = "Back"
    CHEST = "Chest"
    LEGS = "Legs"
    ABDOMINALS = "Abdominals"
    GLUTES = "Glutes"
    SHOULDERS = "Shoulders"
    ARMS = "Arms"


class Difficulty(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    EXPERT = "Expert"


class Exercise(BaseModel):
    id: str
    name: str
    muscleGroup: MuscleGroup
    specificMuscle: str
    equipment: str
    difficulty: Difficulty
    type: str
    description: Optional[str] = None


class SetEntry(BaseModel):
    setNumber: int
    weight: Optional[float] = None
    reps: int
    completed: bool = False


class WorkoutExercise(BaseModel):
    workoutExerciseId: str
    exerciseId: str
    name: str
    equipment: str
    sets: list[SetEntry]
    description: Optional[str] = None


class Workout(BaseModel):
    id: str
    muscleGroup: MuscleGroup
    difficulty: Difficulty
    exercises: list[WorkoutExercise]
    createdAt: str


class GenerateWorkoutRequest(BaseModel):
    muscleGroup: MuscleGroup
    difficulty: Difficulty


class ReplaceExerciseRequest(BaseModel):
    workoutExerciseId: str
    currentExerciseId: str


class ReplaceExerciseResponse(BaseModel):
    workoutExerciseId: str
    exerciseId: str
    name: str
    equipment: str
    sets: list[SetEntry]
    description: Optional[str] = None
