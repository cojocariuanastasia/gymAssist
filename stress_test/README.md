# GymAssist Stress Testing with Locust

## Running the stress test

1. First start your backend server normally:
```bash
cd ../backend
uvicorn app.main:app --reload
```

2. Start Locust web UI:
```bash
cd stress_test
~/.local/bin/locust
```

3. Open browser at **http://localhost:8089**

---

## Available load profiles

| Profile       | Users | Spawn Rate | Duration | Use Case                          |
|---------------|-------|------------|----------|-----------------------------------|
| Light Load    | 10    | 1/sec      | 5 min    | First test, verify setup          |
| Medium Load   | 50    | 2/sec      | 10 min   | Normal usage simulation          |
| Stress Load   | 200   | 5/sec      | 15 min   | Stress test limits               |
| Soak Load     | 30    | 0.5/sec    | 60 min   | Long running stability test      |

---

## Headless mode (no UI)
```bash
# Run medium load test headless
~/.local/bin/locust --headless --users 50 --spawn-rate 2 --run-time 10m
```

---

## What this test simulates:
- 80% login, 20% new user registration
- Realistic think times between actions (1-5 seconds)
- Weighted tasks matching real user behaviour:
  - 10x - Browse exercises list
  - 5x  - View user profile
  - 4x  - View saved workouts
  - 3x  - Generate new workout plans
  - 2x  - Update profile data
  - 1x  - Logout

---

## Interpreting results:
- **P95 Latency**: Should stay < 500ms for normal operation
- **Failure Rate**: Should be 0%
- **Requests/s**: Shows maximum throughput
- **Charts**: Look for increasing latency under load

All test users are automatically created with unique test data.
