import React, { useState } from "react";

const API = "http://localhost:8000";

const MUSCLE_GROUPS = ["Back", "Chest", "Legs", "Abdominals", "Glutes", "Shoulders", "Arms"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Expert"];

export default function App() {
  const [screen, setScreen] = useState("select");      
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [workout, setWorkout] = useState(null);       
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);         
  const [toast, setToast] = useState(null);        

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // helpers to read sets/reps from the sets array
  const getSetsCount = (exercise) => exercise.sets.length;
  const getReps = (exercise) => exercise.sets[0]?.reps ?? 0;

  const handleSelectMuscle = (muscle) => {
    setSelectedMuscle(muscle);
    setScreen("difficulty");
  };

  const handleSelectDifficulty = async (difficulty) => {
    setSelectedDifficulty(difficulty);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/workout/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muscleGroup: selectedMuscle, difficulty }),
      });
      if (!res.ok) {
        let message = "We couldn't generate a workout. Please try another combination.";

        try {
          const errorBody = await res.json();
          if (typeof errorBody?.detail === "string") {
            message = errorBody.detail;
          } else if (res.status === 404) {
            message = "No exercises found for this muscle group and difficulty.";
          }
        } catch {
          // Ignore JSON parse errors and fall back to the generic message
        }

        throw new Error(message);
      }

      const data = await res.json();
      setWorkout(data);
      setScreen("workout");
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Failed to fetch") {
          showToast("We couldn't reach the server. Please make sure the GymAssist backend is running.");
        } else {
          showToast(err.message);
        }
      } else {
        showToast("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async (exercise) => {
    setError(null);
    try {
      const existingExerciseIds = workout?.exercises.map((ex) => ex.exerciseId) ?? [];

      const res = await fetch(`${API}/api/workout/${workout.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutExerciseId: exercise.workoutExerciseId,
          currentExerciseId: exercise.exerciseId,
          existingExerciseIds,
        }),
      });
      if (!res.ok) {
        let message = "We couldn't find a replacement exercise.";

        try {
          const errorBody = await res.json();
          if (typeof errorBody?.detail === "string") {
            message = errorBody.detail;
          }
        } catch {
          // Ignore JSON parse errors
        }

        throw new Error(message);
      }

      const replacement = await res.json();
      setWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.workoutExerciseId === exercise.workoutExerciseId ? replacement : ex
        ),
      }));
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Failed to fetch") {
          showToast("We couldn't reach the server. Please make sure the GymAssist backend is running.");
        } else {
          showToast(err.message);
        }
      } else {
        showToast("Something went wrong. Please try again.");
      }
    }
  };

  const updateSets = (exerciseId, newSetsCount) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.workoutExerciseId !== exerciseId) return ex;
        const currentReps = ex.sets[0]?.reps ?? 8;
        const sets = Array.from({ length: newSetsCount }, (_, i) => ({
          setNumber: i + 1,
          weight: ex.sets[i]?.weight ?? null,
          reps: ex.sets[i]?.reps ?? currentReps,
          completed: ex.sets[i]?.completed ?? false,
        }));
        return { ...ex, sets };
      }),
    }));
  };

  const updateReps = (exerciseId, newReps) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.workoutExerciseId !== exerciseId) return ex;
        return { ...ex, sets: ex.sets.map((s) => ({ ...s, reps: newReps }) )};
      }),
    }));
  };

  // SCREEN 1 — muscle group selection
  if (screen === "select") {
    return (
      <div style={styles.container}>
        {toast && (
          <div
            style={{
              ...styles.toast,
              ...(toast.type === "error" ? styles.toastError : styles.toastInfo),
            }}
          >
            {toast.message}
          </div>
        )}
        <h2 style={styles.title}>What do you train today?</h2>
        <div style={styles.buttonGroup}>
          {MUSCLE_GROUPS.map((muscle) => (
            <button
              key={muscle}
              style={styles.muscleButton}
              onClick={() => handleSelectMuscle(muscle)}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // SCREEN 2 — difficulty selection
  if (screen === "difficulty") {
    return (
      <div style={styles.container}>
        {toast && (
          <div
            style={{
              ...styles.toast,
              ...(toast.type === "error" ? styles.toastError : styles.toastInfo),
            }}
          >
            {toast.message}
          </div>
        )}
        <h2 style={styles.title}>Select difficulty</h2>
        <div style={styles.buttonGroup}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              style={styles.muscleButton}
              onClick={() => handleSelectDifficulty(d)}
              disabled={loading}
            >
              {loading && selectedDifficulty === d ? "Loading..." : d}
            </button>
          ))}
        </div>
        <button style={{ ...styles.backButton, marginTop: 24 }} onClick={() => setScreen("select")}>
          Back
        </button>
      </div>
    );
  }

  // SCREEN 3 — workout detail
  return (
    <div style={styles.container}>
      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === "error" ? styles.toastError : styles.toastInfo),
          }}
        >
          {toast.message}
        </div>
      )}
      <h2 style={styles.title}>{selectedMuscle} Workout</h2>

      <div style={styles.workoutList}>
        {workout?.exercises.map((exercise) => (
          <div key={exercise.workoutExerciseId} style={styles.card}>
            <div style={styles.exerciseInfo}>
              <div style={styles.exerciseName}>{exercise.name}</div>
              <div style={styles.equipmentText}>Equipment: {exercise.equipment}</div>
              <div style={styles.metricsRow}>
                <label style={styles.metricLabel}>
                  Sets
                  <input
                    style={styles.metricInput}
                    type="number"
                    min="1"
                    value={getSetsCount(exercise)}
                    onChange={(e) =>
                      updateSets(exercise.workoutExerciseId, Number(e.target.value))
                    }
                  />
                </label>
                <label style={styles.metricLabel}>
                  Reps
                  <input
                    style={styles.metricInput}
                    type="number"
                    min="1"
                    value={getReps(exercise)}
                    onChange={(e) =>
                      updateReps(exercise.workoutExerciseId, Number(e.target.value))
                    }
                  />
                </label>
              </div>
            </div>
            <button style={styles.replaceButton} onClick={() => handleReplace(exercise)}>
              Replace
            </button>
          </div>
        ))}
      </div>

      <button style={styles.backButton} onClick={() => setScreen("select")}>
        Back
      </button>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    padding: "32px 24px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#06162d",
    color: "#fff",
  },
  title: {
    marginBottom: 32,
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: "#fff",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  muscleButton: {
    width: "100%",
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 500,
    borderRadius: 999,
    border: "none",
    background: "#2e2e2e",
    color: "#fff",
    cursor: "pointer",
  },
  workoutList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 380,
    marginBottom: 20,
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: "16px 16px",
    borderRadius: 20,
    background: "#111827",
  },
  exerciseInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    textAlign: "left",
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
  },
  equipmentText: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.4,
  },
  metricsRow: {
    display: "flex",
    gap: 12,
    marginTop: 4,
  },
  metricLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 12,
    color: "#d1d5db",
    fontWeight: 500,
  },
  metricInput: {
    width: 72,
    padding: "7px 10px",
    borderRadius: 10,
    border: "none",
    background: "#000",
    color: "#fff",
    fontSize: 14,
  },
  replaceButton: {
    padding: "9px 16px",
    borderRadius: 999,
    border: "none",
    background: "#f97316",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  backButton: {
    marginTop: 8,
    padding: "13px 20px",
    width: "100%",
    maxWidth: 340,
    borderRadius: 999,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    top: 16,
    right: 16,
    maxWidth: 320,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 14,
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
    zIndex: 50,
    textAlign: "left",
  },
  toastError: {
    background: "#b91c1c",
    color: "#fee2e2",
  },
  toastInfo: {
    background: "#1d4ed8",
    color: "#dbeafe",
  },
};
