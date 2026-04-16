import React, { useState, useEffect } from "react";
import WorkoutScreen from "./WorkoutScreen";
import ProfileScreen from "./ProfileScreen";

const API = "http://localhost:8000";

const MUSCLE_GROUPS = ["Back", "Chest", "Legs", "Abdominals", "Glutes", "Shoulders", "Arms"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Expert"];

// ─── Auth screens ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Login failed");
      }
      const data = await res.json();
      onLogin(data.token, data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <h1 style={s.brand}>GymAssist</h1>
      <form onSubmit={handleSubmit} style={s.form}>
        <input style={s.input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input style={s.input} type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={s.error}>{error}</p>}
        <button style={s.btnPrimary} type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <button style={s.btnLink} type="button" onClick={onGoRegister}>
          Don't have an account? Register
        </button>
      </form>
    </div>
  );
}

function RegisterScreen({ onLogin, onGoLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Registration failed");
      }
      const data = await res.json();
      onLogin(data.token, data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <h1 style={s.brand}>GymAssist</h1>
      <form onSubmit={handleSubmit} style={s.form}>
        <input style={s.input} type="text" placeholder="Username" value={username}
          onChange={(e) => setUsername(e.target.value)} required />
        <input style={s.input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input style={s.input} type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={s.error}>{error}</p>}
        <button style={s.btnPrimary} type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
        <button style={s.btnLink} type="button" onClick={onGoLogin}>
          Already have an account? Login
        </button>
      </form>
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function LoadingScreen({ muscle, difficulty }) {
  return (
    <div style={s.container}>
      <div style={s.spinnerWrap}>
        <div style={s.spinner} />
        <p style={s.loadingTitle}>Building your workout...</p>
        <p style={s.loadingSubtitle}>{muscle} · {difficulty}</p>
      </div>
    </div>
  );
}

// ─── Top nav bar (shown on select / difficulty screens) ──────────────────────

function TopBar({ username, onGoProfile }) {
  return (
    <div style={s.topBar}>
      <span style={s.appName}>GymAssist</span>
      <button style={s.profileBtn} onClick={onGoProfile}>
        {username} ›
      </button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("checking");
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState(null);

  // Check stored token on mount
  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (!saved) { setScreen("login"); return; }
    fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${saved}` } })
      .then((r) => {
        if (!r.ok) throw new Error("expired");
        return r.json();
      })
      .then((data) => {
        setToken(saved);
        setUsername(data.username);
        setScreen("select");
      })
      .catch(() => {
        localStorage.removeItem("token");
        setScreen("login");
      });
  }, []);

  const handleLogin = (tok, uname) => {
    localStorage.setItem("token", tok);
    setToken(tok);
    setUsername(uname);
    setScreen("select");
  };

  const handleLogout = async () => {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    localStorage.removeItem("token");
    setToken(null);
    setUsername("");
    setScreen("login");
  };

  const handleSelectMuscle = (muscle) => {
    setSelectedMuscle(muscle);
    setScreen("difficulty");
  };

  const handleSelectDifficulty = async (difficulty) => {
    setSelectedDifficulty(difficulty);
    setScreen("loading");
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
      setError(err.message);
      setScreen("difficulty");
    }
  };

  // ── Screens ──────────────────────────────────────────────────────────────

  if (screen === "checking") {
    return (
      <div style={{ ...s.container, justifyContent: "center" }}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGoRegister={() => setScreen("register")}
      />
    );
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        onLogin={handleLogin}
        onGoLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "profile") {
    return (
      <ProfileScreen
        token={token}
        onStartTraining={() => setScreen("select")}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === "loading") {
    return <LoadingScreen muscle={selectedMuscle} difficulty={selectedDifficulty} />;
  }

  if (screen === "workout" && workout) {
    return (
      <WorkoutScreen
        workout={workout}
        token={token}
        selectedMuscle={selectedMuscle}
        selectedDifficulty={selectedDifficulty}
        onComplete={() => setScreen("profile")}
        onBack={() => setScreen("select")}
      />
    );
  }

  if (screen === "difficulty") {
    return (
      <div style={s.container}>
        <TopBar username={username} onGoProfile={() => setScreen("profile")} />
        <div style={s.inner}>
          <h2 style={s.title}>Select difficulty</h2>
          <p style={s.subtitle}>{selectedMuscle}</p>
          <div style={s.btnGroup}>
            {DIFFICULTIES.map((d) => (
              <button key={d} style={s.muscleBtn} onClick={() => handleSelectDifficulty(d)}>
                {d}
              </button>
            ))}
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button style={{ ...s.muscleBtn, background: "#2563eb", marginTop: 8 }}
            onClick={() => setScreen("select")}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // select screen (default)
  return (
    <div style={s.container}>
      <TopBar username={username} onGoProfile={() => setScreen("profile")} />
      <div style={s.inner}>
        <h2 style={s.title}>What do you train today?</h2>
        <div style={s.btnGroup}>
          {MUSCLE_GROUPS.map((muscle) => (
            <button key={muscle} style={s.muscleBtn} onClick={() => handleSelectMuscle(muscle)}>
              {muscle}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styleTag = document.createElement("style");
styleTag.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleTag);

const s = {
  container: {
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#06162d",
    color: "#fff",
  },
  inner: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    width: "100%",
    boxSizing: "border-box",
  },
  topBar: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1f2937",
    boxSizing: "border-box",
  },
  appName: { fontSize: 18, fontWeight: 700, color: "#f97316" },
  profileBtn: {
    background: "none",
    border: "1px solid #374151",
    borderRadius: 999,
    color: "#d1d5db",
    cursor: "pointer",
    fontSize: 13,
    padding: "6px 14px",
  },
  brand: {
    fontSize: 36,
    fontWeight: 800,
    color: "#f97316",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
    maxWidth: 320,
  },
  input: {
    padding: "13px 16px",
    borderRadius: 12,
    border: "1px solid #374151",
    background: "#111827",
    color: "#fff",
    fontSize: 15,
    outline: "none",
  },
  btnPrimary: {
    padding: "13px",
    borderRadius: 999,
    border: "none",
    background: "#f97316",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnLink: {
    background: "none",
    border: "none",
    color: "#6b7280",
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#9ca3af", marginBottom: 20 },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    maxWidth: 340,
  },
  muscleBtn: {
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 500,
    borderRadius: 999,
    border: "none",
    background: "#1f2937",
    color: "#fff",
    cursor: "pointer",
    width: "100%",
  },
  spinnerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    marginTop: 160,
  },
  spinner: {
    width: 52,
    height: 52,
    border: "5px solid #1f2937",
    borderTop: "5px solid #f97316",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  loadingTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  loadingSubtitle: { fontSize: 14, color: "#9ca3af", margin: 0 },
  error: { color: "#f87171", fontSize: 13, marginTop: 4 },
};
