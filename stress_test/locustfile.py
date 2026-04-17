from locust import HttpUser, task, between, tag
import random
import uuid


class GymAssistUser(HttpUser):
    wait_time = between(1, 5)
    host = "http://localhost:8000"

    def on_start(self):
        """Run when a simulated user starts"""
        self.token = None
        self.user_id = None
        self.username = f"test_user_{uuid.uuid4().hex[:8]}"
        self.email = f"{self.username}@test.local"
        self.password = "testpass123"

        # Always register first for stress testing
        self.register()

    def register(self):
        """Register new test user"""
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": self.username,
                "email": self.email,
                "password": self.password
            }
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.username = data["username"]

    def login(self):
        """Login existing user"""
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": self.email,
                "password": self.password
            }
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.username = data["username"]

    @tag("public")
    @task(10)
    def get_exercises(self):
        """Get all exercises endpoint"""
        self.client.get("/api/exercises")

    @tag("auth")
    @task(5)
    def get_profile(self):
        """Get user profile (requires auth)"""
        if not self.token:
            return
        self.client.get(
            "/api/profile",
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @tag("workout")
    @task(3)
    def generate_workout(self):
        """Generate a new workout plan"""
        if not self.token:
            return
        muscle_groups = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Abdominals"]
        self.client.post(
            "/api/workout/generate",
            json={
                "muscleGroup": random.choice(muscle_groups),
                "difficulty": random.choice(["Beginner", "Intermediate", "Expert"])
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @tag("workout")
    @task(4)
    def get_today_workout_status(self):
        """Get today workout status"""
        if not self.token:
            return
        self.client.get(
            "/api/workout/today",
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @tag("workout")
    @task(4)
    def get_today_workout_status(self):
        """Get today workout status"""
        if not self.token:
            return
        self.client.get(
            "/api/workout/today",
            headers={"Authorization": f"Bearer {self.token}"}
        )



    @tag("auth")
    @task(1)
    def logout(self):
        """User logout flow"""
        if not self.token:
            return
        self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self.token = None


class LoadTestSettings:
    """Recommended load profiles"""
    LIGHT_LOAD = {"users": 10, "spawn_rate": 1, "run_time": "5m"}
    MEDIUM_LOAD = {"users": 50, "spawn_rate": 2, "run_time": "10m"}
    STRESS_LOAD = {"users": 200, "spawn_rate": 5, "run_time": "15m"}
    SOAK_LOAD = {"users": 30, "spawn_rate": 0.5, "run_time": "1h"}
