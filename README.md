# PocketCare

AI-assisted mobile-first health platform for symptom analysis and medical service connectivity.

## Project Structure

```
PocketCare/
├── backend/            # Flask API
├── frontend/           # React application
├── database/           # SQL schemas and seed data
└── PROJECT_PLAN.txt   # Detailed project roadmap
```

## Quick Start

### Backend Setup

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up MySQL database:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p pocketcare_db < database/seed_data.sql
```

4. Run the backend:
```bash
python app.py
```

Backend runs at `http://localhost:5000`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm start
```

Frontend runs at `http://localhost:3000`

## Phase 1 Status

✅ Project structure initialized
✅ Backend authentication system (JWT, bcrypt)
✅ Frontend authentication pages (login, register)
✅ Database schema created
✅ Basic routing and protected routes

## Next Steps

- Set up MySQL database
- Test authentication flow
- Begin Phase 2: Core Features (symptom analyzer, doctor directory)

## Documentation

- See `PROJECT_PLAN.txt` for complete project roadmap
- See `backend/README.md` for API documentation
- See `frontend/README.md` for frontend details

## Tech Stack

- **Frontend:** React, Tailwind CSS, Axios
- **Backend:** Flask, JWT, bcrypt
- **Database:** MySQL
- **AI:** Google Gemini API (to be integrated)
