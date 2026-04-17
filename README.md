# GymAssist

Aplicatie full-stack de tracking pentru antrenamente la sala, cu generare automata de workout-uri personalizate.

## Tech Stack

| Layer | Tehnologie |
|-------|-----------|
| Frontend | React 19 (Create React App) |
| Backend | FastAPI (Python) |
| Baza de date | SQLite + SQLAlchemy |
| Autentificare | Token-based (sesiuni in DB) |

## Functionalitati

- **Autentificare** — register / login / logout
- **Generare workout** — exercitii selectate aleator dupa grupa musculara si dificultate (Beginner / Intermediate / Expert)
- **Fallback exercitii** — daca nu exista suficiente exercitii la dificultatea ceruta, se completeaza automat din dificultati mai mici cu volum marit (seturi/repetari)
- **Replace exercitiu** — inlocuieste un exercitiu cu altul din aceeasi grupa; daca nu exista alternativa la aceeasi dificultate, cauta la dificultate mai mica
- **Exercitii bodyweight** — campul de greutate nu apare pentru exercitii fara echipament
- **Limita zilnica** — maxim 2 grupe musculare pe zi; aceeasi grupa nu poate fi antrenata de doua ori in aceeasi zi
- **Istoric** — calendar cu buline per antrenament (1 sau 2 buline pe zi), detalii exercitii per zi
- **Stergere antrenament** — poti sterge un antrenament din istoric direct din profil
- **Statistici** — streak curent, zile antrenate in luna curenta, total zile antrenate

## Structura proiect

```
GymAssist/
├── backend/              # FastAPI
│   ├── app/
│   │   ├── data/         # exercises.json
│   │   ├── database/     # SQLAlchemy models + seed
│   │   ├── models/       # Pydantic schemas
│   │   ├── routers/      # auth, workout, profile
│   │   └── services/     # logica workout (generate, replace)
│   ├── requirements.txt
│   └── README.md
└── gymassist/            # React app
    └── src/
        ├── App.js            # Auth, select muschi, select dificultate
        ├── WorkoutScreen.js  # Ecran antrenament activ
        └── ProfileScreen.js  # Profil, calendar, istoric
```

## Rulare locala

### Cerinte

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API disponibil la `http://localhost:8000`.

### Frontend

Intr-un terminal separat:

```bash
cd gymassist
npm install
npm start
```

App disponibila la `http://localhost:3000`.

## API Endpoints

### Auth
| Method | Endpoint | Descriere |
|--------|----------|-----------|
| POST | `/api/auth/register` | Creare cont |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |

### Workout
| Method | Endpoint | Descriere |
|--------|----------|-----------|
| POST | `/api/workout/generate` | Genereaza workout |
| POST | `/api/workout/{id}/replace` | Inlocuieste un exercitiu |
| POST | `/api/workout/complete` | Salveaza workout completat |
| GET | `/api/workout/today` | Status antrenamente azi (`workedMuscles`, `limitReached`) |

### Profil
| Method | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/api/profile` | Date profil + statistici + calendar |
| GET | `/api/profile/workouts/{date}` | Antrenamente dintr-o zi (`YYYY-MM-DD`) |
| DELETE | `/api/profile/workouts/{id}` | Sterge un antrenament din istoric |
| GET | `/api/profile/last-workout/{muscle}` | Ultimul workout pentru o grupa musculara |

### Valori acceptate

- `muscleGroup`: `Back`, `Chest`, `Legs`, `Abdominals`, `Glutes`, `Shoulders`, `Arms`
- `difficulty`: `Beginner`, `Intermediate`, `Expert`
