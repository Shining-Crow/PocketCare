from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from utils.auth_utils import jwt_required_custom
from utils.database import execute_query


activity_bp = Blueprint("activity", __name__)


def _as_user_id() -> int:
    ident = get_jwt_identity()
    try:
        return int(ident)
    except Exception:
        raise ValueError("Invalid user identity")


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    return str(value)


def _dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str):
        # Best-effort parse for ISO-ish strings.
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _preview(text: Any, max_len: int = 80) -> Optional[str]:
    if text is None:
        return None
    s = str(text).strip()
    if not s:
        return None
    s = " ".join(s.split())
    if len(s) <= max_len:
        return s
    return s[: max_len - 1] + "…"


@activity_bp.route("/recent", methods=["GET"])
@jwt_required_custom
def get_recent_activity():
    """Return a unified recent-activity feed (default last 3).

    Aggregates across: appointments, symptom analyses, report processing,
    weight tracking, and chat.
    """

    try:
        user_id = _as_user_id()
    except Exception as exc:
        return jsonify({"error": "Unauthorized", "message": str(exc)}), 401

    limit_raw = (request.args.get("limit") or "3").strip()
    try:
        limit = int(limit_raw)
    except Exception:
        limit = 3
    limit = max(1, min(limit, 10))

    # Pull a few extra per source so sorting across sources works well.
    per_source = max(5, min(25, limit * 5))

    activities: List[Dict[str, Any]] = []

    # Appointments
    try:
        rows = execute_query(
            """
            SELECT a.id, a.created_at, a.status, a.appointment_date, a.appointment_time,
                   d.name AS doctor_name, d.specialty AS doctor_specialty
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.user_id = %s
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT %s
            """,
            (user_id, per_source),
            fetch_all=True,
        )
        for r in rows or []:
            status = (r.get("status") or "").strip()
            doctor_name = (r.get("doctor_name") or "").strip()
            doctor_specialty = (r.get("doctor_specialty") or "").strip()
            appt_date = _iso(r.get("appointment_date"))
            appt_time = _iso(r.get("appointment_time"))
            activities.append(
                {
                    "type": "appointment",
                    "timestamp": _iso(r.get("created_at")),
                    "title": f"Appointment booked with Dr. {doctor_name}" if doctor_name else "Appointment booked",
                    "subtitle": (
                        f"{doctor_specialty} • {appt_date} {str(appt_time or '')[:5]}".strip()
                        if (doctor_specialty or appt_date or appt_time)
                        else None
                    ),
                    "meta": {
                        "appointment_id": r.get("id"),
                        "status": status or None,
                        "doctor_name": doctor_name or None,
                        "doctor_specialty": doctor_specialty or None,
                        "appointment_date": appt_date,
                        "appointment_time": appt_time,
                    },
                }
            )
    except Exception:
        # Activity feed is best-effort; a broken source shouldn't break the dashboard.
        pass

    # Symptom analysis
    try:
        rows = execute_query(
            """
            SELECT id, created_at, recommended_specialty, urgency_level
            FROM symptom_logs
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, per_source),
            fetch_all=True,
        )
        for r in rows or []:
            specialty = (r.get("recommended_specialty") or "").strip()
            urgency = (r.get("urgency_level") or "").strip()
            subtitle_bits = []
            if specialty:
                subtitle_bits.append(f"Recommended: {specialty}")
            if urgency:
                subtitle_bits.append(f"Urgency: {urgency}")
            activities.append(
                {
                    "type": "symptom_analysis",
                    "timestamp": _iso(r.get("created_at")),
                    "title": "Symptom analysis completed",
                    "subtitle": " • ".join(subtitle_bits) if subtitle_bits else None,
                    "meta": {
                        "symptom_log_id": r.get("id"),
                        "recommended_specialty": specialty or None,
                        "urgency_level": urgency or None,
                    },
                }
            )
    except Exception:
        pass

    # Report processing (simplify + save history)
    try:
        rows = execute_query(
            """
            SELECT id, file_name, uploaded_at
            FROM medical_reports
            WHERE user_id = %s
            ORDER BY uploaded_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, per_source),
            fetch_all=True,
        )
        for r in rows or []:
            file_name = (r.get("file_name") or "").strip()
            activities.append(
                {
                    "type": "report",
                    "timestamp": _iso(r.get("uploaded_at")),
                    "title": "Report processed",
                    "subtitle": file_name or None,
                    "meta": {
                        "report_id": r.get("id"),
                        "file_name": file_name or None,
                    },
                }
            )
    except Exception:
        pass

    # Weight tracking
    try:
        rows = execute_query(
            """
            SELECT id, created_at, weight_kg, bmi
            FROM weight_entries
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, per_source),
            fetch_all=True,
        )
        for r in rows or []:
            weight_kg = r.get("weight_kg")
            bmi = r.get("bmi")
            subtitle = None
            if weight_kg is not None and bmi is not None:
                subtitle = f"{weight_kg} kg • BMI {bmi}"
            elif weight_kg is not None:
                subtitle = f"{weight_kg} kg"
            activities.append(
                {
                    "type": "weight_entry",
                    "timestamp": _iso(r.get("created_at")),
                    "title": "Weight entry saved",
                    "subtitle": subtitle,
                    "meta": {
                        "weight_entry_id": r.get("id"),
                        "weight_kg": weight_kg,
                        "bmi": bmi,
                    },
                }
            )
    except Exception:
        pass

    # Weight goals
    try:
        rows = execute_query(
            """
            SELECT id, created_at, target_weight_kg, target_date, is_active
            FROM weight_goals
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, per_source),
            fetch_all=True,
        )
        for r in rows or []:
            target_weight = r.get("target_weight_kg")
            target_date = _iso(r.get("target_date"))
            active = r.get("is_active")
            subtitle_bits = []
            if target_weight is not None:
                subtitle_bits.append(f"Target: {target_weight} kg")
            if target_date:
                subtitle_bits.append(f"By: {target_date}")
            if active is not None:
                subtitle_bits.append("Active" if bool(active) else "Inactive")
            activities.append(
                {
                    "type": "weight_goal",
                    "timestamp": _iso(r.get("created_at")),
                    "title": "Weight goal updated",
                    "subtitle": " • ".join(subtitle_bits) if subtitle_bits else None,
                    "meta": {
                        "weight_goal_id": r.get("id"),
                        "target_weight_kg": target_weight,
                        "target_date": target_date,
                        "is_active": bool(active) if active is not None else None,
                    },
                }
            )
    except Exception:
        pass

    # Chat (single most recent message, either side, with a preview)
    try:
        rows = execute_query(
            """
            SELECT id, created_at, message, sender
            FROM chat_messages
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
            fetch_all=True,
        )
        for r in rows or []:
            sender = (r.get("sender") or "").strip().lower()
            msg_preview = _preview(r.get("message"))
            if msg_preview:
                if sender == "user":
                    msg_preview = f"You: {msg_preview}"
                elif sender == "ai":
                    msg_preview = f"Sage: {msg_preview}"
            activities.append(
                {
                    "type": "chat",
                    "timestamp": _iso(r.get("created_at")),
                    "title": "Chat with Sage",
                    "subtitle": msg_preview,
                    "meta": {
                        "chat_message_id": r.get("id"),
                        "message_preview": msg_preview,
                    },
                }
            )
    except Exception:
        pass

    # Sort by timestamp desc. Unknown timestamps go last.
    def sort_key(item: Dict[str, Any]) -> Tuple[int, float]:
        dt = _dt(item.get("timestamp"))
        if not dt:
            return (1, 0.0)
        return (0, dt.timestamp())

    activities.sort(key=sort_key, reverse=True)
    return jsonify({"activities": activities[:limit]}), 200
