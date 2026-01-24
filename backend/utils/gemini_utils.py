import os


def generate_weight_recommendations(
    *,
    weight_kg: float,
    height_cm: float,
    age_years: int | None,
    bmi: float,
    goal_target_weight_kg: float | None,
    goal_target_date: str | None,
    model: str = "gemini-3-flash-preview",
) -> dict:
    """Generate general diet/exercise suggestions based on weight history.

    Returns a dict with either a parsed JSON payload or a fallback text payload.
    """

    from google import genai

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

    goal_bits = []
    if goal_target_weight_kg is not None:
        goal_bits.append(f"Target weight: {goal_target_weight_kg} kg")
    if goal_target_date:
        goal_bits.append(f"Target date: {goal_target_date}")
    goal_text = " | ".join(goal_bits) if goal_bits else "No goal provided"

    age_text = str(age_years) if age_years is not None else "unknown"

    prompt = (
        "You are a health and fitness assistant for a healthcare app. "
        "Provide GENERAL, safe, non-diagnostic wellness advice. "
        "Do NOT provide a medical diagnosis or medication guidance. "
        "If any value seems concerning, recommend consulting a clinician.\n\n"
        "User metrics:\n"
        f"- Weight (kg): {weight_kg}\n"
        f"- Height (cm): {height_cm}\n"
        f"- Age (years): {age_text}\n"
        f"- BMI: {bmi}\n"
        f"- Goal: {goal_text}\n\n"
        "Return STRICT JSON with this shape:\n"
        "{\n"
        "  \"summary\": [\"...\"],\n"
        "  \"diet\": {\"principles\": [\"...\"], \"example_day\": [\"...\"]},\n"
        "  \"exercise\": {\"weekly_plan\": [\"...\"], \"notes\": [\"...\"]},\n"
        "  \"progress\": {\"how_to_track\": [\"...\"], \"weekly_targets\": [\"...\"]},\n"
        "  \"safety\": [\"...\"],\n"
        "  \"disclaimer\": \"...\"\n"
        "}\n"
    )

    response = client.models.generate_content(model=model, contents=prompt)
    text = getattr(response, "text", None)
    if not text:
        raise RuntimeError("Empty response from Gemini")

    raw = text.strip()

    # Best-effort JSON parsing (Gemini may wrap in markdown fences)
    import json
    cleaned = raw
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        # If it started with ```json, remove the leading 'json\n'
        cleaned = cleaned.replace("json\n", "", 1)
        cleaned = cleaned.strip()

    try:
        payload = json.loads(cleaned)
        return {"ok": True, "payload": payload}
    except Exception:
        return {"ok": True, "payload": {"text": raw, "disclaimer": "General information only; not medical advice."}}


def simplify_ocr_text(ocr_text: str, *, model: str = "gemini-3-flash-preview") -> str:
    if not (ocr_text or "").strip():
        raise ValueError("OCR text is empty")

    # Late import so the backend can still start without Gemini deps
    # unless this feature is called.
    from google import genai

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

    # Guardrail against very large OCR dumps
    max_chars = 20000
    trimmed = ocr_text.strip()
    if len(trimmed) > max_chars:
        trimmed = trimmed[:max_chars] + "\n\n[TRUNCATED]"

    # First, validate if the document is medical-related
    validation_prompt = (
        "You are a strict document classifier. Analyze the following OCR text and determine if it is from a MEDICAL/HEALTHCARE document.\n\n"
        "MEDICAL documents: lab reports, blood tests, X-rays, MRI/CT scans, "
        "prescriptions, medical bills from hospitals/clinics, discharge summaries, doctor's notes, "
        "pathology reports, vaccination records, health insurance claims, medical certificates, "
        "or any document directly related to patient healthcare or medical diagnosis.\n\n"
        "NON-MEDICAL documents: regular invoices, shopping receipts, calendars, "
        "event notices, personal letters, academic transcripts, ID cards, travel tickets, "
        "utility bills, tax forms, bank statements, resumes, contracts, or any document "
        "that is NOT directly related to medical/healthcare purposes.\n\n"
        "IMPORTANT: Be strict. If you are unsure or the document is ambiguous, treat it as non-medical.\n\n"
        "If this IS a medical document, respond with exactly: MEDICAL\n"
        "If this is NOT a medical document, respond with a helpful message in this format:\n"
        "NOT_MEDICAL: This appears to be a [document type]. Only health-related documents like lab reports, prescriptions, or medical records can be simplified here.\n\n"
        f"OCR TEXT:\n{trimmed}"
    )

    validation_response = client.models.generate_content(model=model, contents=validation_prompt)
    validation_text = (getattr(validation_response, "text", None) or "").strip()
    
    # Only proceed if the response is clearly MEDICAL
    if not validation_text.upper().startswith("MEDICAL"):
        # Extract the AI-generated message or use a default
        if validation_text.upper().startswith("NOT_MEDICAL:"):
            error_msg = validation_text[len("NOT_MEDICAL:"):].strip()
        else:
            error_msg = "Only health-related documents can be simplified. Please upload a medical document such as a lab report, prescription, X-ray, or diagnosis report."
        raise ValueError(error_msg)

    # Proceed with medical report simplification
    prompt = (
        "You are a helpful medical assistant.\n"
        "Rewrite the following OCR text from a medical document into a simple, easy-to-understand explanation.\n"
        "Rules:\n"
        "- Use plain language and short bullet points.\n"
        "- Do NOT invent details that are not present.\n"
        "- Do NOT provide a diagnosis.\n"
        "- If there are abnormal lab values or urgent warnings explicitly stated, highlight them as 'Important'.\n"
        "Output format:\n"
        "1) Summary (2-4 bullets)\n"
        "2) Key details (bullets)\n"
        "3) Next steps (2-4 bullets, general and safe)\n\n"
        "OCR TEXT:\n"
        f"{trimmed}"
    )

    response = client.models.generate_content(model=model, contents=prompt)
    text = getattr(response, "text", None)
    if not text:
        raise RuntimeError("Empty response from Gemini")
    return text.strip()


def explain_bytes_with_gemini(
    file_bytes: bytes,
    *,
    mime_type: str,
    model: str = "gemini-3-flash-preview",
) -> str:
    """Analyze an image/PDF directly with Gemini for better layout-aware extraction.

    This is intended for medical report understanding where tables/columns matter.
    """

    if not file_bytes:
        raise ValueError("File bytes are empty")
    if not (mime_type or "").strip():
        raise ValueError("mime_type is required")

    from google import genai
    from google.genai import types

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

    # First, validate if the document is medical-related
    validation_prompt = (
        "You are a strict document classifier. Analyze the attached document and determine if it is a MEDICAL/HEALTHCARE document.\n\n"
        "MEDICAL documents: lab reports, blood tests, X-rays, MRI/CT scans, "
        "prescriptions, medical bills from hospitals/clinics, discharge summaries, doctor's notes, "
        "pathology reports, vaccination records, health insurance claims, medical certificates, "
        "or any document directly related to patient healthcare or medical diagnosis.\n\n"
        "NON-MEDICAL documents: regular invoices, shopping receipts, calendars, "
        "event notices, personal letters, academic transcripts, ID cards, travel tickets, "
        "utility bills, tax forms, bank statements, resumes, contracts, or any document "
        "that is NOT directly related to medical/healthcare purposes.\n\n"
        "IMPORTANT: Be strict. If you are unsure or the document is ambiguous, treat it as non-medical.\n\n"
        "If this IS a medical document, respond with exactly: MEDICAL\n"
        "If this is NOT a medical document, respond with a helpful message in this format:\n"
        "NOT_MEDICAL: This appears to be a [document type]. Only health-related documents like lab reports, prescriptions, or medical records can be simplified here."
    )

    validation_contents = [
        types.Part.from_text(validation_prompt),
        types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
    ]

    validation_response = client.models.generate_content(model=model, contents=validation_contents)
    validation_text = (getattr(validation_response, "text", None) or "").strip()
    
    # Only proceed if the response is clearly MEDICAL
    if not validation_text.upper().startswith("MEDICAL"):
        # Extract the AI-generated message or use a default
        if validation_text.upper().startswith("NOT_MEDICAL:"):
            error_msg = validation_text[len("NOT_MEDICAL:"):].strip()
        else:
            error_msg = "Only health-related documents can be simplified. Please upload a medical document such as a lab report, prescription, X-ray, or diagnosis report."
        raise ValueError(error_msg)

    # Proceed with medical report analysis
    prompt = (
        "You are a helpful medical assistant. Analyze the attached medical report file.\n"
        "Rules:\n"
        "- Be accurate with numbers and units; keep them tied to the correct labels/rows/columns.\n"
        "- If a value is unclear/blurred, say so instead of guessing.\n"
        "- Do NOT invent details not present.\n"
        "- Do NOT provide a diagnosis or medication guidance.\n"
        "Output format:\n"
        "1) Summary (1-3 bullets)\n"
        "2) Key details (bullets; include dates, test names, and measured values)\n"
        "3) Notable findings (bullets; highlight abnormal/flagged values only if shown)\n"
        "4) Next steps (2-4 bullets; general and safe)\n"
    )

    contents = [
        types.Part.from_text(prompt),
        types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
    ]

    response = client.models.generate_content(model=model, contents=contents)
    text = getattr(response, "text", None)
    if not text:
        raise RuntimeError("Empty response from Gemini")
    return text.strip()
