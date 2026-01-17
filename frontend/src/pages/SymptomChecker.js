import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Clock, Stethoscope } from "lucide-react";
import api from "../utils/api";
import BackToDashboardButton from "../components/BackToDashboardButton";

function UrgencyPill({ level }) {
  const v = (level || "").toLowerCase();
  const styles =
    v === "high"
      ? "bg-red-100 text-red-700 border-red-200"
      : v === "low"
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";

  const label =
    v === "high"
      ? "High urgency"
      : v === "low"
      ? "Low urgency"
      : "Medium urgency";

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles}`}
    >
      {label}
    </span>
  );
}

export default function SymptomChecker() {
  const navigate = useNavigate();

  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const disclaimer = useMemo(
    () =>
      "This tool provides informational guidance only and is not a medical diagnosis. If symptoms are severe or worsening, seek professional help.",
    []
  );

  const fetchHistory = async () => {
    try {
      const res = await api.get("/symptoms/history", { params: { limit: 10 } });
      setHistory(Array.isArray(res.data?.history) ? res.data.history : []);
    } catch {
      // keep quiet
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const analyze = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!symptoms.trim()) {
      setError("Please describe your symptoms.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        symptoms: symptoms.trim(),
        duration: duration.trim() || undefined,
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
      };

      const res = await api.post("/symptoms/analyze", payload);
      setResult(res.data);
      await fetchHistory();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to analyze symptoms.");
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <BackToDashboardButton />
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-8 h-8 text-orange-600" />
                Symptom Checker
              </h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered routing to the right specialty.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <form onSubmit={analyze} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Describe your symptoms
                </label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                  placeholder="Example: I have a fever and cough for 3 days, mild shortness of breath..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                      placeholder="e.g., 3 days"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                    placeholder="e.g., 24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-3 disabled:opacity-60"
              >
                <Stethoscope className="w-4 h-4" />
                {loading ? "Analyzing…" : "Analyze"}
              </button>

              <p className="text-[11px] text-gray-500">{disclaimer}</p>
            </form>

            {/* Result */}
            {result && (
              <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UrgencyPill level={result.urgency_level} />
                    <span className="text-sm text-gray-700">
                      Recommended specialty:{" "}
                      <span className="font-semibold">
                        {result.recommended_specialty}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/doctors?specialty=${encodeURIComponent(
                          result.recommended_specialty || ""
                        )}`
                      )
                    }
                  >
                    Find doctors →
                  </button>
                </div>

                {result.urgency_level === "high" && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>
                      <div className="font-semibold">Seek urgent care now</div>
                      <div className="text-red-700/90">
                        If symptoms are severe, call emergency services or visit
                        the nearest ER.
                      </div>
                    </div>
                  </div>
                )}

                {analysis?.summary && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Summary
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">
                      {analysis.summary}
                    </p>
                  </div>
                )}

                {analysis?.reasoning && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Why this specialty
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">
                      {analysis.reasoning}
                    </p>
                  </div>
                )}

                {Array.isArray(analysis?.red_flags) &&
                  analysis.red_flags.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Red flags
                      </h3>
                      <ul className="list-disc pl-5 text-sm text-gray-700 mt-1 space-y-1">
                        {analysis.red_flags.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {Array.isArray(analysis?.next_steps) &&
                  analysis.next_steps.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Next steps
                      </h3>
                      <ul className="list-disc pl-5 text-sm text-gray-700 mt-1 space-y-1">
                        {analysis.next_steps.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                <p className="text-[11px] text-gray-500 mt-4">
                  {analysis?.disclaimer || disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900">Recent checks</h2>
            <p className="text-xs text-gray-500 mt-1">Last 10 saved analyses</p>

            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-sm text-gray-600">No history yet.</div>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="w-full text-left rounded-xl border border-gray-200 hover:border-orange-200 hover:bg-orange-50/50 transition px-3 py-3"
                    onClick={() =>
                      setResult({
                        id: h.id,
                        recommended_specialty: h.recommended_specialty,
                        urgency_level: h.urgency_level,
                        analysis: h.analysis || {
                          summary: "(Stored analysis was not in JSON format)",
                          disclaimer,
                        },
                      })
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500">
                        {h.created_at
                          ? new Date(h.created_at).toLocaleString()
                          : ""}
                      </div>
                      <UrgencyPill level={h.urgency_level} />
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">
                      {h.symptoms}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {h.recommended_specialty || "General Practice"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
