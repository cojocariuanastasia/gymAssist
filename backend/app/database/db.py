from sqlalchemy import Column, String
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


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
