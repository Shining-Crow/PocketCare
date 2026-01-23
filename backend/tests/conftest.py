from __future__ import annotations

import sys
from pathlib import Path

import pytest
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token


# Ensure `backend/` is on sys.path so imports like `from routes.reports import reports_bp` work
# when running pytest from the repo root.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))


@pytest.fixture()
def app() -> Flask:
    from routes.reports import reports_bp

    app = Flask(__name__)
    app.config.update(
        {
            "TESTING": True,
            "JWT_SECRET_KEY": "test-jwt-secret",
        }
    )

    JWTManager(app)
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    return app


@pytest.fixture()
def client(app: Flask):
    return app.test_client()


@pytest.fixture()
def auth_header(app: Flask) -> dict[str, str]:
    with app.app_context():
        token = create_access_token(identity="123")
    return {"Authorization": f"Bearer {token}"}
