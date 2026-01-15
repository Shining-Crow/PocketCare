import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import api from "../utils/api";

function MedicalReports() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");

  const fileLabel = useMemo(() => {
    if (!file) return "Choose an image (png/jpg/jpeg)";
    return `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetAll = () => {
    setFile(null);
    setPreviewUrl("");
    setIsLoading(false);
    setOcrText("");
    setConfidence(null);
    setError("");
    setAiLoading(false);
    setAiError("");
    setAiExplanation("");
  };

  const copyText = async (text) => {
    const value = (text || "").trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const onPickFile = (e) => {
    setError("");
    setOcrText("");
    setConfidence(null);
    setAiError("");
    setAiExplanation("");

    const picked = e.target.files?.[0] || null;
    setFile(picked);
  };

  const runOcr = async () => {
    if (!file) {
      setError("Please select a report image first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setOcrText("");
    setConfidence(null);
    setAiError("");
    setAiExplanation("");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/reports/ocr", form);

      setOcrText(res.data?.text || "");
      setConfidence(
        typeof res.data?.confidence === "number" ? res.data.confidence : null
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "OCR failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const runExplain = async () => {
    if (!ocrText.trim()) {
      setAiError("Please extract (or paste) some text first.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiExplanation("");

    try {
      const res = await api.post("/reports/explain", {
        text: ocrText,
      });
      setAiExplanation(res.data?.explanation || "");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "AI explanation failed";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-[0_10px_30px_-15px_rgba(2,6,23,0.25)] backdrop-blur">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-violet-200/70 to-fuchsia-200/40 blur-2xl" />
            <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-200/70 to-blue-200/40 blur-2xl" />
          </div>

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  Medical Reports
                  <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                    OCR + AI
                  </span>
                </div>
                <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Scan a report. Get a simple explanation.
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                  Upload an image, extract the raw text with Tesseract, then use Gemini to rewrite it into something easier to read.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Upload + actions */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">1) Upload</h2>
                    <div className="text-xs text-slate-500">Images only (png/jpg/jpeg)</div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-800">
                          Report image
                        </label>
                        <p className="mt-1 text-xs text-slate-500">{fileLabel}</p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={onPickFile}
                          className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                        />
                        <p className="mt-2 text-[11px] text-slate-500">
                          PDFs are not enabled yet (image-only MVP).
                        </p>
                      </div>
                    </div>

                    {previewUrl ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img
                          src={previewUrl}
                          alt="Report preview"
                          className="h-44 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={runOcr}
                      disabled={isLoading || !file}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                        isLoading || !file
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : "bg-gradient-to-r from-slate-900 to-violet-700 text-white shadow hover:opacity-95"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      {isLoading ? "Extracting…" : "Extract Text"}
                    </button>

                    <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                      {ocrText.trim() ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          OCR ready{confidence !== null ? ` • ${confidence.toFixed(1)}% confidence` : ""}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Extract text to continue
                        </>
                      )}
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {error}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">2) Simplify with AI</h2>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Gemini rewrite (no diagnosis)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={runExplain}
                    disabled={aiLoading || !ocrText.trim()}
                    className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                      aiLoading || !ocrText.trim()
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white shadow hover:opacity-95"
                    }`}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {aiLoading ? "Simplifying…" : "Simplify"}
                  </button>

                  {aiError ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {aiError}
                    </div>
                  ) : null}

                  <div className="mt-4 text-[11px] text-slate-500">
                    Tip: if OCR text is messy, edit it first on the right.
                  </div>
                </div>
              </div>

              {/* Right: Results */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Extracted text</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        You can edit the text before simplifying.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {confidence !== null ? (
                        <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Confidence: {confidence.toFixed(1)}%
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => copyText(ocrText)}
                        disabled={!ocrText.trim()}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          !ocrText.trim()
                            ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        title="Copy extracted text"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    placeholder="OCR output will appear here…"
                    className="mt-4 w-full min-h-[260px] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Simple explanation</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Informational only — not a medical diagnosis.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(aiExplanation)}
                      disabled={!aiExplanation.trim()}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        !aiExplanation.trim()
                          ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      title="Copy AI explanation"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                  </div>

                  <textarea
                    value={aiExplanation}
                    readOnly
                    placeholder="AI explanation will appear here…"
                    className="mt-4 w-full min-h-[220px] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MedicalReports;
