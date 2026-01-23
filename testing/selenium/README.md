# Selenium login tests (PocketCare)

These are simple end-to-end login tests for the React frontend:

- `/login` (user + doctor)
- `/admin/login`
- `/hospital/login`
- `/weight-management` (add entry + set goal)
- `/symptom-checker` (form validation + submit)
- `/dashboard` (doctor profile: edit + save)

## 1) Start the app

In one terminal, run the backend (if your login APIs require it), then run the frontend.

Frontend typically runs at `http://localhost:3000`.

## 2) Install test dependencies

From the repo root:

```bash
python -m pip install -r testing/selenium/requirements.txt
```

Selenium 4+ uses **Selenium Manager** to auto-download drivers for Chrome/Firefox in most setups.

## 3) Set credentials (env vars)

These tests auto-load a local env file: `testing/selenium/.env` (recommended).

Create it by copying the example:

```bash
cp testing/selenium/.env.example testing/selenium/.env
```

Then edit `testing/selenium/.env` with real credentials.

Alternatively, you can still export variables in your shell:

```bash
export POCKETCARE_BASE_URL="http://localhost:3000"

export POCKETCARE_TEST_USER_EMAIL="user@example.com"
export POCKETCARE_TEST_USER_PASSWORD="password"

export POCKETCARE_TEST_DOCTOR_EMAIL="doctor@example.com"
export POCKETCARE_TEST_DOCTOR_PASSWORD="password"

export POCKETCARE_TEST_ADMIN_EMAIL="admin@example.com"
export POCKETCARE_TEST_ADMIN_PASSWORD="password"

export POCKETCARE_TEST_HOSPITAL_EMAIL="hospital@example.com"
export POCKETCARE_TEST_HOSPITAL_PASSWORD="password"
```

## 4) Run

```bash
pytest -q testing/selenium/test_login.py
pytest -q testing/selenium/test_weight_management.py
pytest -q testing/selenium/test_symptom_checker.py
pytest -q testing/selenium/test_doctor_profile_edit.py
```

## Options

- Headless mode (default): `SELENIUM_HEADLESS=1`
- Show the browser: `SELENIUM_HEADLESS=0`
- Choose browser: `SELENIUM_BROWSER=chrome` (default) or `SELENIUM_BROWSER=firefox`
