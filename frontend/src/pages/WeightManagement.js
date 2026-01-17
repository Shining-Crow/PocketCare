import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "../utils/api";
import { Target, TrendingUp } from "lucide-react";
import BackToDashboardButton from "../components/BackToDashboardButton";

function bmiCategory(bmi) {
  if (!Number.isFinite(bmi)) return { label: "—", color: "text-gray-600" };
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-600" };
  if (bmi < 30) return { label: "Overweight", color: "text-amber-600" };
  return { label: "Obese", color: "text-red-600" };
}

function computeBmi(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
    return null;
  const hm = h / 100;
  return Math.round((w / (hm * hm)) * 100) / 100;
}

export default function WeightManagement() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    entry_date: "",
    weight_kg: "",
    height_cm: "",
    age_years: "",
  });

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    weight_kg: "",
    height_cm: "",
    age_years: "",
  });

  const [goalForm, setGoalForm] = useState({
    target_weight_kg: "",
    target_date: "",
  });

  const bmiPreview = useMemo(
    () => computeBmi(form.weight_kg, form.height_cm),
    [form.weight_kg, form.height_cm]
  );

  const latestEntry = entries.length ? entries[entries.length - 1] : null;

  const weightChartRef = useRef(null);
  const bmiChartRef = useRef(null);
  const weightChartInstance = useRef(null);
  const bmiChartInstance = useRef(null);

  const chartData = useMemo(() => {
    const labels = (entries || []).map((e) => e.entry_date);
    const weights = (entries || []).map((e) => Number(e.weight_kg));
    const bmis = (entries || []).map((e) => Number(e.bmi));
    return { labels, weights, bmis };
  }, [entries]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesRes, goalRes] = await Promise.all([
        api.get("/weight/entries"),
        api.get("/weight/goal"),
      ]);

      setEntries(entriesRes.data?.entries || []);
      setGoal(goalRes.data?.goal || null);
    } catch (e) {
      setError(
        e?.response?.data?.error || "Failed to load weight management data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!weightChartRef.current || !bmiChartRef.current) return;

    // Cleanup existing charts
    if (weightChartInstance.current) {
      weightChartInstance.current.destroy();
      weightChartInstance.current = null;
    }
    if (bmiChartInstance.current) {
      bmiChartInstance.current.destroy();
      bmiChartInstance.current = null;
    }

    if (!chartData.labels.length) return;

    const handlePointClick = (index) => {
      const entry = (entries || [])[index];
      if (!entry) return;
      openEdit(entry);
    };

    weightChartInstance.current = new Chart(weightChartRef.current, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Weight (kg)",
            data: chartData.weights,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            tension: 0.3,
            fill: true,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        onHover: (event, elements) => {
          const target = event?.native?.target;
          if (target)
            target.style.cursor = elements?.length ? "pointer" : "default";
        },
        onClick: (_event, elements) => {
          if (!elements?.length) return;
          handlePointClick(elements[0].index);
        },
        scales: {
          x: { ticks: { maxRotation: 0 }, grid: { display: false } },
          y: { beginAtZero: false },
        },
      },
    });

    bmiChartInstance.current = new Chart(bmiChartRef.current, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "BMI",
            data: chartData.bmis,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.12)",
            tension: 0.3,
            fill: true,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        onHover: (event, elements) => {
          const target = event?.native?.target;
          if (target)
            target.style.cursor = elements?.length ? "pointer" : "default";
        },
        onClick: (_event, elements) => {
          if (!elements?.length) return;
          handlePointClick(elements[0].index);
        },
        scales: {
          x: { ticks: { maxRotation: 0 }, grid: { display: false } },
          y: { beginAtZero: false },
        },
      },
    });

    return () => {
      if (weightChartInstance.current) weightChartInstance.current.destroy();
      if (bmiChartInstance.current) bmiChartInstance.current.destroy();
    };
  }, [chartData, entries]);

  const onSaveEntry = async (e) => {
    e.preventDefault();
    setSavingEntry(true);
    setError(null);
    setAiResult(null);

    try {
      await api.post("/weight/entries", {
        entry_date: form.entry_date,
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        age_years: form.age_years === "" ? null : Number(form.age_years),
      });

      setForm((prev) => ({ ...prev, weight_kg: "" }));
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save entry");
    } finally {
      setSavingEntry(false);
    }
  };

  const onSaveGoal = async (e) => {
    e.preventDefault();
    setSavingGoal(true);
    setError(null);
    setAiResult(null);

    try {
      await api.post("/weight/goal", {
        target_weight_kg: Number(goalForm.target_weight_kg),
        target_date: goalForm.target_date || null,
      });
      setGoalForm({ target_weight_kg: "", target_date: "" });
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to set goal");
    } finally {
      setSavingGoal(false);
    }
  };

  const onGetAiSuggestions = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const res = await api.post("/weight/suggestions", {});
      setAiResult(res.data?.recommendations || null);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to get AI suggestions");
    } finally {
      setAiLoading(false);
    }
  };

  const isAiKeyIssue = useMemo(() => {
    const msg = (error || "").toString().toLowerCase();
    return (
      msg.includes("gemini") &&
      (msg.includes("permission denied") ||
        msg.includes("api key") ||
        msg.includes("not set") ||
        msg.includes("revoked") ||
        msg.includes("leaked"))
    );
  }, [error]);

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({
      entry_date: entry.entry_date,
      weight_kg: String(entry.weight_kg ?? ""),
      height_cm: String(entry.height_cm ?? ""),
      age_years:
        entry.age_years === null || entry.age_years === undefined
          ? ""
          : String(entry.age_years),
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditEntry(null);
  };

  const editBmiPreview = useMemo(
    () => computeBmi(editForm.weight_kg, editForm.height_cm),
    [editForm.weight_kg, editForm.height_cm]
  );

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editEntry?.id) return;

    setEditSaving(true);
    setError(null);
    setAiResult(null);

    try {
      await api.put(`/weight/entries/${editEntry.id}`, {
        entry_date: editForm.entry_date,
        weight_kg: Number(editForm.weight_kg),
        height_cm: Number(editForm.height_cm),
        age_years:
          editForm.age_years === "" ? null : Number(editForm.age_years),
      });
      await fetchAll();
      setEditOpen(false);
      setEditEntry(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update entry");
    } finally {
      setEditSaving(false);
    }
  };

  const latestBmi = latestEntry ? Number(latestEntry.bmi) : null;
  const category = bmiCategory(latestBmi);

  const goalProgress = useMemo(() => {
    if (!goal || !latestEntry) return null;
    const start = Number(goal.start_weight_kg);
    const target = Number(goal.target_weight_kg);
    const current = Number(latestEntry.weight_kg);
    if (![start, target, current].every(Number.isFinite)) return null;

    const total = start - target;
    if (total === 0) return null;

    const done = start - current;
    const pct = Math.max(0, Math.min(100, (done / total) * 100));
    return { start, target, current, pct: Math.round(pct) };
  }, [goal, latestEntry]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackToDashboardButton />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Weight Management
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <div className="text-sm font-medium">{error}</div>
            {isAiKeyIssue && (
              <div className="mt-2 text-xs text-red-700/90">
                <p className="font-semibold">How to fix</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    Create a new Gemini API key in Google AI Studio (the current
                    one is revoked/blocked).
                  </li>
                  <li>
                    Set <span className="font-mono">GEMINI_API_KEY</span> in{" "}
                    <span className="font-mono">backend/.env</span>.
                  </li>
                  <li>Restart the Flask backend server.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Top stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Latest Weight</p>
                <p className="text-2xl font-bold text-gray-900">
                  {latestEntry ? `${latestEntry.weight_kg} kg` : "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {latestEntry
                    ? latestEntry.entry_date
                    : "Add your first entry"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Latest BMI</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Number.isFinite(latestBmi) ? latestBmi.toFixed(2) : "—"}
                </p>
                <p className={`text-xs font-semibold ${category.color}`}>
                  {category.label}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-sm text-gray-500">Goal Progress</p>
            {goalProgress ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {goalProgress.pct}%
                </p>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-emerald-600 h-2 rounded-full"
                    style={{ width: `${goalProgress.pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {goalProgress.current}kg now • target {goalProgress.target}kg
                </p>
              </>
            ) : (
              <p className="text-gray-700 mt-1">
                Set a goal to track progress.
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Add entry */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Entry</h2>
            <form onSubmit={onSaveEntry} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, entry_date: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={130}
                    value={form.age_years}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, age_years: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={1}
                    value={form.weight_kg}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, weight_kg: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={30}
                    value={form.height_cm}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, height_cm: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-700">
                  BMI preview:{" "}
                  <span className="font-semibold">{bmiPreview ?? "—"}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  BMI is a general indicator; it doesn’t diagnose health.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingEntry}
                className="w-full rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
              >
                {savingEntry ? "Saving…" : "Save Entry"}
              </button>
            </form>
          </div>

          {/* Goal */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Set Goal</h2>

            {goal ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-800 font-semibold">
                  Active goal
                </p>
                <p className="text-sm text-emerald-700">
                  Target:{" "}
                  <span className="font-semibold">
                    {goal.target_weight_kg} kg
                  </span>
                  {goal.target_date ? ` by ${goal.target_date}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">No active goal set.</p>
            )}

            <form onSubmit={onSaveGoal} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target weight (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={1}
                    value={goalForm.target_weight_kg}
                    onChange={(e) =>
                      setGoalForm((p) => ({
                        ...p,
                        target_weight_kg: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target date
                  </label>
                  <input
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) =>
                      setGoalForm((p) => ({
                        ...p,
                        target_date: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="optional"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingGoal}
                className="w-full rounded-xl bg-emerald-600 text-white px-4 py-3 font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {savingGoal ? "Saving…" : "Set Goal"}
              </button>
            </form>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-3 text-sm text-gray-600">
          Tip: click a point on the chart to edit that entry.
        </div>
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Weight Trend
            </h2>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading…
                </div>
              ) : chartData.labels.length ? (
                <canvas ref={weightChartRef} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data yet.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">BMI Trend</h2>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading…
                </div>
              ) : chartData.labels.length ? (
                <canvas ref={bmiChartRef} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI suggestions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                AI Diet & Exercise Suggestions
              </h2>
              <p className="text-sm text-gray-500">
                Based on your latest entry{goal ? " and active goal" : ""}.
              </p>
            </div>
            <button
              type="button"
              onClick={onGetAiSuggestions}
              disabled={aiLoading}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {aiLoading ? "Generating…" : "Get Suggestions"}
            </button>
          </div>

          {aiResult ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              {aiResult.text ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                  {aiResult.text}
                </pre>
              ) : (
                <div className="space-y-3 text-sm text-gray-800">
                  {Array.isArray(aiResult.summary) && (
                    <div>
                      <p className="font-semibold text-indigo-800 mb-1">
                        Summary
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        {aiResult.summary.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.diet && (
                    <div>
                      <p className="font-semibold text-indigo-800 mb-1">Diet</p>
                      {Array.isArray(aiResult.diet.principles) && (
                        <ul className="list-disc pl-5 space-y-1">
                          {aiResult.diet.principles.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {aiResult.exercise && (
                    <div>
                      <p className="font-semibold text-indigo-800 mb-1">
                        Exercise
                      </p>
                      {Array.isArray(aiResult.exercise.weekly_plan) && (
                        <ul className="list-disc pl-5 space-y-1">
                          {aiResult.exercise.weekly_plan.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {aiResult.safety && Array.isArray(aiResult.safety) && (
                    <div>
                      <p className="font-semibold text-indigo-800 mb-1">
                        Safety
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        {aiResult.safety.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.disclaimer && (
                    <p className="text-xs text-gray-600">
                      {aiResult.disclaimer}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Add entries, then click “Get Suggestions”.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Disclaimer: This tool provides general wellness information only and
          is not medical advice.
        </p>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Edit Entry
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Update the values and we’ll recalculate BMI.
              </p>

              <form onSubmit={onSaveEdit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editForm.entry_date}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          entry_date: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age (years)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={130}
                      value={editForm.age_years}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          age_years: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="optional"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={1}
                      value={editForm.weight_kg}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          weight_kg: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={30}
                      value={editForm.height_cm}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          height_cm: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                  <p className="text-sm text-gray-700">
                    BMI preview:{" "}
                    <span className="font-semibold">
                      {editBmiPreview ?? "—"}
                    </span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={editSaving}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving || !editEntry?.id}
                    className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-2.5 font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {editSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
