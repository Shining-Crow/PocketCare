import os
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename

from config import Config
from utils.auth_utils import jwt_required_custom
from utils.gemini_utils import simplify_ocr_text
from utils.ocr_utils import extract_text_from_image_bytes
from utils.pdf_utils import extract_text_from_pdf_bytes

reports_bp = Blueprint("reports", __name__)


_ALLOWED_REPORT_EXTS = {"png", "jpg", "jpeg", "pdf"}


@reports_bp.route("/ocr", methods=["POST"])
@jwt_required_custom
def ocr_report():
    """Extract raw text from an uploaded report image using Tesseract.

    Request: multipart/form-data with field 'file'
    Response: { text: str, confidence: number|null }
    """

    _ = get_jwt_identity()  # Ensure request is authenticated

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
        if ext == "pdf":
            text, confidence = extract_text_from_pdf_bytes(image_bytes)
        else:
            text, confidence = extract_text_from_image_bytes(image_bytes)
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

    _ = get_jwt_identity()  # Ensure request is authenticated

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
        return jsonify({"error": "Gemini failed", "message": str(exc)}), 500
