from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine

DATABASE_URL = "sqlite:///./gymassist.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ExerciseORM(Base):
    __tablename__ = "exercises"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    muscleGroup = Column(String, nullable=False)
    specificMuscle = Column(String, nullable=False)
    equipment = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)


class UserORM(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(String, nullable=False)


class UserSessionORM(Base):
    __tablename__ = "user_sessions"
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)


class WorkoutLogORM(Base):
    __tablename__ = "workout_logs"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)       # YYYY-MM-DD
    muscle_group = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    exercises_json = Column(String, nullable=False)  # JSON array


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
