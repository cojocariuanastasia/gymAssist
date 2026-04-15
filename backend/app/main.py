from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import init_db
from app.routers import exercises, workout


def create_app() -> FastAPI:
    app = FastAPI(title="GymAssist API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(exercises.router)
    app.include_router(workout.router)

    @app.on_event("startup")
    async def on_startup() -> None:  # noqa: D401
        """Initialize database schema on startup."""
        init_db()

    return app


app = create_app()
