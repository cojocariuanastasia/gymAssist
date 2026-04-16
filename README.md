# GymAssist

Aplicatie web pentru generarea de planuri de antrenament personalizate, bazata pe grup muscular si nivel de dificultate.

## Structura proiectului

```
GymAssist/
├── backend/          # FastAPI + SQLite
│   ├── app/
│   │   ├── database/
│   │   │   ├── db.py         # Configurare baza de date
│   │   │   └── seed.py       # Populare DB din WorkoutAPI
│   │   ├── models/
│   │   │   └── schemas.py    # Modele Pydantic
│   │   ├── routers/
│   │   │   ├── exercises.py  # Endpoint-uri exercitii
│   │   │   └── workout.py    # Endpoint-uri workout
│   │   ├── services/
│   │   │   └── workout_service.py
│   │   └── main.py
│   └── requirements.txt
└── gymassist/        # React (Create React App)
    ├── src/
    └── package.json
```

## Cerinte

- Python 3.10+
- Node.js 18+
- npm

## Pornire Backend

```bash
cd backend

# 1. Creaza si activeaza un virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 2. Instaleaza dependintele
pip install -r requirements.txt

# 3. Configureaza variabilele de mediu
cp .env.example .env
# Editeaza .env si adauga API key-ul tau WorkoutAPI

# 4. Populeaza baza de date (rulat o singura data)
python -m app.database.seed

# 5. Porneste serverul
uvicorn app.main:app --reload
```

Serverul va fi disponibil la `http://localhost:8000`.

> **Nota:** Pasul 4 face request-uri paralele la WorkoutAPI si salveaza toate exercitiile + imaginile in `gymassist.db` (SQLite local). Dupa aceea, aplicatia nu mai contacteaza API-ul extern.

## Pornire Frontend

Intr-un terminal separat:

```bash
cd gymassist

# 1. Instaleaza dependintele
npm install

# 2. Porneste aplicatia
npm start
```

Aplicatia va fi disponibila la `http://localhost:3000`.

## Endpoint-uri API

| Metoda | URL | Descriere |
|--------|-----|-----------|
| GET | `/api/muscle-groups` | Lista grupuri musculare disponibile |
| GET | `/api/exercises` | Lista exercitii (filtru optional: `muscleGroup`, `difficulty`) |
| POST | `/api/workout/generate` | Genereaza un workout |
| POST | `/api/workout/{id}/replace` | Inlocuieste un exercitiu din workout |

### Exemplu cerere generare workout

```json
POST /api/workout/generate
{
  "muscleGroup": "Back",
  "difficulty": "Intermediate"
}
```

Valori acceptate:
- `muscleGroup`: `Back`, `Chest`, `Legs`, `Abdominals`, `Glutes`, `Shoulders`, `Arms`
- `difficulty`: `Beginner`, `Intermediate`, `Expert`
