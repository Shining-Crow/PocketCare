import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../utils/auth";
import api from "../utils/api";
import {
  HeartPulse,
  AlertCircle,
  Activity,
  Hospital,
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

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dailyTips, setDailyTips] = useState([]);
  const [sosHolding, setSosHolding] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [emergencyNote, setEmergencyNote] = useState("");
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const fetchRecentAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const response = await api.get("/user/appointments");
      // Backend returns { appointments: [...] }
      const appointmentsData = response.data?.appointments || [];
      const appointments = Array.isArray(appointmentsData)
        ? appointmentsData
        : [];

      // Get recent 3 appointments (upcoming first, then recent past)
      const upcoming = appointments
        .filter((app) => {
          const appointmentDateTime = new Date(
            `${app.appointment_date} ${app.appointment_time}`
          );
          const now = new Date();
          return (
            appointmentDateTime > now &&
            app.status.toLowerCase() !== "cancelled"
          );
        })
        .slice(0, 2);

      const past = appointments
        .filter((app) => {
          const appointmentDateTime = new Date(
            `${app.appointment_date} ${app.appointment_time}`
          );
          const now = new Date();
          return (
            appointmentDateTime <= now ||
            app.status.toLowerCase() === "completed"
          );
        })
        .slice(0, 3 - upcoming.length);

      setRecentAppointments([...upcoming, ...past]);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      setRecentAppointments([]);
    } finally {
      setAppointmentsLoading(false);
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
      fetchRecentAppointments();
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

  const handleSOSActivate = useCallback(() => {
    const typeLabel = selectedEmergency || "general-emergency";
    // TODO: replace alert with real API call using typeLabel and emergencyNote
    alert(`🚨 SOS Activated (${typeLabel})! Contacting emergency services...`);
    setSosHolding(false);
    setSosProgress(0);
  }, [selectedEmergency]);

  useEffect(() => {
    let interval;
    if (sosHolding) {
      interval = setInterval(() => {
        setSosProgress((prev) => {
          if (prev >= 100) {
            handleSOSActivate();
            return 0;
          }
          return prev + 2;
        });
      }, 20);
    } else {
      setSosProgress(0);
    }
    return () => clearInterval(interval);
  }, [sosHolding, handleSOSActivate]);

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
                      className="transition-all duration-100"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Hold button */}
                  <button
                    type="button"
                    onMouseDown={() => setSosHolding(true)}
                    onMouseUp={() => setSosHolding(false)}
                    onMouseLeave={() => setSosHolding(false)}
                    onTouchStart={() => setSosHolding(true)}
                    onTouchEnd={() => setSosHolding(false)}
                    className="relative w-36 h-36 rounded-full bg-white shadow-md border border-gray-200 flex flex-col items-center justify-center transition-transform duration-150"
                    style={{ transform: sosHolding ? "scale(0.96)" : "scale(1)" }}
                  >
                    <span className="text-2xl font-semibold tracking-wide text-gray-900">
                      {sosHolding ? `${Math.floor(sosProgress)}%` : "HOLD"}
                    </span>
                    <span className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gray-500">
                      Panic Mode
                    </span>
                  </button>
                </div>

                <p className="mt-5 text-xs text-gray-500 text-center">
                  {sosHolding
                    ? "Keep holding to confirm SOS. Release to cancel."
                    : "Press and hold for 1 second to send an emergency alert."}
                </p>
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
            </div>
          </div>

          {/* Quick Actions with 3D Effect */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Zap className="w-6 h-6 mr-2 text-yellow-500" />
              Quick Actions
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Symptom Checker */}
              <div className="group relative">
                <div className="relative bg-white rounded-2xl shadow-md p-8 text-gray-900 transform group-hover:scale-105 transition-all duration-300 cursor-pointer border border-gray-200">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                      <Activity className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Symptom Checker
                      </h3>
                      <p className="text-orange-600 text-sm font-medium">
                        AI-Powered Analysis
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Get instant insights about your symptoms with our advanced AI
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/symptom-checker")}
                    className="w-full bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition shadow-lg"
                  >
                    Start Analysis →
                  </button>
                </div>
              </div>

              {/* Find Doctors */}
              <div className="group relative">
                <div className="relative bg-white rounded-2xl shadow-md p-8 text-gray-900 transform group-hover:scale-105 transition-all duration-300 cursor-pointer border border-gray-200">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                      <Hospital className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Find Doctors
                      </h3>
                      <p className="text-blue-600 text-sm font-medium">
                        500+ Specialists
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Search and book appointments with verified healthcare
                    professionals
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/doctors")}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg"
                  >
                    Browse Now →
                  </button>
                </div>
              </div>
            </div>
          </div>

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
            <div
              onClick={() => navigate("/appointments")}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 cursor-pointer group"
            >
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
                      Manage your healthcare appointments
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-indigo-600 group-hover:text-indigo-800">
                  <span className="text-sm font-medium mr-1">View All</span>
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>

              {appointmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-gray-600 text-sm">
                    Loading your appointments...
                  </span>
                </div>
              ) : recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Recent Activity
                    </span>
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {recentAppointments.length} appointments
                    </span>
                  </div>
                  {recentAppointments.map((appointment, idx) => {
                    const isUpcoming =
                      new Date(
                        `${appointment.appointment_date} ${appointment.appointment_time}`
                      ) > new Date();
                    return (
                      <div
                        key={idx}
                        className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-800 text-sm">
                              Dr. {appointment.doctor_name}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${isUpcoming &&
                                  appointment.status.toLowerCase() !== "cancelled"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : appointment.status.toLowerCase() ===
                                    "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs mb-2 font-medium">
                            {appointment.doctor_specialty}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center bg-white px-2 py-1 rounded-md">
                              <Calendar className="w-3 h-3 mr-1 text-indigo-500" />
                              {new Date(
                                appointment.appointment_date
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center bg-white px-2 py-1 rounded-md">
                              <Clock className="w-3 h-3 mr-1 text-indigo-500" />
                              {appointment.appointment_time.substring(0, 5)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          {isUpcoming &&
                            appointment.status.toLowerCase() !== "cancelled" ? (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mr-2"></div>
                              <span className="text-emerald-600 text-xs font-semibold">
                                Upcoming
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                              <span className="text-gray-500 text-xs font-medium">
                                Past
                              </span>
                            </div>
                          )}
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
                    No appointments yet
                  </h4>
                  <p className="text-gray-500 text-sm mb-4">
                    Start your healthcare journey today
                  </p>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
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
                    Book First Appointment
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
