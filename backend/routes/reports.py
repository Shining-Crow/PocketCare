import os
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename

from config import Config
from utils.auth_utils import jwt_required_custom
from utils.database import execute_query
from utils.gemini_utils import explain_bytes_with_gemini, simplify_ocr_text
from utils.ocr_utils import extract_text_from_image_bytes
from utils.pdf_utils import extract_text_from_pdf_bytes

reports_bp = Blueprint("reports", __name__)


_ALLOWED_REPORT_EXTS = {"png", "jpg", "jpeg", "pdf"}


def _gemini_error_response(exc: Exception):
    """Map Gemini/GenAI failures to user-friendly HTTP responses."""

    # Default
    status_code = 500
    error = "Gemini failed"
    message = str(exc)

    # Common config issues
    if isinstance(exc, RuntimeError) and "GEMINI_API_KEY" in str(exc):
        return (
            jsonify(
                {
                    "error": "AI unavailable",
                    "message": "AI service is not configured on the server (missing API key).",
                }
            ),
            503,
        )

    # Try to use google.api_core exceptions when available.
    try:
        from google.api_core.exceptions import (
            PermissionDenied,
            ResourceExhausted,
            ServiceUnavailable,
            TooManyRequests,
        )

        if isinstance(exc, (ServiceUnavailable, ResourceExhausted, TooManyRequests)):
            status_code = 503
            error = "AI busy"
            message = "The AI service is currently busy (overloaded). Please try again in a moment."

        if isinstance(exc, PermissionDenied):
            status_code = 503
            error = "AI unavailable"
            message = (
                "AI permission denied. The API key may be invalid or revoked. "
                "Create a new key in Google AI Studio, set GEMINI_API_KEY in backend/.env, and restart the backend."
            )
    except Exception:
        pass

    # Fallback string heuristics (covers cases where upstream wraps errors)
    raw = (str(exc) or "").lower()
    if "model is overloaded" in raw or ("503" in raw and "unavailable" in raw):
        status_code = 503
        error = "AI busy"
        message = "The AI service is currently busy (overloaded). Please try again in a moment."

    return jsonify({"error": error, "message": message}), status_code


def _as_user_id() -> int:
    ident = get_jwt_identity()
    try:
        return int(ident)
    except Exception:
        raise ValueError("Invalid user identity")


def _ocr_bytes(*, ext: str, data: bytes):
    if ext == "pdf":
        return extract_text_from_pdf_bytes(data)
    return extract_text_from_image_bytes(data)


@reports_bp.route("/ocr", methods=["POST"])
@jwt_required_custom
def ocr_report():
    """Extract raw text from an uploaded report image using Tesseract.

    Request: multipart/form-data with field 'file'
    Response: { text: str, confidence: number|null }
    """

    _ = _as_user_id()  # Ensure request is authenticated

    if "file" not in request.files:
        return jsonify({"error": "Missing file", "message": "Send multipart field 'file'"}), 400

    f = request.files["file"]
    if not f or not getattr(f, "filename", ""):
        return jsonify({"error": "Invalid file", "message": "No file selected"}), 400

    filename = secure_filename(f.filename)
    ext = (Path(filename).suffix or "").lstrip(".").lower()

    if ext not in _ALLOWED_REPORT_EXTS:
        return jsonify(
            {
                "error": "Unsupported file type",
                "message": f"Allowed: {', '.join(sorted(_ALLOWED_REPORT_EXTS))}",
            }
        ), 400

    image_bytes = f.read()
    if not image_bytes:
        return jsonify({"error": "Empty file", "message": "Uploaded file is empty"}), 400

    # Optional: save original upload for debugging/auditing later.
    # For MVP we keep it off by default.
    if (os.getenv("SAVE_OCR_UPLOADS") or "").strip().lower() in {"1", "true", "yes"}:
        base = Path(Config.UPLOAD_FOLDER) / "reports"
        base.mkdir(parents=True, exist_ok=True)
        (base / filename).write_bytes(image_bytes)

    try:
        text, confidence = _ocr_bytes(ext=ext, data=image_bytes)
        return jsonify({"text": text, "confidence": confidence}), 200
    except Exception as exc:
        return jsonify({"error": "OCR failed", "message": str(exc)}), 500


@reports_bp.route("/explain", methods=["POST"])
@jwt_required_custom
def explain_report_text():
    """Convert OCR text into a simpler explanation using Gemini.

    Request: JSON { text: str, model?: str }
    Response: { explanation: str, model: str }
    """

    _ = _as_user_id()  # Ensure request is authenticated

    data = request.get_json(silent=True) or {}
    raw_text = (data.get("text") or "").strip()

    if not raw_text:
        return jsonify({"error": "Missing text", "message": "Send JSON body with non-empty 'text'"}), 400

    model = (data.get("model") or "gemini-3-flash-preview").strip()

    try:
        explanation = simplify_ocr_text(raw_text, model=model)
        return jsonify({"explanation": explanation, "model": model}), 200
    except ValueError as exc:
        return jsonify({"error": "Invalid input", "message": str(exc)}), 400
    except Exception as exc:
        return _gemini_error_response(exc)


@reports_bp.route("/simplify", methods=["POST"])
@jwt_required_custom
def simplify_report_and_save():
    """Upload a report, OCR it, simplify with Gemini, and save to history.

    Request: multipart/form-data with field 'file' and optional 'model'
    Response: { report_id: int, file_name: str, explanation: str, model: str, uploaded_at: str }
    """

    try:
        user_id = _as_user_id()
    except Exception as exc:
        return jsonify({"error": "Unauthorized", "message": str(exc)}), 401

    if "file" not in request.files:
        return jsonify({"error": "Missing file", "message": "Send multipart field 'file'"}), 400

    f = request.files["file"]
    if not f or not getattr(f, "filename", ""):
        return jsonify({"error": "Invalid file", "message": "No file selected"}), 400

    filename = secure_filename(f.filename)
    ext = (Path(filename).suffix or "").lstrip(".").lower()
    if ext not in _ALLOWED_REPORT_EXTS:
        return (
            jsonify(
                {
                    "error": "Unsupported file type",
                    "message": f"Allowed: {', '.join(sorted(_ALLOWED_REPORT_EXTS))}",
                }
            ),
            400,
        )

    model = (request.form.get("model") or request.args.get("model") or "gemini-3-flash-preview").strip()

    data = f.read()
    if not data:
        return jsonify({"error": "Empty file", "message": "Uploaded file is empty"}), 400

    try:
        ocr_text, confidence = _ocr_bytes(ext=ext, data=data)

        # Keep OCR for database/search even if it's imperfect.
        if not (ocr_text or "").strip():
            ocr_text = "[OCR failed to extract text, but AI analysis may still succeed]"
            confidence = None

        # Accuracy upgrade: for the explanation, prefer Gemini multimodal analysis
        # using the original file bytes so tables/columns/layout are preserved.
        if ext == "pdf":
            mime_type = "application/pdf"
        elif ext == "png":
            mime_type = "image/png"
        else:
            mime_type = "image/jpeg"

        try:
            explanation = explain_bytes_with_gemini(data, mime_type=mime_type, model=model)
        except Exception:
            # Fallback: keep the original behavior if vision/PDF analysis fails.
            # This prevents regressions on environments/models that don't support multimodal.
            if (ocr_text or "").strip() and not ocr_text.startswith("[OCR failed"):
                explanation = simplify_ocr_text(ocr_text, model=model)
            else:
                raise

        report_id = execute_query(
            """
            INSERT INTO medical_reports (user_id, file_name, ocr_text, ai_interpretation, report_type)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, filename, ocr_text, explanation, None),
            commit=True,
        )

        row = execute_query(
            """
            SELECT id, file_name, uploaded_at
            FROM medical_reports
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (report_id, user_id),
            fetch_one=True,
        )

        uploaded_at = None
        if row and row.get("uploaded_at"):
            try:
                uploaded_at = row["uploaded_at"].isoformat()
            except Exception:
                uploaded_at = str(row.get("uploaded_at"))

        return (
            jsonify(
                {
                    "report_id": int(report_id),
                    "file_name": filename,
                    "text": ocr_text,
                    "confidence": confidence,
                    "explanation": explanation,
                    "model": model,
                    "uploaded_at": uploaded_at,
                }
            ),
            201,
        )

    except ValueError as exc:
        return jsonify({"error": "Invalid input", "message": str(exc)}), 400
    except RuntimeError as exc:
        # e.g. GEMINI_API_KEY not set
        return _gemini_error_response(exc)
    except Exception as exc:
        res, code = _gemini_error_response(exc)
        # Keep the endpoint-specific top-level error label for non-503 errors.
        if code >= 500 and code != 503:
            payload = res.get_json(silent=True) or {}
            payload["error"] = "Simplify failed"
            return jsonify(payload), code
        return res, code


@reports_bp.route("/history", methods=["GET"])
@jwt_required_custom
def list_report_history():
    """List saved OCR+AI report explanations for the current user."""

    try:
        user_id = _as_user_id()
        limit = request.args.get("limit", "20")
        try:
            limit_i = max(1, min(int(limit), 100))
        except Exception:
            limit_i = 20

        rows = execute_query(
            """
            SELECT id, file_name, ai_interpretation, uploaded_at
            FROM medical_reports
            WHERE user_id = %s
            ORDER BY uploaded_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, limit_i),
            fetch_all=True,
        )

        for r in rows or []:
            if r.get("uploaded_at"):
                try:
                    r["uploaded_at"] = r["uploaded_at"].isoformat()
                except Exception:
                    r["uploaded_at"] = str(r.get("uploaded_at"))

        return jsonify({"history": rows or []}), 200
    except Exception as exc:
        return jsonify({"error": "Failed to fetch history", "message": str(exc)}), 500


@reports_bp.route("/history", methods=["DELETE"])
@jwt_required_custom
def clear_report_history():
    """Clear all saved report history for the current user."""

    try:
        user_id = _as_user_id()
        execute_query(
            "DELETE FROM medical_reports WHERE user_id = %s",
            (user_id,),
            commit=True,
        )
        return jsonify({"message": "History cleared"}), 200
    except Exception as exc:
        return jsonify({"error": "Failed to clear history", "message": str(exc)}), 500
