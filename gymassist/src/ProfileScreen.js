import React, { useState, useEffect } from "react";
import logo from "./logo.png";

const API = "http://localhost:8000";
const TIME_BASED_EXERCISES = new Set(["plank", "lateral plank", "wall sit"]);

const isTimeBasedExercise = (name) =>
  TIME_BASED_EXERCISES.has((name || "").trim().toLowerCase());

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// workoutDates is now a dict {dateStr: count}
function Calendar({ workoutDates, onDayClick, selectedDay }) {
  const [cur, setCur] = useState(new Date());
  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={cal.wrapper}>
      <div style={cal.header}>
        <button
          style={cal.navBtn}
          onClick={() => setCur(new Date(year, month - 1))}
        >
          ‹
        </button>
        <span style={cal.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          style={cal.navBtn}
          onClick={() => setCur(new Date(year, month + 1))}
        >
          ›
        </button>
      </div>

      <div style={cal.grid}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} style={cal.dayName}>
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const mm = String(month + 1).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const dateStr = `${year}-${mm}-${dd}`;
          const count = workoutDates[dateStr] ?? 0;
          const hasWorkout = count > 0;
          const isSelected = dateStr === selectedDay;
          const isToday = dateStr === new Date().toISOString().split("T")[0];

          return (
            <div
              key={i}
              style={{
                ...cal.cell,
                cursor: hasWorkout ? "pointer" : "default",
                background: isSelected ? "#1d4ed8" : isToday ? "#1f2937" : "transparent",
                borderRadius: 8,
              }}
              onClick={() => hasWorkout && onDayClick(dateStr)}
            >
              <span style={{ fontSize: 13, color: isToday ? "#f97316" : "#fff" }}>
                {day}
              </span>
              {hasWorkout && (
                <div style={cal.dots}>
                  {Array.from({ length: count }).map((_, di) => (
                    <div key={di} style={cal.dot} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileScreen({ token, onStartTraining, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayWorkouts, setDayWorkouts] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = () => {
    fetch(`${API}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleDayClick = async (dateStr) => {
    if (dateStr === selectedDay) {
      setSelectedDay(null);
      setDayWorkouts([]);
      return;
    }
    setSelectedDay(dateStr);
    setDayLoading(true);
    try {
      const res = await fetch(`${API}/api/profile/workouts/${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDayWorkouts(data);
    } finally {
      setDayLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    setDeleting(true);
    try {
      await fetch(`${API}/api/profile/workouts/${workoutId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const remaining = dayWorkouts.filter((w) => w.id !== workoutId);
      setDayWorkouts(remaining);
      if (remaining.length === 0) {
        setSelectedDay(null);
      }
      setLoading(true);
      fetchProfile();
    } finally {
      setConfirmDeleteId(null);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.spinner} />
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button type="button" style={s.logoButton} onClick={onStartTraining} aria-label="Go to start">
          <img src={logo} alt="GymAssist" style={s.appLogo} />
        </button>
        <button style={s.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </div>

      <h2 style={s.username}>{profile.username}</h2>

      {/* Stats */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <span style={s.statValue}>{profile.streak}</span>
          <span style={s.statLabel}>🔥 Streak</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statValue}>{profile.days_this_month}</span>
          <span style={s.statLabel}>📅 This month</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statValue}>{profile.total_days}</span>
          <span style={s.statLabel}>💪 Total days</span>
        </div>
      </div>

      {/* Calendar */}
      <Calendar
        workoutDates={profile.workout_dates}
        onDayClick={handleDayClick}
        selectedDay={selectedDay}
      />

      {/* Day detail */}
      {selectedDay && (
        <div style={s.dayDetail}>
          <div style={s.dayDetailHeader}>
            <span style={s.dayDetailTitle}>
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <button
              style={s.closeBtn}
              onClick={() => { setSelectedDay(null); setDayWorkouts([]); }}
            >
              ✕
            </button>
          </div>

          {dayLoading ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading...</p>
          ) : (
            dayWorkouts.map((w) => (
              <div key={w.id} style={s.workoutEntry}>
                <p style={s.workoutMeta}>
                  {w.muscle_group} · {w.difficulty}
                </p>
                {w.exercises.map((e, i) => (
                  <p key={i} style={s.exerciseLine}>
                    {e.name} — {e.sets} × {e.reps} {isTimeBasedExercise(e.name) ? "seconds" : "reps"}
                    {e.weight != null && e.weight !== "" ? ` · ${e.weight} kg` : ""}
                  </p>
                ))}
                {confirmDeleteId === w.id ? (
                  <div style={s.confirmRow}>
                    <span style={s.confirmText}>Delete this workout?</span>
                    <button
                      style={s.confirmYesBtn}
                      onClick={() => handleDeleteWorkout(w.id)}
                      disabled={deleting}
                    >
                      {deleting ? "..." : "Yes"}
                    </button>
                    <button
                      style={s.confirmNoBtn}
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    style={s.deleteBtn}
                    onClick={() => setConfirmDeleteId(w.id)}
                  >
                    Delete workout
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <button style={s.trainBtn} onClick={onStartTraining}>
        Start Training
      </button>
    </div>
  );
}

const s = {
  container: {
    minHeight: "100vh",
    padding: "0 0 32px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#06162d",
    color: "#fff",
  },
  spinner: {
    marginTop: 200,
    width: 48,
    height: 48,
    border: "4px solid #1f2937",
    borderTop: "4px solid #f97316",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  topBar: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1px 20px",
    borderBottom: "1px solid #1f2937",
    boxSizing: "border-box",
  },
  appLogo: {
    height: 80,
    width: "auto",
    objectFit: "contain",
    display: "block",
  },
  logoButton: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  logoutBtn: {
    background: "none",
    border: "1px solid #374151",
    borderRadius: 999,
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 18,
    padding: "6px 14px",
  },
  username: {
    fontSize: 26,
    fontWeight: 700,
    margin: "24px 0 16px",
  },
  statsRow: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    width: "100%",
    maxWidth: 380,
    justifyContent: "center",
  },
  statCard: {
    flex: 1,
    background: "#111827",
    borderRadius: 14,
    padding: "14px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: 700, color: "#f97316" },
  statLabel: { fontSize: 11, color: "#9ca3af", textAlign: "center" },
  dayDetail: {
    width: "100%",
    maxWidth: 380,
    background: "#111827",
    borderRadius: 16,
    padding: "16px",
    marginTop: 16,
    boxSizing: "border-box",
  },
  dayDetailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayDetailTitle: { fontSize: 14, fontWeight: 600 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: 16,
  },
  workoutEntry: { marginBottom: 12 },
  workoutMeta: {
    fontSize: 13,
    fontWeight: 600,
    color: "#f97316",
    margin: "0 0 6px",
  },
  exerciseLine: {
    fontSize: 13,
    color: "#d1d5db",
    margin: "2px 0",
  },
  deleteBtn: {
    marginTop: 8,
    padding: "7px 14px",
    borderRadius: 999,
    border: "1px solid #7f1d1d",
    background: "transparent",
    color: "#f87171",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  confirmText: {
    fontSize: 12,
    color: "#f87171",
    fontWeight: 600,
    flex: 1,
  },
  confirmYesBtn: {
    padding: "6px 14px",
    borderRadius: 999,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  confirmNoBtn: {
    padding: "6px 14px",
    borderRadius: 999,
    border: "1px solid #374151",
    background: "transparent",
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  trainBtn: {
    marginTop: 24,
    width: "calc(100% - 40px)",
    maxWidth: 380,
    padding: "14px",
    borderRadius: 999,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
};

const calStyles = document.createElement("style");
calStyles.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(calStyles);

const cal = {
  wrapper: {
    width: "100%",
    maxWidth: 380,
    background: "#111827",
    borderRadius: 16,
    padding: "16px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
    padding: "0 8px",
  },
  monthLabel: { fontSize: 15, fontWeight: 600 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 2,
  },
  dayName: {
    textAlign: "center",
    fontSize: 11,
    color: "#6b7280",
    padding: "4px 0",
  },
  cell: {
    textAlign: "center",
    padding: "5px 2px",
    minHeight: 40,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    display: "flex",
    gap: 3,
    justifyContent: "center",
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#f97316",
  },
};
