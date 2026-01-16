from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from utils.database import execute_query
from utils.gemini_utils import generate_weight_recommendations

weight_management_bp = Blueprint("weight_management", __name__)


def _as_positive_float(value, field_name: str) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if f <= 0:
        raise ValueError(f"{field_name} must be > 0")
    return f


def _compute_bmi(*, weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100.0
    if height_m <= 0:
        raise ValueError("height_cm must be > 0")
    return round(weight_kg / (height_m * height_m), 2)


def _parse_entry_date(value) -> date:
    if not value:
        return date.today()
    if isinstance(value, str):
        try:
            # Expect YYYY-MM-DD
            return datetime.strptime(value, "%Y-%m-%d").date()
        except Exception:
            raise ValueError("entry_date must be YYYY-MM-DD")
    raise ValueError("entry_date must be a string")


@weight_management_bp.route("/weight/entries", methods=["GET"])
@jwt_required()
def list_weight_entries():
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get("limit", "365")
        order = (request.args.get("order") or "asc").strip().lower()
        try:
            limit_i = max(1, min(int(limit), 2000))
        except Exception:
            limit_i = 365

        order_by = "entry_date ASC, id ASC"
        if order == "desc":
            order_by = "entry_date DESC, id DESC"

        rows = execute_query(
            f"""
            SELECT id, entry_date, weight_kg, height_cm, age_years, bmi, created_at
            FROM weight_entries
            WHERE user_id = %s
            ORDER BY {order_by}
            LIMIT %s
            """,
            (user_id, limit_i),
            fetch_all=True,
        )

        # Ensure JSON serializable
        for r in rows or []:
            if r.get("entry_date"):
                r["entry_date"] = r["entry_date"].isoformat()
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()

        return jsonify({"entries": rows or []}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch weight entries: {str(e)}"}), 500


@weight_management_bp.route("/weight/entries/<int:entry_id>", methods=["PUT"])
@jwt_required()
def update_weight_entry(entry_id: int):
    """Update an existing entry (user-owned) and recompute BMI."""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}

        # Only allow editing the most recent 3 entries to reduce accidental history tampering.
        latest_three = execute_query(
            """
            SELECT id
            FROM weight_entries
            WHERE user_id = %s
            ORDER BY entry_date DESC, id DESC
            LIMIT 3
            """,
            (user_id,),
            fetch_all=True,
        )
        allowed_ids = {row.get("id") for row in (latest_three or [])}
        if entry_id not in allowed_ids:
            return jsonify({"error": "Only your most recent 3 entries can be edited."}), 403

        # Ensure the entry belongs to the caller
        existing = execute_query(
            """
            SELECT id, entry_date, weight_kg, height_cm, age_years, bmi, created_at
            FROM weight_entries
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (entry_id, user_id),
            fetch_one=True,
        )
        if not existing:
            return jsonify({"error": "Entry not found"}), 404

        weight_kg = _as_positive_float(data.get("weight_kg"), "weight_kg")
        height_cm = _as_positive_float(data.get("height_cm"), "height_cm")

        age_years = data.get("age_years")
        if age_years in (None, ""):
            age_years_i = None
        else:
            try:
                age_years_i = int(age_years)
            except (TypeError, ValueError):
                return jsonify({"error": "age_years must be an integer"}), 400
            if age_years_i <= 0 or age_years_i > 130:
                return jsonify({"error": "age_years must be between 1 and 130"}), 400

        entry_dt = _parse_entry_date(data.get("entry_date"))
        bmi = _compute_bmi(weight_kg=weight_kg, height_cm=height_cm)

        execute_query(
            """
            UPDATE weight_entries
            SET entry_date = %s,
                weight_kg = %s,
                height_cm = %s,
                age_years = %s,
                bmi = %s
            WHERE id = %s AND user_id = %s
            """,
            (entry_dt, weight_kg, height_cm, age_years_i, bmi, entry_id, user_id),
            commit=True,
        )

        updated = execute_query(
            """
            SELECT id, entry_date, weight_kg, height_cm, age_years, bmi, created_at
            FROM weight_entries
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (entry_id, user_id),
            fetch_one=True,
        )

        if updated and updated.get("entry_date"):
            updated["entry_date"] = updated["entry_date"].isoformat()
        if updated and updated.get("created_at"):
            updated["created_at"] = updated["created_at"].isoformat()

        return jsonify({"message": "Entry updated", "entry": updated}), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update entry: {str(e)}"}), 500


@weight_management_bp.route("/weight/entries", methods=["POST"])
@jwt_required()
def create_weight_entry():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}

        weight_kg = _as_positive_float(data.get("weight_kg"), "weight_kg")
        height_cm = _as_positive_float(data.get("height_cm"), "height_cm")

        age_years = data.get("age_years")
        if age_years in (None, ""):
            age_years_i = None
        else:
            try:
                age_years_i = int(age_years)
            except (TypeError, ValueError):
                return jsonify({"error": "age_years must be an integer"}), 400
            if age_years_i <= 0 or age_years_i > 130:
                return jsonify({"error": "age_years must be between 1 and 130"}), 400

        entry_dt = _parse_entry_date(data.get("entry_date"))
        bmi = _compute_bmi(weight_kg=weight_kg, height_cm=height_cm)

        entry_id = execute_query(
            """
            INSERT INTO weight_entries (user_id, entry_date, weight_kg, height_cm, age_years, bmi)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, entry_dt, weight_kg, height_cm, age_years_i, bmi),
            commit=True,
        )

        return (
            jsonify(
                {
                    "message": "Entry saved",
                    "entry": {
                        "id": entry_id,
                        "entry_date": entry_dt.isoformat(),
                        "weight_kg": weight_kg,
                        "height_cm": height_cm,
                        "age_years": age_years_i,
                        "bmi": bmi,
                    },
                }
            ),
            201,
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to save entry: {str(e)}"}), 500


@weight_management_bp.route("/weight/goal", methods=["GET"])
@jwt_required()
def get_weight_goal():
    try:
        user_id = int(get_jwt_identity())
        goal = execute_query(
            """
            SELECT id, start_weight_kg, target_weight_kg, start_date, target_date, is_active, created_at, updated_at
            FROM weight_goals
            WHERE user_id = %s AND is_active = TRUE
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,),
            fetch_one=True,
        )

        if not goal:
            return jsonify({"goal": None}), 200

        for k in ("start_date", "target_date"):
            if goal.get(k):
                goal[k] = goal[k].isoformat()
        for k in ("created_at", "updated_at"):
            if goal.get(k):
                goal[k] = goal[k].isoformat()

        return jsonify({"goal": goal}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch goal: {str(e)}"}), 500


@weight_management_bp.route("/weight/goal", methods=["POST"])
@jwt_required()
def set_weight_goal():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}

        target_weight_kg = _as_positive_float(data.get("target_weight_kg"), "target_weight_kg")
        target_date = data.get("target_date")
        if target_date:
            try:
                target_date_parsed = datetime.strptime(target_date, "%Y-%m-%d").date()
            except Exception:
                return jsonify({"error": "target_date must be YYYY-MM-DD"}), 400
        else:
            target_date_parsed = None

        latest = execute_query(
            """
            SELECT entry_date, weight_kg
            FROM weight_entries
            WHERE user_id = %s
            ORDER BY entry_date DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
            fetch_one=True,
        )

        start_weight = latest.get("weight_kg") if latest else None
        start_date = latest.get("entry_date") if latest else None

        # Deactivate previous goals
        execute_query(
            "UPDATE weight_goals SET is_active = FALSE WHERE user_id = %s AND is_active = TRUE",
            (user_id,),
            commit=True,
        )

        goal_id = execute_query(
            """
            INSERT INTO weight_goals (user_id, start_weight_kg, target_weight_kg, start_date, target_date, is_active)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            """,
            (user_id, start_weight, target_weight_kg, start_date, target_date_parsed),
            commit=True,
        )

        return (
            jsonify(
                {
                    "message": "Goal set",
                    "goal": {
                        "id": goal_id,
                        "start_weight_kg": float(start_weight) if start_weight is not None else None,
                        "target_weight_kg": target_weight_kg,
                        "start_date": start_date.isoformat() if start_date else None,
                        "target_date": target_date_parsed.isoformat() if target_date_parsed else None,
                        "is_active": True,
                    },
                }
            ),
            201,
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to set goal: {str(e)}"}), 500


@weight_management_bp.route("/weight/suggestions", methods=["POST"])
@jwt_required()
def get_weight_suggestions():
    """Return AI-generated diet/exercise suggestions based on latest entry + goal."""
    try:
        user_id = int(get_jwt_identity())

        latest = execute_query(
            """
            SELECT entry_date, weight_kg, height_cm, age_years, bmi
            FROM weight_entries
            WHERE user_id = %s
            ORDER BY entry_date DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
            fetch_one=True,
        )
        if not latest:
            return jsonify({"error": "No weight entries yet. Add an entry first."}), 400

        goal = execute_query(
            """
            SELECT target_weight_kg, target_date
            FROM weight_goals
            WHERE user_id = %s AND is_active = TRUE
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,),
            fetch_one=True,
        )

        result = generate_weight_recommendations(
            weight_kg=float(latest["weight_kg"]),
            height_cm=float(latest["height_cm"]),
            age_years=int(latest["age_years"]) if latest.get("age_years") is not None else None,
            bmi=float(latest["bmi"]),
            goal_target_weight_kg=float(goal["target_weight_kg"]) if goal and goal.get("target_weight_kg") is not None else None,
            goal_target_date=goal.get("target_date").isoformat() if goal and goal.get("target_date") else None,
        )

        return jsonify({"recommendations": result.get("payload")}), 200

    except RuntimeError as e:
        # e.g. GEMINI_API_KEY not set
        return jsonify({"error": f"AI suggestions unavailable: {str(e)}"}), 503
    except Exception as e:
        # Try to detect common Gemini permission errors (revoked/leaked key)
        try:
            from google.api_core.exceptions import PermissionDenied

            if isinstance(e, PermissionDenied):
                return (
                    jsonify(
                        {
                            "error": "AI suggestions unavailable: Gemini permission denied. Your API key may be invalid or revoked (often due to being reported as leaked). Create a new key in Google AI Studio, set GEMINI_API_KEY in backend/.env, and restart the backend."
                        }
                    ),
                    503,
                )
        except Exception:
            pass

        return jsonify({"error": f"Failed to generate suggestions: {str(e)}"}), 500
