from __future__ import annotations

import io


def test_simplify_falls_back_to_text_when_multimodal_fails(monkeypatch, client, auth_header):
    # Patch OCR to return some text
    import routes.reports as reports_mod

    monkeypatch.setattr(reports_mod, "_ocr_bytes", lambda *, ext, data: ("Morning 135 90\nNight 145 95", 91.2))

    # Force multimodal to fail
    monkeypatch.setattr(reports_mod, "explain_bytes_with_gemini", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("vision down")))

    # Text fallback should be used
    monkeypatch.setattr(reports_mod, "simplify_ocr_text", lambda text, *, model: f"FALLBACK({model}): {text[:10]}")

    # Stub DB calls
    calls = {"insert": None, "select": None}

    def fake_execute_query(sql, params, commit=False, fetch_one=False, fetch_all=False):
        if "INSERT INTO medical_reports" in sql:
            calls["insert"] = (sql, params, commit)
            return 42
        if "SELECT id, file_name, uploaded_at" in sql:
            calls["select"] = (sql, params, fetch_one)
            return {"id": 42, "file_name": params and params[0] and "report.png", "uploaded_at": None}
        raise AssertionError(f"Unexpected SQL: {sql}")

    monkeypatch.setattr(reports_mod, "execute_query", fake_execute_query)

    data = {"file": (io.BytesIO(b"fake-image-bytes"), "report.png")}
    resp = client.post("/api/reports/simplify", data=data, headers=auth_header, content_type="multipart/form-data")

    assert resp.status_code == 201, resp.get_data(as_text=True)
    payload = resp.get_json()
    assert payload["report_id"] == 42
    assert payload["file_name"] == "report.png"
    assert payload["text"].startswith("Morning")
    assert payload["explanation"].startswith("FALLBACK(")

    # Ensure we saved OCR text and fallback explanation
    assert calls["insert"] is not None
    _, insert_params, _ = calls["insert"]
    # (user_id, filename, ocr_text, explanation, report_type)
    assert insert_params[0] == 123
    assert insert_params[1] == "report.png"
    assert "Morning" in insert_params[2]
    assert insert_params[3].startswith("FALLBACK(")


def test_simplify_uses_multimodal_even_when_ocr_empty(monkeypatch, client, auth_header):
    import routes.reports as reports_mod

    monkeypatch.setattr(reports_mod, "_ocr_bytes", lambda *, ext, data: ("", None))

    # Multimodal works
    monkeypatch.setattr(reports_mod, "explain_bytes_with_gemini", lambda file_bytes, *, mime_type, model: "VISION OK")

    # If fallback is called, that would be a bug in this scenario
    def fail_simplify(*args, **kwargs):
        raise AssertionError("simplify_ocr_text should not be called when multimodal succeeds")

    monkeypatch.setattr(reports_mod, "simplify_ocr_text", fail_simplify)

    def fake_execute_query(sql, params, commit=False, fetch_one=False, fetch_all=False):
        if "INSERT INTO medical_reports" in sql:
            return 7
        if "SELECT id, file_name, uploaded_at" in sql:
            return {"id": 7, "file_name": "empty-ocr.jpg", "uploaded_at": None}
        raise AssertionError(f"Unexpected SQL: {sql}")

    monkeypatch.setattr(reports_mod, "execute_query", fake_execute_query)

    data = {"file": (io.BytesIO(b"fake-jpeg-bytes"), "empty-ocr.jpg")}
    resp = client.post("/api/reports/simplify", data=data, headers=auth_header, content_type="multipart/form-data")

    assert resp.status_code == 201, resp.get_data(as_text=True)
    payload = resp.get_json()
    assert payload["report_id"] == 7
    assert payload["text"].startswith("[OCR failed")
    assert payload["explanation"] == "VISION OK"
