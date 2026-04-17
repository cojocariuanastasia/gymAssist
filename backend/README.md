# GymAssist Backend (FastAPI)

## Setup (Windows)

1. Creaza si activeaza un mediu virtual:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

2. Instaleaza dependentele:

```bash
pip install -r requirements.txt
```

3. Porneste serverul FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

API-ul va fi disponibil la `http://localhost:8000`.

---

## Structura

```
app/
├── data/
│   └── exercises.json          # Exercitii importate
├── database/
│   ├── db.py                   # Modele SQLAlchemy + configurare DB
│   └── seed.py                 # Populare DB din exercises.json
├── models/
│   └── schemas.py              # Modele Pydantic (request/response)
├── routers/
│   ├── auth.py                 # Register, login, logout
│   ├── exercises.py            # Imagini exercitii
│   ├── workout.py              # Generate, replace, complete, today
│   └── profile.py              # Profil, calendar, istoric, delete
├── services/
│   ├── auth_service.py
│   └── workout_service.py      # Logica generate + replace cu fallback
└── main.py
```

## Logica workout

### Generare

Se selecteaza aleator 4-6 exercitii din grupa musculara si dificultatea ceruta. Daca nu exista suficiente exercitii (minim 4), se completeaza din dificultati mai mici (Expert → Intermediate → Beginner), dar cu seturile/repetarile dificultatatii originale.

### Replace

Cauta un inlocuitor din aceeasi `specificMuscle` si aceeasi dificultate. Daca nu exista, cauta in `muscleGroup` la dificultate mai mica. Inlocuitorul primeste volumul dificultatatii originale.

### Limite zilnice

- Maxim 2 grupe musculare pe zi
- Aceeasi grupa musculara nu poate fi antrenata de doua ori in aceeasi zi
