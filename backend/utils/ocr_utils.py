import os
from typing import Any, Dict, Optional, Tuple


def _configure_tesseract_cmd() -> None:
    """Configure pytesseract to use a specific tesseract binary if provided.

    On Windows, users often need to install the Tesseract executable separately.
    Set TESSERACT_CMD to the full path, e.g.:
      C:\\Program Files\\Tesseract-OCR\\tesseract.exe
    """

    tesseract_cmd = (os.getenv("TESSERACT_CMD") or "").strip()
    if not tesseract_cmd:
        return

    try:
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    except Exception:
        # If pytesseract isn't installed yet, this will be handled by caller.
        return


def extract_text_from_image_bytes(
    image_bytes: bytes,
    *,
    lang: str = "eng",
) -> Tuple[str, Optional[float]]:
    """Run Tesseract OCR on an image (bytes) and return (text, confidence).

    Confidence is an average of word-level confidences when available, else None.
    """

    _configure_tesseract_cmd()

    try:
        from PIL import Image, ImageEnhance, ImageOps
        import pytesseract
    except Exception as exc:
        import sys
        raise RuntimeError(
            "OCR dependencies missing (Pillow/pytesseract). "
            "This usually means the backend is running with a different Python environment than the one you installed packages into. "
            f"Backend Python: {sys.executable} (v{sys.version.split()[0]}). "
            "Fix: run the backend using your project venv and run: `python -m pip install -r backend/requirements.txt`, then restart the backend."
        ) from exc

    from io import BytesIO

    image = Image.open(BytesIO(image_bytes))
    image = image.convert("RGB")

    # Light, safe preprocessing: grayscale + contrast boost.
    gray = ImageOps.grayscale(image)
    gray = ImageEnhance.Contrast(gray).enhance(1.6)

    # Main OCR text
    text = pytesseract.image_to_string(gray, lang=lang)

    # Confidence (best-effort)
    confidence: Optional[float] = None
    try:
        data: Dict[str, Any] = pytesseract.image_to_data(gray, lang=lang, output_type=pytesseract.Output.DICT)
        confs = []
        for c in data.get("conf", []) or []:
            try:
                v = float(c)
                if v >= 0:
                    confs.append(v)
            except Exception:
                continue
        if confs:
            confidence = sum(confs) / len(confs)
    except Exception:
        confidence = None

    return text, confidence
