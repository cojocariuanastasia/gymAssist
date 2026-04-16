# GymAssist Backend (FastAPI)

## Setup (Windows)

1. Creează și activează un mediu virtual:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```

2. Instalează dependențele:

```powershell
pip install -r requirements.txt
```

3. Plasează fișierul Kaggle `gym_exercise_data.csv` în `app/data/` și ajustează `COLUMN_MAP` în `app/database/seed.py` dacă header-ele CSV sunt diferite.

4. Rulează seed-ul bazei de date:

```powershell
python -m app.database.seed
```

5. Pornește serverul FastAPI:

```powershell
uvicorn app.main:app --reload --port 8000
```

API-ul va fi disponibil la `http://localhost:8000`, iar frontend-ul (prin Vite proxy) va apela rutele sub `/api/...`.
