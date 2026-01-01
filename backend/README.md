# Gemini API Key
Add your Gemini API key to your .env file:

```
GEMINI_API_KEY=your_gemini_api_key_here
```
# PocketCare Backend

Backend API for PocketCare health platform built with Flask.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DB_USER` and `DB_PASSWORD` for your MySQL database
- `SECRET_KEY` and `JWT_SECRET_KEY` (use strong random strings)
- `GEMINI_API_KEY` (get from Google AI Studio)

### 3. Set Up MySQL Database

**Option 1: Using MySQL Command Line**
```bash
mysql -u root -p < ../database/schema.sql
mysql -u root -p pocketcare_db < ../database/seed_data.sql
```

**Option 2: Using MySQL Workbench**
- Open MySQL Workbench
- Create a new connection
- Open and execute `schema.sql`
- Open and execute `seed_data.sql`

### 4. Run the Application

```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- Body: `{ "email": "user@example.com", "password": "SecurePass123", "name": "John Doe", "phone": "+1234567890" }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ "email": "user@example.com", "password": "SecurePass123" }`

#### Get Profile
- **GET** `/api/auth/profile`
- Headers: `Authorization: Bearer <token>`

#### Update Profile
- **PUT** `/api/auth/profile`
- Headers: `Authorization: Bearer <token>`
- Body: `{ "name": "New Name", "phone": "+1234567890" }`

## Testing

Run tests with pytest:

```bash
pytest
```

## Project Structure

```
backend/
├── app.py                 # Main application
├── config.py             # Configuration
├── requirements.txt      # Dependencies
├── models/               # Database models (future)
├── routes/               # API routes
│   └── auth.py          # Authentication routes
├── utils/               # Utility functions
│   ├── database.py      # Database helpers
│   ├── auth_utils.py    # Auth helpers
│   └── validators.py    # Input validation
└── tests/               # Test files
```

## Next Steps

1. Install dependencies: `pip install -r requirements.txt`
2. Set up database: Run schema.sql and seed_data.sql
3. Configure .env file
4. Run the backend: `python app.py`
5. Test endpoints with Postman or curl
