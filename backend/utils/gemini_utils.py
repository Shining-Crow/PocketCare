import os


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

    prompt = (
        "You are a helpful medical assistant.\n"
        "Rewrite the following OCR text from a medical document into a simple, easy-to-understand explanation.\n"
        "Rules:\n"
        "- Use plain language and short bullet points.\n"
        "- If the text is NOT medical (e.g., a calendar/notice), say that clearly and summarize what it actually is.\n"
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
