from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import init_db
from app.routers import exercises, workout
from app.routers import auth, profile


def create_app() -> FastAPI:
    app = FastAPI(title="GymAssist API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(exercises.router)
    app.include_router(workout.router)
    app.include_router(profile.router)

    @app.on_event("startup")
    async def on_startup() -> None:
        init_db()

    return app


app = create_app()
