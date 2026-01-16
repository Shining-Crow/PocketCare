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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../utils/api";

function MedicalReports() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");

  const fileLabel = useMemo(() => {
    if (!file) return "Choose a file (png/jpg/jpeg/pdf)";
    return `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }, [file]);

  const formattedExplanation = useMemo(() => {
    const raw = (aiExplanation || "").toString();
    const text = raw.replace(/\r\n/g, "\n").trim();
    if (!text) return "";

    const toHeading = (label) => {
      const clean = label
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\bai\b/i, "AI")
        .replace(/\bocr\b/i, "OCR");
      return `## ${clean}`;
    };

    const common = [
      "Summary",
      "Overview",
      "Key points",
      "Findings",
      "Interpretation",
      "What this means",
      "Normal ranges",
      "Possible causes",
      "Recommendations",
      "Next steps",
      "When to seek help",
      "Red flags",
      "Disclaimer",
    ];

    const normalized = text
      // Normalize bullets
      .replace(/^[\t ]*[•·]\s+/gm, "- ")
      // Improve spacing
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[\t ]+$/gm, "")
      // Convert common section labels into headings
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";

        for (const label of common) {
          const re = new RegExp(`^${label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*[:\\-]\\s*(.*)$`, "i");
          const m = trimmed.match(re);
          if (m) {
            const rest = (m[1] || "").trim();
            return rest ? `${toHeading(label)}\n${rest}` : toHeading(label);
          }

          // Handle labels that appear alone (e.g. "Summary")
          if (trimmed.toLowerCase() === label.toLowerCase()) {
            return toHeading(label);
          }
        }

        return line;
      })
      .join("\n")
      // Ensure a blank line after headings
      .replace(/^(##\s.+)$/gm, "$1\n");

    return normalized.trim();
  }, [aiExplanation]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    if ((file.type || "").toLowerCase() === "application/pdf") {
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
    setOcrText("");
    setConfidence(null);
    setError("");
    setOcrLoading(false);
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

  const runSimplify = async () => {
    if (!file) {
      setError("Please select a report file first.");
      return;
    }

    setError("");
    setAiError("");
    setAiExplanation("");

    setOcrLoading(true);
    setAiLoading(false);
    setOcrText("");
    setConfidence(null);

    let stage = "ocr";
    try {
      const form = new FormData();
      form.append("file", file);

      const ocrRes = await api.post("/reports/ocr", form);
      const extracted = (ocrRes.data?.text || "").toString();
      const conf =
        typeof ocrRes.data?.confidence === "number" ? ocrRes.data.confidence : null;

      setOcrText(extracted);
      setConfidence(conf);

      if (!extracted.trim()) {
        setAiError("OCR returned no readable text. Try a clearer image or a different file.");
        return;
      }

      setOcrLoading(false);
      stage = "ai";
      setAiLoading(true);

      const explainRes = await api.post("/reports/explain", {
        text: extracted,
      });
      setAiExplanation(explainRes.data?.explanation || "");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Simplify failed";

      if (stage === "ocr") setError(msg);
      else setAiError(msg);
    } finally {
      setOcrLoading(false);
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-7 h-7 text-purple-700" />
                  Medical Reports
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                    OCR + AI
                  </span>
                </h1>
                <p className="mt-2 text-sm text-gray-600 max-w-2xl">
                  Upload a lab report image or PDF and get a clearer, simpler explanation. Informational only — not a medical diagnosis.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Upload + actions */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">Upload</h2>
                    <div className="text-xs text-gray-500">png / jpg / jpeg / pdf</div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-800">Report file</label>
                        <p className="mt-1 text-xs text-gray-500">{fileLabel}</p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,application/pdf"
                          onChange={onPickFile}
                          className="mt-3 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:text-white hover:file:opacity-95"
                        />
                        <p className="mt-2 text-[11px] text-gray-500">PDF pages are rendered and OCR’d (best-effort).</p>
                      </div>
                    </div>

                    {previewUrl ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <img
                          src={previewUrl}
                          alt="Report preview"
                          className="h-44 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">Simplify with AI</h2>
                    <span className="text-[11px] font-semibold text-gray-500">
                      OCR + Gemini rewrite (no diagnosis)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={runSimplify}
                    disabled={ocrLoading || aiLoading || !file}
                    className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                      ocrLoading || aiLoading || !file
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm hover:opacity-95"
                    }`}
                  >
                    {ocrLoading || aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {ocrLoading
                      ? "Reading report…"
                      : aiLoading
                        ? "Simplifying…"
                        : "Simplify with AI"}
                  </button>

                  <div className="mt-4 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-800">OCR</span>
                      {ocrLoading ? (
                        <span className="inline-flex items-center gap-2 text-gray-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running
                        </span>
                      ) : ocrText.trim() ? (
                        <span className="inline-flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          {confidence !== null ? (
                            <span className="text-gray-500">• {confidence.toFixed(1)}%</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-gray-500">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-800">AI summary</span>
                      {aiLoading ? (
                        <span className="inline-flex items-center gap-2 text-gray-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing
                        </span>
                      ) : aiExplanation.trim() ? (
                        <span className="inline-flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-gray-500">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {aiError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {aiError}
                    </div>
                  ) : null}

                  <div className="mt-4 text-[11px] text-gray-500">
                    Informational only — not a medical diagnosis.
                  </div>
                </div>
              </div>

              {/* Right: Results */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Simple explanation</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        A simplified summary based on the report text.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(formattedExplanation || aiExplanation)}
                      disabled={!formattedExplanation.trim()}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        !formattedExplanation.trim()
                          ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      title="Copy AI explanation"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                  </div>

                  {!formattedExplanation.trim() ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                      <div className="font-semibold text-gray-900">No explanation yet</div>
                      <div className="mt-1 text-gray-600">
                        Upload a report and click <span className="font-semibold">Simplify with AI</span>.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-inner">
                      <div className="max-h-[520px] overflow-auto p-5">
                        <ReactMarkdown
                          components={{
                            h2: ({ children }) => (
                              <h2 className="mt-5 first:mt-0 text-base font-bold text-gray-900">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mt-4 text-sm font-bold text-gray-900">{children}</h3>
                            ),
                            p: ({ children }) => (
                              <p className="mt-2 text-sm leading-relaxed text-gray-800">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mt-2 space-y-1 pl-5 list-disc text-sm text-gray-800">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mt-2 space-y-1 pl-5 list-decimal text-sm text-gray-800">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-gray-900">{children}</strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-gray-800">{children}</em>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {children}
                              </a>
                            ),
                            code: ({ children }) => (
                              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[13px] text-gray-900">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {formattedExplanation}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-[11px] text-gray-500">
                    If anything looks wrong or concerning, consult a licensed clinician.
                  </div>
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
