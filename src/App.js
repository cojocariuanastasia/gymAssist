import React, { useState } from "react";

const exercisesData = {
  Back: [
    { name: "Pull-ups", equipment: "Pull-up bar", sets: 3, reps: 8 },
    { name: "Lat Pulldown", equipment: "Cable machine", sets: 3, reps: 10 },
    { name: "Seated Row", equipment: "Cable machine", sets: 3, reps: 12 },
    { name: "Deadlift", equipment: "Barbell", sets: 4, reps: 6 },
  ],
  Chest: [
    { name: "Bench Press", equipment: "Barbell and bench", sets: 4, reps: 6 },
    { name: "Push-ups", equipment: "Bodyweight", sets: 3, reps: 15 },
    { name: "Chest Fly", equipment: "Dumbbells or cable machine", sets: 3, reps: 12 },
    { name: "Incline Press", equipment: "Dumbbells or barbell and incline bench", sets: 3, reps: 8 },
  ],
  Legs: [
    { name: "Squats", equipment: "Barbell", sets: 4, reps: 8 },
    { name: "Lunges", equipment: "Bodyweight or dumbbells", sets: 3, reps: 12 },
    { name: "Leg Press", equipment: "Leg press machine", sets: 4, reps: 10 },
    { name: "Deadlift", equipment: "Barbell", sets: 4, reps: 6 },
  ],
  Abdominals: [
    { name: "Crunches", equipment: "Bodyweight", sets: 3, reps: 15 },
    { name: "Plank", equipment: "Bodyweight", sets: 3, reps: 30 },
    { name: "Leg Raises", equipment: "Bodyweight", sets: 3, reps: 12 },
    { name: "Russian Twists", equipment: "Bodyweight or medicine ball", sets: 3, reps: 20 },
  ],
  Glutes: [
    { name: "Hip Thrusts", equipment: "Barbell and bench", sets: 4, reps: 10 },
    { name: "Glute Bridges", equipment: "Bodyweight or barbell", sets: 3, reps: 15 },
    { name: "Bulgarian Split Squats", equipment: "Dumbbells and bench", sets: 3, reps: 10 },
    { name: "Cable Kickbacks", equipment: "Cable machine", sets: 3, reps: 12 },
  ],
};

export default function App() {
  const [screen, setScreen] = useState("select");
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [workout, setWorkout] = useState([]);

  const generateWorkout = (muscle) => {
    const all = exercisesData[muscle];
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map((exercise) => ({
      ...exercise,
      sets: 3,
      reps: 8,
    }));
  };

  const handleSelectMuscle = (muscle) => {
    setSelectedMuscle(muscle);
    setWorkout(generateWorkout(muscle));
    setScreen("workout");
  };

  const replaceExercise = (index) => {
    const all = exercisesData[selectedMuscle];
    const current = workout[index].name;

    const alternatives = all.filter((exercise) => exercise.name !== current);
    const random =
      alternatives[Math.floor(Math.random() * alternatives.length)];

    const newWorkout = [...workout];
    newWorkout[index] = {
      ...random,
      sets: newWorkout[index].sets,
      reps: newWorkout[index].reps,
    };
    setWorkout(newWorkout);
  };

  const updateWorkoutValue = (index, field, value) => {
    const newWorkout = [...workout];
    newWorkout[index] = {
      ...newWorkout[index],
      [field]: value,
    };
    setWorkout(newWorkout);
  };

  // SCREEN 1
  if (screen === "select") {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>What do you train today?</h2>

        <div style={styles.buttonGroup}>
          {Object.keys(exercisesData).map((muscle) => (
            <button
              key={muscle}
              style={styles.button}
              onClick={() => handleSelectMuscle(muscle)}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // SCREEN 2
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{selectedMuscle} Workout</h2>

      <div style={styles.workoutList}>
        {workout.map((exercise, index) => (
          <div key={index} style={styles.card}>
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
                    value={exercise.sets}
                    onChange={(event) =>
                      updateWorkoutValue(index, "sets", Number(event.target.value))
                    }
                  />
                </label>
                <label style={styles.metricLabel}>
                  Reps
                  <input
                    style={styles.metricInput}
                    type="number"
                    min="1"
                    value={exercise.reps}
                    onChange={(event) =>
                      updateWorkoutValue(index, "reps", Number(event.target.value))
                    }
                  />
                </label>
              </div>
            </div>
            <button style={styles.replaceButton} onClick={() => replaceExercise(index)}>
              Replace
            </button>
          </div>
        ))}
      </div>

      <button style={styles.primaryButton} onClick={() => setScreen("select")}>
        Back
      </button>
    </div>
  );
}

//  basic styles
const styles = {
  container: {
    minHeight: "100vh",
    padding: 24,
    fontFamily: "Arial",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#06162d",
    color: "#fff",
  },
  title: {
    marginBottom: 20,
    fontSize: 26,
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    width: "100%",
    maxWidth: 260,
  },
  button: {
    width: "100%",
    padding: "8px 16px",
    fontSize: 14,
    borderRadius: 999,
    border: "none",
    background: "#333",
    color: "#fff",
  },
  workoutList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    maxWidth: 320,
    marginBottom: 20,
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    border: "1px solid #333",
    borderRadius: 18,
    background: "#111",
  },
  exerciseInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    textAlign: "left",
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 700,
  },
  equipmentText: {
    fontSize: 12,
    color: "#bbb",
  },
  metricsRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  metricLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    color: "#ddd",
  },
  metricInput: {
    width: 72,
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
  },
  replaceButton: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "none",
    background: "#ff9800",
    color: "white",
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 4,
    padding: "8px 16px",
    width: "100%",
    maxWidth: 260,
    borderRadius: 999,
    border: "none",
    background: "#007bff",
    color: "white",
    fontSize: 14,
  },
};