import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../utils/auth";
import api from "../utils/api";
import {
  HeartPulse,
  AlertCircle,
  Activity,
  Calendar,
  User,
  FileText,
  MessageSquare,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";
import Footer from "../components/Footer";

function SosUpdateModal({ isOpen, onClose, title, message, tone = "info" }) {
  if (!isOpen) return null;

  const toneStyles = {
    info: {
      ring: "ring-blue-100",
      iconBg: "bg-blue-50",
      iconFg: "text-blue-600",
      accent: "from-blue-600 to-indigo-600",
      border: "border-blue-100",
      Icon: AlertCircle,
    },
    success: {
      ring: "ring-emerald-100",
      iconBg: "bg-emerald-50",
      iconFg: "text-emerald-600",
      accent: "from-emerald-600 to-teal-600",
      border: "border-emerald-100",
      Icon: HeartPulse,
    },
    danger: {
      ring: "ring-red-100",
      iconBg: "bg-red-50",
      iconFg: "text-red-600",
      accent: "from-red-600 to-rose-600",
      border: "border-red-100",
      Icon: AlertTriangle,
    },
    emergency: {
      ring: "ring-red-100",
      iconBg: "bg-red-50",
      iconFg: "text-red-600",
      accent: "from-red-600 to-orange-500",
      border: "border-red-100",
      Icon: Zap,
    },
  };

  const style = toneStyles[tone] || toneStyles.info;
  const Icon = style.Icon;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div
          className={`w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ${style.ring} border ${style.border} overflow-hidden`}
          role="dialog"
          aria-modal="true"
        >
          <div className={`h-1.5 w-full bg-gradient-to-r ${style.accent}`} />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-2xl ${style.iconBg} flex items-center justify-center`}
              >
                <Icon className={`w-6 h-6 ${style.iconFg}`} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900">{title}</div>
                <div className="mt-1 text-sm text-gray-600 leading-relaxed">{message}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className={`w-full rounded-2xl py-3.5 font-semibold text-white bg-gradient-to-r ${style.accent} shadow-lg hover:opacity-95 active:opacity-90`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dailyTips, setDailyTips] = useState([]);
  const [sosHolding, setSosHolding] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [emergencyNote, setEmergencyNote] = useState("");
  const [sosFeedback, setSosFeedback] = useState(null);
  const [sosSuccessModal, setSosSuccessModal] = useState({
    show: false,
    title: "SOS Sent",
    message: "Your emergency alert has been sent to nearby hospitals.",
  });
  const [sosStatusModal, setSosStatusModal] = useState({
    show: false,
    title: "Update",
    message: "",
    tone: "info",
  });
  const [sosSending, setSosSending] = useState(false);
  const [latestSos, setLatestSos] = useState(null);
  const [latestSosLoading, setLatestSosLoading] = useState(false);
  const [latestSosError, setLatestSosError] = useState(null);
  const [latestSosUpdatedAt, setLatestSosUpdatedAt] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const SOS_HOLD_MS = 1000;
  const holdRafRef = useRef(null);
  const holdStartRef = useRef(0);
  const holdPointerActiveRef = useRef(false);
  const holdActivatedRef = useRef(false);
  const sosSendingRef = useRef(false);
  const sosPollStartRef = useRef(0);
  const sosStatusNotifiedRef = useRef({ requestId: null, status: null });
  const latestSosLoadingRef = useRef(false);

  const sosNotifyStorageKey = useCallback(() => {
    const uid = user?.id ?? "unknown";
    return `pc_sos_notify_${uid}`;
  }, [user?.id]);

  const safeJsonParse = (raw) => {
    try {
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const formatShortDateTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const response = await api.get("/activity/recent", {
        params: { limit: 3 },
      });
      const items = response.data?.activities || [];
      setRecentActivity(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const formatActivityTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityStyle = (type) => {
    switch (type) {
      case "appointment":
        return {
          Icon: Calendar,
          badge: "bg-indigo-100 text-indigo-700",
          iconBg: "bg-gradient-to-br from-indigo-500 to-purple-600",
        };
      case "symptom_analysis":
        return {
          Icon: Activity,
          badge: "bg-emerald-100 text-emerald-700",
          iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
        };
      case "report":
        return {
          Icon: FileText,
          badge: "bg-blue-100 text-blue-700",
          iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
        };
      case "weight_entry":
        return {
          Icon: TrendingUp,
          badge: "bg-orange-100 text-orange-700",
          iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
        };
      case "weight_goal":
        return {
          Icon: Zap,
          badge: "bg-purple-100 text-purple-700",
          iconBg: "bg-gradient-to-br from-purple-500 to-fuchsia-600",
        };
      case "chat":
        return {
          Icon: MessageSquare,
          badge: "bg-gray-100 text-gray-700",
          iconBg: "bg-gradient-to-br from-gray-600 to-slate-700",
        };
      default:
        return {
          Icon: Clock,
          badge: "bg-gray-100 text-gray-700",
          iconBg: "bg-gradient-to-br from-gray-500 to-gray-700",
        };
    }
  };

  const handleActivityClick = (item) => {
    const t = (item?.type || "").toString();
    switch (t) {
      case "appointment":
        navigate("/appointments");
        return;
      case "symptom_analysis":
        navigate("/symptom-checker");
        return;
      case "report":
        navigate("/reports");
        return;
      case "weight_entry":
      case "weight_goal":
        navigate("/weight-management");
        return;
      case "chat":
        navigate("/health-chat");
        return;
      default:
        navigate("/dashboard");
        return;
    }
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      // If token exists but user is missing, ensure we log out to avoid redirect loop
      logout();
      navigate("/login");
    } else {
      setUser(currentUser);
      fetchRecentActivity();
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const pickRandom = (tips, count) => {
      const arr = Array.isArray(tips) ? [...tips] : [];
      // Fisher–Yates shuffle
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.slice(0, count);
    };

    const loadTips = async () => {
      try {
        const res = await fetch("/healthTips.json", { cache: "no-store" });
        if (!res.ok)
          throw new Error(`Failed to load health tips (${res.status})`);
        const data = await res.json();
        const tips = data?.healthTips || [];
        const chosen = pickRandom(tips, 3);
        if (!cancelled) setDailyTips(chosen);
      } catch (e) {
        // Fallback: keep a few default tips if the JSON fetch fails
        const fallback = pickRandom(
          [
            {
              id: "fallback-1",
              title: "💧 Stay Hydrated",
              message:
                "Drink at least 8 glasses of water daily. Proper hydration improves energy levels, skin health, and overall wellbeing.",
            },
            {
              id: "fallback-2",
              title: "😴 Prioritize Sleep",
              message:
                "Aim for 7–9 hours of quality sleep each night to support memory, mood, and immune function.",
            },
            {
              id: "fallback-3",
              title: "🚶‍♂️ Move Your Body",
              message:
                "Engage in at least 30 minutes of physical activity daily to improve cardiovascular health and reduce stress.",
            },
          ],
          3
        );
        if (!cancelled) setDailyTips(fallback);
      }
    };

    loadTips();
    return () => {
      cancelled = true;
    };
  }, []);

  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const handleSOSActivate = useCallback(async () => {
    if (sosSendingRef.current) return;
    sosSendingRef.current = true;
    setSosSending(true);
    setSosFeedback(null);

    try {
      const typeLabel = selectedEmergency || null;
      const note = emergencyNote?.trim() || null;

      const pos = await getCurrentPosition();
      const latitude = pos?.coords?.latitude;
      const longitude = pos?.coords?.longitude;

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new Error("Could not read your location. Please try again.");
      }

      const res = await api.post("/emergency/sos", {
        latitude,
        longitude,
        emergency_type: typeLabel,
        note,
      });

      const requestId = res?.data?.request_id;

      // Optimistically set latest SOS so the status panel appears immediately.
      // The polling refresh will reconcile with the server (hospital name, timestamps, etc.).
      setLatestSos({
        id: requestId || "new",
        status: "pending",
        latitude,
        longitude,
        emergency_type: typeLabel,
        note,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
        resolved_at: null,
        hospital_id: null,
        hospital_name: null,
        hospital_phone: null,
      });
      setLatestSosUpdatedAt(new Date());

      setSosSuccessModal({
        show: true,
        title: "SOS Sent",
        message: requestId
          ? `Your SOS request (#${requestId}) was created and sent to nearby hospitals.`
          : "Your emergency alert has been sent to nearby hospitals.",
      });

      // Start tracking status updates right away.
      sosPollStartRef.current = Date.now();
      setEmergencyNote("");
      setSelectedEmergency(null);
      setSosFeedback(null);
    } catch (err) {
      const apiMsg = err?.response?.data?.error || err?.response?.data?.msg;
      const msg =
        (typeof apiMsg === "string" && apiMsg) ||
        err?.message ||
        "Failed to send SOS. Please try again.";
      setSosFeedback({ type: "error", message: msg });
    } finally {
      sosSendingRef.current = false;
      setSosSending(false);
    }
  }, [selectedEmergency, emergencyNote]);

  const fetchLatestSos = useCallback(async () => {
    if (latestSosLoadingRef.current) return;
    latestSosLoadingRef.current = true;
    setLatestSosError(null);
    setLatestSosLoading(true);
    try {
      const res = await api.get("/emergency/sos/latest");
      const req = res?.data?.request || null;
      setLatestSos(req);
      setLatestSosUpdatedAt(new Date());

      // If we see an active request, ensure polling window exists.
      if (req?.status && (req.status === "pending" || req.status === "acknowledged")) {
        if (!sosPollStartRef.current) sosPollStartRef.current = Date.now();
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.error || err?.response?.data?.msg;
      const msg =
        (typeof apiMsg === "string" && apiMsg) ||
        err?.message ||
        "Failed to fetch SOS status.";
      setLatestSosError(msg);
    } finally {
      latestSosLoadingRef.current = false;
      setLatestSosLoading(false);
    }
  }, []);

  const stopHoldAnimation = useCallback(() => {
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
  }, []);

  const resetHold = useCallback(() => {
    stopHoldAnimation();
    holdPointerActiveRef.current = false;
    holdActivatedRef.current = false;
    setSosHolding(false);
    setSosProgress(0);
  }, [stopHoldAnimation]);

  useEffect(() => {
    return () => {
      stopHoldAnimation();
    };
  }, [stopHoldAnimation]);

  useEffect(() => {
    // Load latest SOS status when dashboard opens.
    fetchLatestSos();
  }, [fetchLatestSos]);

  useEffect(() => {
    const status = latestSos?.status;
    const shouldPoll = status === "pending" || status === "acknowledged";
    if (!shouldPoll) return;

    const startedAt = sosPollStartRef.current || Date.now();
    sosPollStartRef.current = startedAt;
    const maxMs = 10 * 60 * 1000; // 10 minutes

    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed > maxMs) {
        clearInterval(timer);
        return;
      }
      fetchLatestSos();
    }, 5000);

    return () => clearInterval(timer);
  }, [latestSos?.status, fetchLatestSos]);

  useEffect(() => {
    // One-time notification when a hospital accepts/resolves the SOS.
    const requestId = latestSos?.id ?? null;
    const status = latestSos?.status ?? null;
    if (!requestId || !status) return;

    // Prevent repeat popups across reloads using localStorage.
    const storageKey = sosNotifyStorageKey();
    const stored = safeJsonParse(localStorage.getItem(storageKey)) || {};
    const storedRequestId = stored?.requestId ?? null;
    const storedStatus = stored?.status ?? null;
    const alreadyNotifiedAcrossReloads = storedRequestId === requestId && storedStatus === status;

    const prev = sosStatusNotifiedRef.current;
    if (prev.requestId !== requestId) {
      sosStatusNotifiedRef.current = { requestId, status: null };
    }
    const alreadyNotifiedThisSession =
      sosStatusNotifiedRef.current.requestId === requestId && sosStatusNotifiedRef.current.status === status;
    if (alreadyNotifiedAcrossReloads || alreadyNotifiedThisSession) return;

    if (status === "acknowledged") {
      const hospitalName = latestSos?.hospital_name || "a hospital";
      setSosStatusModal({
        show: true,
        title: "SOS Accepted",
        message: `Good news — ${hospitalName} has accepted your emergency request.`,
        tone: "success",
      });
      sosStatusNotifiedRef.current = { requestId, status };
      localStorage.setItem(storageKey, JSON.stringify({ requestId, status }));
      return;
    }

    if (status === "resolved") {
      const hospitalName = latestSos?.hospital_name || "the hospital";
      setSosStatusModal({
        show: true,
        title: "SOS Resolved",
        message: `${hospitalName} marked your emergency request as resolved.`,
        tone: "info",
      });
      sosStatusNotifiedRef.current = { requestId, status };
      localStorage.setItem(storageKey, JSON.stringify({ requestId, status }));
    }
  }, [latestSos, sosNotifyStorageKey]);

  const startHold = useCallback(
    (e) => {
      if (sosSendingRef.current) return;
      if (holdPointerActiveRef.current) return;

      setSosFeedback(null);
      holdPointerActiveRef.current = true;
      holdActivatedRef.current = false;
      setSosHolding(true);
      setSosProgress(0);

      try {
        e?.preventDefault?.();
        e?.currentTarget?.setPointerCapture?.(e.pointerId);
      } catch (_) {
        // no-op
      }

      holdStartRef.current = performance.now();
      stopHoldAnimation();

      const tick = (now) => {
        if (!holdPointerActiveRef.current) return;
        const elapsed = now - holdStartRef.current;
        const progress = Math.max(0, Math.min(100, (elapsed / SOS_HOLD_MS) * 100));

        setSosProgress(progress);

        if (progress >= 100 && !holdActivatedRef.current) {
          holdActivatedRef.current = true;
          setSosProgress(100);
          setSosHolding(false);
          stopHoldAnimation();
          handleSOSActivate();
          return;
        }

        holdRafRef.current = requestAnimationFrame(tick);
      };

      holdRafRef.current = requestAnimationFrame(tick);
    },
    [SOS_HOLD_MS, handleSOSActivate, stopHoldAnimation]
  );

  const endHold = useCallback(
    (e) => {
      try {
        e?.preventDefault?.();
        if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {
        // no-op
      }

      if (!holdPointerActiveRef.current) return;
      holdPointerActiveRef.current = false;
      stopHoldAnimation();

      if (!holdActivatedRef.current) {
        setSosHolding(false);
        setSosProgress(0);
      }
    },
    [stopHoldAnimation]
  );

  if (!user) return null;

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Main Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section with Stats */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Welcome Card - Clickable Profile */}
          </div>

          {/* Enhanced SOS Card */}
          <div className="mb-10">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                Emergency SOS
              </h2>

              {/* HOLD circle */}
              <div className="flex flex-col items-center">
                <div className="relative w-52 h-52 flex items-center justify-center">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-[10px] border-gray-200" />

                  {/* Progress ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="104"
                      cy="104"
                      r="88"
                      stroke="transparent"
                      strokeWidth="10"
                      fill="none"
                    />
                    <circle
                      cx="104"
                      cy="104"
                      r="88"
                      stroke="#ef4444"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - sosProgress / 100)
                        }`}
                      className=""
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Hold button */}
                  <button
                    type="button"
                    onPointerDown={startHold}
                    onPointerUp={endHold}
                    onPointerCancel={endHold}
                    onPointerLeave={endHold}
                    disabled={sosSending}
                    className={`relative w-36 h-36 rounded-full bg-white shadow-md border border-gray-200 flex flex-col items-center justify-center transition-transform duration-150 ${
                      sosSending ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                    style={{
                      transform: sosHolding ? "scale(0.96)" : "scale(1)",
                      touchAction: "none",
                    }}
                  >
                    <span className="text-2xl font-semibold tracking-wide text-gray-900">
                      {sosSending
                        ? "SENDING"
                        : sosHolding
                        ? `${Math.floor(sosProgress)}%`
                        : "HOLD"}
                    </span>
                    <span className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gray-500">
                      Panic Mode
                    </span>
                  </button>
                </div>

                <p className="mt-5 text-xs text-gray-500 text-center">
                  {sosSending
                    ? "Sending your SOS…"
                    : sosHolding
                    ? "Keep holding to confirm SOS. Release to cancel."
                    : "Press and hold for 1 second to send an emergency alert."}
                </p>

                {sosFeedback?.type === "error" && (
                  <div className="mt-4 w-full max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-semibold">SOS not sent</div>
                        <div className="text-red-700/90">{sosFeedback.message}</div>
                      </div>
                      <button
                        type="button"
                        className="text-red-700/70 hover:text-red-800"
                        onClick={() => setSosFeedback(null)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Emergency types */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 text-center">
                  Emergency type (optional)
                </h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[
                    { id: "chest-pain", label: "Chest Pain", icon: HeartPulse },
                    { id: "breathing", label: "Breathing Issue", icon: Activity },
                    {
                      id: "bleeding",
                      label: "Heavy Bleeding",
                      icon: AlertTriangle,
                    },
                    { id: "unconscious", label: "Unconscious", icon: User },
                    { id: "seizure", label: "Seizure", icon: Zap },
                    { id: "other", label: "Other Medical", icon: AlertCircle },
                  ].map((type) => {
                    const active = selectedEmergency === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() =>
                          setSelectedEmergency(active ? null : type.id)
                        }
                        className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2 transition text-[11px] ${active
                            ? "border-red-500 bg-red-50 text-red-600"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        <type.icon className="w-3.5 h-3.5" />
                        <span className="font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Additional details */}
              <div className="mt-6">
                <textarea
                  rows={3}
                  value={emergencyNote}
                  onChange={(e) => setEmergencyNote(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50"
                  placeholder="Additional details (optional)"
                />
              </div>

              {/* Status tracker (only while active) */}
              {(latestSos && latestSos.status !== "resolved") && (
              <div className="mt-6 rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">SOS status</div>
                      <div className="text-xs text-gray-500">
                        {latestSosUpdatedAt
                          ? `Updated ${latestSosUpdatedAt.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchLatestSos}
                    disabled={latestSosLoading}
                    className="relative w-28 shrink-0 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {latestSosLoading && (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                      )}
                      <span>Refresh</span>
                    </span>
                  </button>
                </div>

                {latestSosError && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {latestSosError}
                  </div>
                )}

                {!latestSos && !latestSosError && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                    No SOS request found yet. Send one to start tracking.
                  </div>
                )}

                {latestSos && (
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                          latestSos.status === "pending"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : latestSos.status === "acknowledged"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : latestSos.status === "resolved"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {String(latestSos.status || "unknown").toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {latestSos.status === "pending"
                          ? "Waiting for a nearby hospital to accept."
                          : latestSos.status === "acknowledged"
                          ? "A hospital has accepted your request."
                          : latestSos.status === "resolved"
                          ? "Marked as resolved by the hospital."
                          : ""}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500">Request</div>
                        <div className="mt-1 text-sm font-bold text-gray-900">#{latestSos.id}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500">Created</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {formatShortDateTime(latestSos.created_at) || "—"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500">Type</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {latestSos.emergency_type || "General"}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs font-semibold text-gray-800">Progress</div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        {[
                          { key: "pending", label: "Requested" },
                          { key: "acknowledged", label: "Accepted" },
                          { key: "resolved", label: "Resolved" },
                        ].map((step, idx) => {
                          const isDone =
                            latestSos.status === "resolved" ||
                            (latestSos.status === "acknowledged" && step.key !== "resolved") ||
                            (latestSos.status === "pending" && step.key === "pending");
                          const isActive = latestSos.status === step.key;
                          return (
                            <div key={step.key} className="flex items-center gap-2">
                              <div
                                className={`h-7 w-7 rounded-full flex items-center justify-center border ${
                                  isDone
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-gray-50 border-gray-200 text-gray-500"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold ${isActive ? "text-gray-900" : "text-gray-700"}`}>
                                  {step.label}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {(latestSos.hospital_name || latestSos.hospital_phone) && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="text-xs font-semibold text-gray-800">Hospital</div>
                        <div className="mt-1 text-sm font-bold text-gray-900">
                          {latestSos.hospital_name || "Hospital"}
                        </div>
                        {latestSos.hospital_phone && (
                          <div className="mt-1 text-sm text-gray-700">{latestSos.hospital_phone}</div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {latestSos.hospital_phone && (
                            <a
                              href={`tel:${latestSos.hospital_phone}`}
                              className="rounded-xl bg-gray-900 text-white px-3 py-2 text-xs font-semibold hover:bg-gray-800"
                            >
                              Call hospital
                            </a>
                          )}
                          {typeof latestSos.latitude === "number" && typeof latestSos.longitude === "number" && (
                            <a
                              href={`https://www.google.com/maps?q=${latestSos.latitude},${latestSos.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View location
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {latestSos.note && (
                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="text-xs font-semibold text-gray-800">Your note</div>
                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{latestSos.note}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          <SosUpdateModal
            isOpen={sosSuccessModal.show}
            onClose={() => {
              setSosSuccessModal((p) => ({ ...p, show: false }));
              resetHold();
            }}
            title={sosSuccessModal.title}
            message={sosSuccessModal.message}
            tone="emergency"
          />

          <SosUpdateModal
            isOpen={sosStatusModal.show}
            onClose={() => setSosStatusModal((p) => ({ ...p, show: false }))}
            title={sosStatusModal.title}
            message={sosStatusModal.message}
            tone={sosStatusModal.tone}
          />

          {/* Healthcare Services Grid */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Healthcare Services
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Calendar,
                  title: "Appointments",
                  desc: "Manage bookings",
                  color: "from-green-400 to-emerald-500",
                  bg: "bg-green-500/10",
                  onClick: () => navigate("/appointments"),
                },
                {
                  icon: FileText,
                  title: "Medical Reports",
                  desc: "Upload & analyze",
                  color: "from-blue-400 to-cyan-500",
                  bg: "bg-blue-500/10",
                  onClick: () => navigate("/reports"),
                },
                {
                  icon: MessageSquare,
                  title: "Health Chat",
                  desc: "24/7 AI assistant",
                  color: "from-cyan-400 to-teal-500",
                  bg: "bg-cyan-500/10",
                  onClick: () => navigate("/health-chat"),
                },
                {
                  icon: TrendingUp,
                  title: "Weight Management",
                  desc: "Track BMI & goals",
                  color: "from-indigo-500 to-fuchsia-500",
                  bg: "bg-indigo-500/10",
                  onClick: () => navigate("/weight-management"),
                },
              ].map((service, idx) => (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl p-6 hover:bg-blue-50/40 transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 transform hover:-translate-y-2 hover:shadow-lg"
                  onClick={service.onClick}
                >
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg`}
                  >
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">{service.desc}</p>
                  <span
                    className={`text-sm font-semibold bg-gradient-to-r ${service.color} bg-clip-text text-transparent group-hover:underline`}
                  >
                    Open →
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* My Profile - Recent Appointments */}
          <div className="mt-8 grid lg:grid-cols-2 gap-6">
            {/* My Profile - Clickable Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      Recent Activity
                    </h3>
                    <p className="text-sm text-gray-500">
                      Your latest actions across PocketCare
                    </p>
                  </div>
                </div>
              </div>

              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-gray-600 text-sm">
                    Loading your recent activity...
                  </span>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Recent Activity
                    </span>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
                      Last {recentActivity.length}
                    </span>
                  </div>
                  {recentActivity.map((item, idx) => {
                    const { Icon, badge } = getActivityStyle(item.type);
                    const tsLabel = formatActivityTime(item.timestamp);
                    const badgeText = (item.type || "activity")
                      .toString()
                      .replaceAll("_", " ");

                    const metaId =
                      item?.meta?.appointment_id ||
                      item?.meta?.report_id ||
                      item?.meta?.symptom_log_id ||
                      item?.meta?.weight_entry_id ||
                      item?.meta?.weight_goal_id ||
                      item?.meta?.chat_message_id ||
                      item?.timestamp ||
                      'na';
                    const keyBase = `${item?.type || 'activity'}:${metaId}`;

                    return (
                      <div
                        key={`${keyBase}:${idx}`}
                        onClick={() => handleActivityClick(item)}
                        className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-sm">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h4 className="font-semibold text-gray-800 text-sm truncate">
                              {item.title || "Activity"}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge}`}>
                              {badgeText}
                            </span>
                            {tsLabel ? (
                              <span className="text-xs text-gray-500">{tsLabel}</span>
                            ) : null}
                          </div>
                          {item.subtitle ? (
                            <p className="text-gray-600 text-xs font-medium break-words">
                              {item.subtitle}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    No activity yet
                  </h4>
                  <p className="text-gray-500 text-sm mb-4">
                    Book an appointment, analyze symptoms, or upload a report
                  </p>
                  <div
                    onClick={(e) => {
                      navigate("/doctors");
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Get Started
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <HeartPulse className="w-5 h-5 mr-2 text-cyan-500 animate-pulse" />
                Daily Health Tip
              </h3>
              {dailyTips.length ? (
                <div className="space-y-4">
                  {dailyTips.map((tip) => (
                    <div
                      key={tip.id}
                      className="rounded-xl bg-blue-50/60 border border-blue-100 p-4"
                    >
                      <p className="text-gray-900 font-semibold mb-1">
                        {tip.title}
                      </p>
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {tip.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">Loading tips…</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Dashboard;
