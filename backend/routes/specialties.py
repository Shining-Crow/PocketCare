from flask import Blueprint, jsonify

from utils.database import execute_query

specialties_bp = Blueprint("specialties", __name__)


@specialties_bp.route("/specialties", methods=["GET"])
def list_specialties():
    try:
        rows = execute_query(
            "SELECT id, name FROM specialties ORDER BY name ASC",
            fetch_all=True,
        )
        return jsonify({"specialties": rows or []}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch specialties", "message": str(e)}), 500
