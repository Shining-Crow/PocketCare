import json
import os
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import requests
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from config import Config
from utils.auth_utils import jwt_required_custom
from utils.database import execute_query
from utils.validators import validate_required_fields

symptoms_bp = Blueprint("symptoms", __name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", Config.GEMINI_API_KEY)
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="
    + (GEMINI_API_KEY or "")
)
_SPECIALTY_CANON = [
    "General Practice",
    "Cardiology",
    "Dermatology",
    "Neurology",
    "Pediatrics",
    "Oncology",
    "Ophthalmology",
    "Dentistry",
    "ENT",
    "Orthopedics",
    "Gastroenterology",
    "Pulmonology",
    "Psychiatry",
    "Gynecology",
    "Urology",
]


_SPECIALTY_CACHE: Dict[str, Any] = {"ts": 0.0, "names": None}


_SPECIALTY_SYNONYMS = {
    "family medicine": "General Practice",
    "general medicine": "General Practice",
    "primary care": "General Practice",
    "gp": "General Practice",
    "orthopedic": "Orthopedics",
    "ortho": "Orthopedics",
    "orthopaedics": "Orthopedics",
    "ear nose throat": "ENT",
    "otolaryngology": "ENT",
    "ophthalmologist": "Ophthalmology",
    "eye": "Ophthalmology",
    "gyn": "Gynecology",
    "obgyn": "Gynecology",
    "pulmonary": "Pulmonology",
    "respiratory": "Pulmonology",
    "psych": "Psychiatry",
}


def _get_allowed_specialties() -> List[str]:
    """Return canonical specialty names from DB, with a short TTL cache.

    Falls back to a small hardcoded list if DB table is missing.
    """

    now = time.time()
    cached = _SPECIALTY_CACHE.get("names")
    ts = float(_SPECIALTY_CACHE.get("ts") or 0.0)
    if cached and (now - ts) < 60:
        return list(cached)

    try:
        rows = execute_query(
            "SELECT name FROM specialties ORDER BY name ASC",
            fetch_all=True,
        )
        names = [r.get("name") for r in (rows or []) if r.get("name")]
        if names:
            _SPECIALTY_CACHE["ts"] = now
            _SPECIALTY_CACHE["names"] = list(names)
            return names
    except Exception:
        pass

    return list(_SPECIALTY_CANON)


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None

    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # Try direct parse first
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Fallback: find first {...} block
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        parsed = json.loads(cleaned[start : end + 1])
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return None

    return None


def _normalize_urgency(value: str) -> str:
    v = (value or "").strip().lower()
    if v in {"low", "medium", "high"}:
        return v
    if v in {"urgent", "emergency", "critical"}:
        return "high"
    if v in {"moderate"}:
        return "medium"
    return "medium"


def _normalize_specialty(value: Optional[str], allowed: List[str]) -> str:
    raw = (value or "").strip()
    if not raw:
        return "General Practice"

    allowed_lower = {a.lower(): a for a in (allowed or [])}
    lowered = raw.lower()

    # Direct match against DB specialties
    if lowered in allowed_lower:
        return allowed_lower[lowered]

    # Synonym match
    mapped = _SPECIALTY_SYNONYMS.get(lowered)
    if mapped and mapped.lower() in allowed_lower:
        return allowed_lower[mapped.lower()]

    # Soft heuristics
    if ("general" in lowered or "primary" in lowered) and "general practice" in allowed_lower:
        return allowed_lower["general practice"]
    if "ortho" in lowered and "orthopedics" in allowed_lower:
        return allowed_lower["orthopedics"]
    if "ent" in lowered and "ent" in allowed_lower:
        return allowed_lower["ent"]

    # Final safe fallback
    if "general practice" in allowed_lower:
        return allowed_lower["general practice"]
    return "General Practice"


def _gemini_symptom_analysis(
    payload: Dict[str, Any], allowed_specialties: List[str]
) -> Tuple[str, Optional[Dict[str, Any]]]:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")

    symptoms = (payload.get("symptoms") or "").strip()
    age = payload.get("age")
    gender = (payload.get("gender") or "").strip()
    duration = (payload.get("duration") or "").strip()
    medical_history = (payload.get("medical_history") or "").strip()
    medications = (payload.get("medications") or "").strip()

    allowed_list = ", ".join([s for s in allowed_specialties if s])

    # Ask for strict JSON we can store + display.
    prompt = (
        "You are a medical routing assistant. You do NOT diagnose. "
        "Given the user's symptoms and context, recommend the most appropriate medical specialty "
        "and an urgency level. Keep it safe: if red-flag symptoms are present, set urgency_level to 'high'.\n\n"
        "Choose recommended_specialty from this exact list. If unsure, choose General Practice:\n"
        f"{allowed_list}\n\n"
        "Return ONLY valid JSON with these keys exactly:\n"
        "{\n"
        '  "recommended_specialty": "...",\n'
        '  "urgency_level": "low|medium|high",\n'
        '  "summary": "1-3 sentences",\n'
        '  "reasoning": "brief",\n'
        '  "red_flags": ["..."],\n'
        '  "next_steps": ["..."],\n'
        '  "disclaimer": "..."\n'
        "}\n\n"
        f"Symptoms: {symptoms}\n"
        f"Age: {age if age is not None else ''}\n"
        f"Gender: {gender}\n"
        f"Duration: {duration}\n"
        f"Medical history: {medical_history}\n"
        f"Medications: {medications}\n\n"
        "Return ONLY JSON. No markdown."
    )

    req = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ]
    }

    resp = requests.post(GEMINI_API_URL, json=req, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    ai_text = data["candidates"][0]["content"]["parts"][0]["text"]

    parsed = _extract_json_object(ai_text)
    return ai_text, parsed


@symptoms_bp.route("/analyze", methods=["POST"])
@jwt_required_custom
def analyze_symptoms():
    try:
        raw_identity = get_jwt_identity()
        try:
            user_id = int(raw_identity)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid authentication identity"}), 401
        data = request.get_json() or {}

        is_valid, error = validate_required_fields(data, ["symptoms"])
        if not is_valid:
            return jsonify({"error": error}), 400

        symptoms_text = (data.get("symptoms") or "").strip()
        if len(symptoms_text) < 5:
            return jsonify({"error": "Please provide a bit more detail about your symptoms."}), 400

        allowed_specialties = _get_allowed_specialties()
        allowed_for_ai = [s for s in allowed_specialties if (s or "").strip().lower() != "other"]
        if not allowed_for_ai:
            allowed_for_ai = list(_SPECIALTY_CANON)

        ai_raw, ai_json = _gemini_symptom_analysis(data, allowed_for_ai)

        recommended_specialty = _normalize_specialty(
            (ai_json or {}).get("recommended_specialty") if ai_json else None,
            allowed_for_ai,
        )
        urgency_level = _normalize_urgency(
            (ai_json or {}).get("urgency_level") if ai_json else None
        )

        # Store raw model output for traceability.
        insert_query = """
            INSERT INTO symptom_logs (user_id, symptoms, ai_analysis, recommended_specialty, urgency_level, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        log_id = execute_query(
            insert_query,
            (
                user_id,
                symptoms_text,
                ai_raw,
                recommended_specialty,
                urgency_level,
                datetime.now(),
            ),
            commit=True,
        )

        return jsonify(
            {
                "id": log_id,
                "recommended_specialty": recommended_specialty,
                "urgency_level": urgency_level,
                "analysis": ai_json
                or {
                    "recommended_specialty": recommended_specialty,
                    "urgency_level": urgency_level,
                    "summary": ai_raw,
                    "disclaimer": "This is informational only and not a medical diagnosis.",
                },
                "raw": ai_raw,
            }
        )

    except requests.HTTPError as e:
        return jsonify({"error": "AI service error", "message": str(e)}), 502
    except Exception as e:
        return jsonify({"error": "Failed to analyze symptoms", "message": str(e)}), 500


@symptoms_bp.route("/history", methods=["GET"])
@jwt_required_custom
def symptom_history():
    try:
        raw_identity = get_jwt_identity()
        try:
            user_id = int(raw_identity)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid authentication identity"}), 401
        limit = request.args.get("limit", default=20, type=int)
        limit = max(1, min(limit, 100))

        rows = execute_query(
            """
            SELECT id, symptoms, ai_analysis, recommended_specialty, urgency_level, created_at
            FROM symptom_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, limit),
            fetch_all=True,
        )

        # Parse ai_analysis JSON if possible for nicer UI, otherwise omit heavy blob.
        history: List[Dict[str, Any]] = []
        for row in rows or []:
            ai_obj = _extract_json_object(row.get("ai_analysis") or "")
            history.append(
                {
                    "id": row["id"],
                    "symptoms": row["symptoms"],
                    "recommended_specialty": row.get("recommended_specialty"),
                    "urgency_level": row.get("urgency_level"),
                    "created_at": row.get("created_at").isoformat()
                    if row.get("created_at")
                    else None,
                    "analysis": ai_obj,
                }
            )

        return jsonify({"history": history})

    except Exception as e:
        return jsonify({"error": "Failed to fetch history", "message": str(e)}), 500
