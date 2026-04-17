import React, { useState } from "react";

const API = "http://localhost:8000";
const TIME_BASED_EXERCISES = new Set(["plank", "lateral plank", "wall sit"]);

const isTimeBasedExercise = (name) =>
  TIME_BASED_EXERCISES.has((name || "").trim().toLowerCase());

export default function WorkoutScreen({
  workout,
  token,
  selectedMuscle,
  selectedDifficulty,
  onComplete,
  onBack,
}) {
  const [exercises, setExercises] = useState(() =>
    workout.exercises.map((exercise) => ({
      ...exercise,
      weight: exercise.weight ?? null,
    }))
  );
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(workout.exercises.map((e) => [e.workoutExerciseId, true]))
  );
  const [expandedDesc, setExpandedDesc] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleDesc = (id) =>
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleCheck = (id) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const updateSets = (exId, count) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.workoutExerciseId !== exId) return ex;
        const reps = ex.sets[0]?.reps ?? (isTimeBasedExercise(ex.name) ? 30 : 8);
        return {
          ...ex,
          sets: Array.from({ length: count }, (_, i) => ({
            setNumber: i + 1,
            weight: ex.sets[i]?.weight ?? null,
            reps: ex.sets[i]?.reps ?? reps,
            completed: false,
          })),
        };
      })
    );
  };

  const updateReps = (exId, reps) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.workoutExerciseId !== exId
          ? ex
          : { ...ex, sets: ex.sets.map((s) => ({ ...s, reps })) }
      )
    );
  };

  const updateWeight = (exId, weight) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.workoutExerciseId !== exId ? ex : { ...ex, weight }))
    );
  };

  const closeError = () => setError(null);

  const handleReplace = async (exercise) => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/workout/${workout.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutExerciseId: exercise.workoutExerciseId,
          currentExerciseId: exercise.exerciseId,
          excludeExerciseIds: exercises.map((item) => item.exerciseId),
        }),
      });
      if (!res.ok) {
        let message = "No replacement found";
        try {
          const payload = await res.json();
          message = payload.detail || message;
        } catch {
          // Keep the generic fallback if the response body is not JSON.
        }
        throw new Error(message);
      }
      const replacement = await res.json();
      setExercises((prev) =>
        prev.map((ex) =>
          ex.workoutExerciseId === exercise.workoutExerciseId
            ? { ...replacement, weight: null }
            : ex
        )
      );
      setChecked((prev) => ({ ...prev, [replacement.workoutExerciseId]: true }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async () => {
    const selected = exercises.filter((e) => checked[e.workoutExerciseId]);
    if (selected.length === 0) {
      setError("Select at least one exercise to complete.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/workout/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          muscleGroup: selectedMuscle,
          difficulty: selectedDifficulty,
          exercises: selected.map((e) => ({
            exerciseId: e.exerciseId,
            name: e.name,
            equipment: e.equipment,
            sets: e.sets.length,
            reps: e.sets[0]?.reps ?? 0,
            weight:
              (e.equipment || "").toLowerCase() === "bodyweight" ||
              e.weight === "" ||
              e.weight == null
                ? null
                : Number(e.weight),
          })),
        }),
      });
      if (!res.ok) {
        let message = "Failed to save workout";
        try {
          const payload = await res.json();
          message = payload.detail || message;
        } catch {
          // Fallback to the generic message if the response body can't be parsed.
        }
        throw new Error(message);
      }
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>{selectedMuscle} · {selectedDifficulty}</h2>

      {error && (
        <div style={s.modalBackdrop} onClick={closeError}>
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Something went wrong</h3>
            <p style={s.modalText}>{error}</p>
            <button style={s.modalButton} onClick={closeError}>
              OK
            </button>
          </div>
        </div>
      )}

      <div style={s.list}>
        {exercises.map((exercise) => {
          const isChecked = checked[exercise.workoutExerciseId];
          const isExpanded = expandedDesc[exercise.workoutExerciseId];
          const imageUrl = `${API}/api/exercises/${exercise.exerciseId}/image`;
          const isTimeBased = isTimeBasedExercise(exercise.name);
          const isBodyweight = (exercise.equipment || "").toLowerCase() === "bodyweight";

          return (
            <div
              key={exercise.workoutExerciseId}
              style={{ ...s.card, opacity: isChecked ? 1 : 0.45 }}
            >
              {/* Checkbox */}
              <div style={s.checkRow}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(exercise.workoutExerciseId)}
                  style={s.checkbox}
                />
                <span style={s.exerciseName}>{exercise.name}</span>
                {exercise.description && (
                  <button
                    style={s.infoBtn}
                    onClick={() => toggleDesc(exercise.workoutExerciseId)}
                  >
                    {isExpanded ? "▲" : "ℹ"}
                  </button>
                )}
              </div>

              <div style={s.equipmentText}>Equipment: {exercise.equipment}</div>

              <div style={s.specificMuscleText}>
                Specific muscle: {exercise.specificMuscle}
              </div>

              <img src={imageUrl} alt={exercise.name} style={s.image} />

              {isExpanded && exercise.description && (
                <div style={s.desc}>{exercise.description}</div>
              )}

              <div style={s.metricsRow}>
                <label style={s.metricLabel}>
                  Sets
                  <input
                    style={s.metricInput}
                    type="number"
                    min="1"
                    value={exercise.sets.length}
                    onChange={(e) =>
                      updateSets(exercise.workoutExerciseId, Number(e.target.value))
                    }
                  />
                </label>
                <label style={s.metricLabel}>
                  {isTimeBased ? "Seconds" : "Reps"}
                  <input
                    style={s.metricInput}
                    type="number"
                    min="1"
                    value={exercise.sets[0]?.reps ?? 0}
                    onChange={(e) =>
                      updateReps(exercise.workoutExerciseId, Number(e.target.value))
                    }
                  />
                </label>
                {!isBodyweight && (
                  <label style={s.metricLabel}>
                    Weight
                    <input
                      style={s.metricInput}
                      type="number"
                      min="0"
                      step="0.5"
                      value={exercise.weight ?? ""}
                      onChange={(e) =>
                        updateWeight(
                          exercise.workoutExerciseId,
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                    />
                  </label>
                )}
                <button
                  style={s.replaceBtn}
                  onClick={() => handleReplace(exercise)}
                >
                  Replace
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={s.completeBtn}
        onClick={handleComplete}
        disabled={saving}
      >
        {saving ? "Saving..." : "✓ Complete Workout"}
      </button>

      <button style={s.backBtn} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

const s = {
  container: {
    minHeight: "100vh",
    padding: "24px 20px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#06162d",
    color: "#fff",
  },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 400,
    marginBottom: 16,
  },
  card: {
    background: "#111827",
    borderRadius: 18,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "opacity 0.2s",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#f97316",
    cursor: "pointer",
    flexShrink: 0,
  },
  exerciseName: { fontSize: 16, fontWeight: 700, flex: 1 },
  infoBtn: {
    background: "none",
    border: "1px solid #4b5563",
    borderRadius: "50%",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 11,
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  },
  equipmentText: { fontSize: 12, color: "#9ca3af" },
  specificMuscleText: { fontSize: 12, color: "#cbd5e1" },
  image: {
    width: "100%",
    maxHeight: 150,
    objectFit: "contain",
    borderRadius: 10,
    background: "#1f2937",
  },
  desc: {
    fontSize: 12,
    color: "#d1d5db",
    lineHeight: 1.6,
    background: "#1f2937",
    borderRadius: 10,
    padding: "10px 12px",
  },
  metricsRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  },
  metricLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    color: "#d1d5db",
  },
  metricInput: {
    width: 64,
    padding: "6px 8px",
    borderRadius: 8,
    border: "none",
    background: "#000",
    color: "#fff",
    fontSize: 14,
  },
  replaceBtn: {
    marginLeft: "auto",
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#f97316",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  completeBtn: {
    width: "100%",
    maxWidth: 400,
    padding: "14px",
    borderRadius: 999,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 10,
  },
  backBtn: {
    width: "100%",
    maxWidth: 400,
    padding: "13px",
    borderRadius: 999,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { color: "#f87171", fontSize: 13, marginBottom: 8 },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 60,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
    textAlign: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#fff",
  },
  modalText: {
    margin: "12px 0 18px",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#cbd5e1",
  },
  modalButton: {
    minWidth: 120,
    padding: "12px 18px",
    borderRadius: 999,
    border: "none",
    background: "#f97316",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};
