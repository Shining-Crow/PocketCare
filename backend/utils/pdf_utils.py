import os
from typing import Optional, Tuple

from utils.ocr_utils import extract_text_from_image_bytes


def extract_text_from_pdf_bytes(
    pdf_bytes: bytes,
    *,
    lang: str = "eng",
    max_pages: int = 10,
) -> Tuple[str, Optional[float]]:
    """Extract text from a PDF by rendering pages to images and running OCR.

    Returns a combined text and an averaged confidence (best-effort).
    """

    if not pdf_bytes:
        raise ValueError("PDF is empty")

    try:
        import fitz  # PyMuPDF
    except Exception as exc:
        import sys

        raise RuntimeError(
            "PDF OCR dependency missing (PyMuPDF). "
            "Fix: run the backend using your project venv and run: `python -m pip install -r backend/requirements.txt`, then restart the backend. "
            f"Backend Python: {sys.executable} (v{sys.version.split()[0]})."
        ) from exc

    # Allow override via env for large PDFs.
    env_max_pages = (os.getenv("OCR_PDF_MAX_PAGES") or "").strip()
    if env_max_pages.isdigit():
        max_pages = max(1, int(env_max_pages))

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = doc.page_count
    if page_count == 0:
        return "", None

    if page_count > max_pages:
        raise ValueError(f"PDF has {page_count} pages; max allowed is {max_pages}. Split the PDF or increase OCR_PDF_MAX_PAGES.")

    combined_parts = []
    conf_sum = 0.0
    conf_n = 0

    # Render at a higher zoom for better OCR.
    zoom = float((os.getenv("OCR_PDF_RENDER_ZOOM") or "2.0").strip() or 2.0)
    matrix = fitz.Matrix(zoom, zoom)

    for idx in range(page_count):
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        image_bytes = pix.tobytes("png")

        text, conf = extract_text_from_image_bytes(image_bytes, lang=lang)
        label = f"--- Page {idx + 1} ---"
        combined_parts.append(f"{label}\n{text.strip()}".strip())

        if isinstance(conf, (int, float)):
            conf_sum += float(conf)
            conf_n += 1

    doc.close()

    combined_text = "\n\n".join([p for p in combined_parts if p])
    combined_conf = (conf_sum / conf_n) if conf_n else None
    return combined_text, combined_conf
