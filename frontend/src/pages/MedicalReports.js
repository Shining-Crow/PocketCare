import React, { useMemo, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import api from "../utils/api";

function MedicalReports() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState("");

  const fileLabel = useMemo(() => {
    if (!file) return "Choose an image (png/jpg/jpeg)";
    return `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }, [file]);

  const onPickFile = (e) => {
    setError("");
    setOcrText("");
    setConfidence(null);

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

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="w-5 h-5" />
                </span>
                Medical Reports (OCR)
              </h1>
              <p className="mt-2 text-gray-600">
                Upload a report image and extract its text using Tesseract.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6">
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Report image
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={onPickFile}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <button
                  type="button"
                  onClick={runOcr}
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition border ${
                    isLoading
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent hover:opacity-95"
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  {isLoading ? "Extracting..." : "Extract Text"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">{fileLabel}</p>
              <p className="mt-1 text-xs text-gray-500">
                PDFs are not enabled yet (image-only MVP).
              </p>
              {error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">Extracted text</h2>
                <div className="text-xs text-gray-500">
                  {confidence !== null ? `Confidence: ${confidence.toFixed(1)}%` : ""}
                </div>
              </div>
              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="OCR output will appear here..."
                className="mt-3 w-full min-h-[260px] rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 text-xs text-gray-500">
                You can edit the text here before we add saving/analysis.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MedicalReports;
