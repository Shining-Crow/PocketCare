import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Droplet,
  Camera,
  Edit2,
  Save,
  X,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Bed,
  Building2,
} from "lucide-react";
import Footer from "../components/Footer";
import BackToDashboardButton from "../components/BackToDashboardButton";

function UserProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    address: "",
    profile_picture: "",
  });
  const [stats, setStats] = useState({
    appointments: 0,
  });
  const [editedData, setEditedData] = useState({});

  const [sosHistory, setSosHistory] = useState([]);
  const [sosHistoryLoading, setSosHistoryLoading] = useState(false);
  const [sosHistoryError, setSosHistoryError] = useState(null);
  const [resolvingSosId, setResolvingSosId] = useState(null);
  const [sosHistoryOffset, setSosHistoryOffset] = useState(0);
  const [sosHistoryHasMore, setSosHistoryHasMore] = useState(false);
  const SOS_HISTORY_PAGE_SIZE = 3;

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const APPOINTMENTS_PAGE_SIZE = 2;
  const [appointmentsVisibleCount, setAppointmentsVisibleCount] = useState(
    APPOINTMENTS_PAGE_SIZE,
  );

  // Bed bookings state
  const [bedBookings, setBedBookings] = useState([]);
  const [bedBookingsLoading, setBedBookingsLoading] = useState(false);
  const [bedBookingsError, setBedBookingsError] = useState(null);
  const BED_BOOKINGS_PAGE_SIZE = 2;
  const [bedBookingsVisibleCount, setBedBookingsVisibleCount] = useState(
    BED_BOOKINGS_PAGE_SIZE,
  );

  const resolveProfileImageSrc = (value) => {
    const src = (value || "").toString().trim();
    if (!src) return "";
    if (src.startsWith("data:")) return src;
    if (/^https?:\/\//i.test(src)) return src;

    // If backend returns a relative path, prefix with server origin (not /api).
    const origin = (
      process.env.REACT_APP_API_URL || "http://localhost:5000"
    ).replace(/\/$/, "");
    if (src.startsWith("/")) return `${origin}${src}`;
    return `${origin}/${src}`;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/profile");
      const userData = response.data.user;

      setProfile(userData);
      setStats({
        appointments: Number(response.data?.stats?.appointments || 0),
      });
      setEditedData(userData);

      // Load SOS history after we have a valid user profile.
      fetchSosHistory({ reset: true });
      // Load appointments
      fetchAppointments();
      // Load bed bookings
      fetchBedBookings();
    } catch (error) {
      console.error("Error fetching profile:", error);
      alert(error.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSosHistory = async ({ reset = false } = {}) => {
    try {
      setSosHistoryError(null);
      setSosHistoryLoading(true);

      const offset = reset ? 0 : sosHistoryOffset;
      const res = await api.get("/emergency/sos/history", {
        params: { limit: SOS_HISTORY_PAGE_SIZE, offset },
      });

      const items = Array.isArray(res.data?.requests) ? res.data.requests : [];
      const nextOffset = Number(res.data?.next_offset ?? offset + items.length);
      const hasMore = Boolean(res.data?.has_more);

      if (reset) {
        setSosHistory(items);
      } else {
        setSosHistory((prev) => {
          const seen = new Set(prev.map((r) => r?.id));
          const merged = [...prev];
          for (const r of items) {
            if (!seen.has(r?.id)) merged.push(r);
          }
          return merged;
        });
      }

      setSosHistoryOffset(nextOffset);
      setSosHistoryHasMore(hasMore);
    } catch (error) {
      console.error("Error fetching SOS history:", error);
      setSosHistoryError(
        error.response?.data?.error || "Failed to load SOS history",
      );
      setSosHistory([]);
      setSosHistoryOffset(0);
      setSosHistoryHasMore(false);
    } finally {
      setSosHistoryLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      const res = await api.get("/user/appointments");
      const items = Array.isArray(res.data?.appointments)
        ? res.data.appointments
        : [];
      setAppointments(items);
      setAppointmentsVisibleCount(APPOINTMENTS_PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointmentsError(
        error.response?.data?.error || "Failed to load appointments",
      );
      setAppointments([]);
      setAppointmentsVisibleCount(0);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchBedBookings = async () => {
    try {
      setBedBookingsLoading(true);
      setBedBookingsError(null);
      const res = await api.get("/user/bed-bookings");
      const items = Array.isArray(res.data?.bookings) ? res.data.bookings : [];
      setBedBookings(items);
      setBedBookingsVisibleCount(BED_BOOKINGS_PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching bed bookings:", error);
      setBedBookingsError(
        error.response?.data?.error || "Failed to load bed bookings",
      );
      setBedBookings([]);
      setBedBookingsVisibleCount(0);
    } finally {
      setBedBookingsLoading(false);
    }
  };

  const getBedBookingStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "confirmed") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    } else if (s === "pending") {
      return "bg-amber-50 text-amber-800 border-amber-200";
    } else if (s === "completed") {
      return "bg-blue-50 text-blue-800 border-blue-200";
    } else if (s === "cancelled" || s === "rejected") {
      return "bg-red-50 text-red-800 border-red-200";
    }
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const formatWardType = (wardType, acType) => {
    const wardLabels = {
      general: "General Ward",
      maternity: "Maternity Ward",
      pediatrics: "Pediatrics Ward",
      icu: "ICU",
      emergency: "Emergency",
      private_room: "Private Room",
    };
    let label = wardLabels[wardType] || wardType;
    if (acType === "ac") label += " (AC)";
    else if (acType === "non_ac") label += " (Non-AC)";
    return label;
  };

  const formatAppointmentDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAppointmentStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "confirmed" || s === "scheduled") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    } else if (s === "pending") {
      return "bg-amber-50 text-amber-800 border-amber-200";
    } else if (s === "completed") {
      return "bg-blue-50 text-blue-800 border-blue-200";
    } else if (s === "cancelled") {
      return "bg-red-50 text-red-800 border-red-200";
    }
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const resolveSosRequest = async (requestId) => {
    if (!requestId) return;
    setSosHistoryError(null);
    setResolvingSosId(requestId);
    try {
      await api.post(`/emergency/sos/${requestId}/resolve`);
      await fetchSosHistory({ reset: true });
    } catch (error) {
      console.error("Error resolving SOS:", error);
      setSosHistoryError(
        error.response?.data?.error || "Failed to resolve SOS request",
      );
    } finally {
      setResolvingSosId(null);
    }
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const SosStatusBadge = ({ status }) => {
    const s = (status || "").toString();
    const styles =
      s === "pending"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : s === "acknowledged"
          ? "bg-blue-50 text-blue-800 border-blue-200"
          : s === "resolved"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-gray-50 text-gray-700 border-gray-200";
    return (
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
      >
        {s ? s.toUpperCase() : "UNKNOWN"}
      </span>
    );
  };

  const handleEdit = () => {
    setEditing(true);
    setEditedData({ ...profile });
  };

  const handleCancel = () => {
    setEditing(false);
    setEditedData({ ...profile });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put("/auth/profile", editedData);
      // Refetch profile to ensure UI is in sync with backend
      await fetchProfile();
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    api
      .post("/auth/profile/photo", formData)
      .then((res) => {
        const newUrl = res.data?.profile_picture;
        if (newUrl) {
          setProfile((prev) => ({ ...prev, profile_picture: newUrl }));
        }
      })
      .catch((error) => {
        console.error("Error updating profile photo:", error);
        alert(error.response?.data?.error || "Failed to update profile photo");
      });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const profileImageSrc = resolveProfileImageSrc(profile.profile_picture);

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Main Container with Background and Shadow */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <BackToDashboardButton />
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              </div>

              <div className="flex justify-end">
                {!editing ? (
                  <button
                    onClick={handleEdit}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm font-semibold"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 font-semibold"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-700 transition-all shadow-sm font-semibold"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Profile Header (compact) */}
            <div className="mb-6">
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-white p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-gray-100">
                      {profileImageSrc ? (
                        <img
                          src={profileImageSrc}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fall back to default avatar if the stored URL is stale/broken.
                            setProfile((prev) => ({
                              ...prev,
                              profile_picture: "/api/auth/user-photos/user.png",
                            }));
                          }}
                        />
                      ) : (
                        <User className="w-10 h-10 text-blue-600" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="min-w-0">
                      {editing ? (
                        <input
                          type="text"
                          value={editedData.name || ""}
                          onChange={(e) =>
                            setEditedData({
                              ...editedData,
                              name: e.target.value,
                            })
                          }
                          className="w-full text-xl sm:text-2xl font-bold text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Enter your name"
                        />
                      ) : (
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                          {profile.name || "Unnamed"}
                        </h2>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{profile.email || "—"}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      {/* Phone */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Phone</p>
                          {editing ? (
                            <input
                              type="tel"
                              value={editedData.phone || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  phone: e.target.value,
                                })
                              }
                              className="mt-1 w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder="Enter phone number"
                            />
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                              {profile.phone || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Address</p>
                          {editing ? (
                            <input
                              type="text"
                              value={editedData.address || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  address: e.target.value,
                                })
                              }
                              className="mt-1 w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              placeholder="Enter your address"
                            />
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                              {profile.address || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* DOB */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Date of Birth</p>
                          {editing ? (
                            <input
                              type="date"
                              value={editedData.date_of_birth || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  date_of_birth: e.target.value,
                                })
                              }
                              className="mt-1 w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                              {profile.date_of_birth
                                ? formatDate(profile.date_of_birth)
                                : "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Gender</p>
                          {editing ? (
                            <select
                              value={editedData.gender || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  gender: e.target.value,
                                })
                              }
                              className="mt-1 w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-gray-900 capitalize truncate">
                              {profile.gender || "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Blood group */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                          <Droplet className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Blood Group</p>
                          {editing ? (
                            <select
                              value={editedData.blood_group || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  blood_group: e.target.value,
                                })
                              }
                              className="mt-1 w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                              <option value="">Select blood group</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                              {profile.blood_group || "—"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {/* Appointments */}
              <div
                onClick={() =>
                  document
                    .getElementById("appointments-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-3 right-3">
                  <TrendingUp className="w-4 h-4 text-blue-600 opacity-50" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                  {stats.appointments}
                </h2>
                <p className="text-gray-600 text-xs font-semibold">
                  Appointments
                </p>
              </div>

              {/* Bed Bookings */}
              <div
                onClick={() =>
                  document
                    .getElementById("bed-bookings-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-3 right-3">
                  <Bed className="w-4 h-4 text-rose-600 opacity-50" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 group-hover:scale-110 transition-transform">
                    <Bed className="w-5 h-5 text-rose-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                  {bedBookingsLoading ? "…" : bedBookings.length}
                </h2>
                <p className="text-gray-600 text-xs font-semibold">
                  Bed Bookings
                </p>
              </div>

              {/* SOS History */}
              <div
                onClick={() =>
                  document
                    .getElementById("sos-history")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-3 right-3">
                  <Clock className="w-4 h-4 text-red-600 opacity-50" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-red-50 p-2 rounded-lg border border-red-100 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                  {sosHistoryLoading ? "…" : sosHistory.length}
                </h2>
                <p className="text-gray-600 text-xs font-semibold">
                  SOS History
                </p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Details intentionally excludes basic identity fields (moved to header) */}
            </div>

            {/* Appointments Section */}
            <div className="mt-10" id="appointments-section">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      My Appointments
                    </h2>
                    <p className="text-sm text-gray-500">
                      Your scheduled appointments
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchAppointments}
                    disabled={appointmentsLoading}
                    className="shrink-0 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {appointmentsLoading && (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                      )}
                      <span>Refresh</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/doctors")}
                    className="shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Book New
                  </button>
                </div>
              </div>

              {appointmentsError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {appointmentsError}
                </div>
              )}

              {!appointmentsError &&
                appointments.length === 0 &&
                !appointmentsLoading && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      No appointments yet
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                      Book an appointment with a doctor to get started
                    </p>
                    <button
                      onClick={() => navigate("/doctors")}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                    >
                      Find Doctors
                    </button>
                  </div>
                )}

              {appointments.length > 0 && (
                <div className="grid gap-3">
                  {appointments
                    .slice(0, appointmentsVisibleCount)
                    .map((appt) => (
                      <div
                        key={appt.id}
                        className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">
                                Dr. {appt.doctor_name || "Doctor"}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {appt.specialty_name ||
                                  appt.specialty ||
                                  "General"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getAppointmentStatusBadge(
                              appt.status,
                            )}`}
                          >
                            {(appt.status || "scheduled").toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Date
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {formatAppointmentDate(appt.appointment_date)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Time
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {appt.time_slot || appt.appointment_time || "—"}
                            </div>
                          </div>
                          {appt.notes && (
                            <div className="rounded-xl border border-gray-200 bg-white p-3 col-span-2 md:col-span-1">
                              <div className="text-[11px] uppercase tracking-wider text-gray-500">
                                Notes
                              </div>
                              <div className="mt-1 text-sm text-gray-700 truncate">
                                {appt.notes}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate("/appointments")}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}

                  {appointmentsVisibleCount < appointments.length && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAppointmentsVisibleCount((prev) =>
                            Math.min(
                              prev + APPOINTMENTS_PAGE_SIZE,
                              appointments.length,
                            ),
                          )
                        }
                        className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bed Bookings Section */}
            <div className="mt-10" id="bed-bookings-section">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <Bed className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      My Bed Bookings
                    </h2>
                    <p className="text-sm text-gray-500">
                      Your hospital bed reservations
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchBedBookings}
                    disabled={bedBookingsLoading}
                    className="shrink-0 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {bedBookingsLoading && (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                      )}
                      <span>Refresh</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/hospital-search")}
                    className="shrink-0 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
                  >
                    Book New
                  </button>
                </div>
              </div>

              {bedBookingsError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bedBookingsError}
                </div>
              )}

              {!bedBookingsError &&
                bedBookings.length === 0 &&
                !bedBookingsLoading && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bed className="w-8 h-8 text-rose-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      No bed bookings yet
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                      Search hospitals and book a bed when you need admission
                    </p>
                    <button
                      onClick={() => navigate("/hospital-search")}
                      className="inline-flex items-center px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                    >
                      Find Hospitals
                    </button>
                  </div>
                )}

              {bedBookings.length > 0 && (
                <div className="grid gap-3">
                  {bedBookings
                    .slice(0, bedBookingsVisibleCount)
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                              <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">
                                {booking.hospital_name || "Hospital"}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {formatWardType(
                                  booking.ward_type,
                                  booking.ac_type,
                                )}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getBedBookingStatusBadge(
                              booking.status,
                            )}`}
                          >
                            {(booking.status || "pending").toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" /> Patient
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {booking.patient_name || "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Admission Date
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {formatAppointmentDate(
                                booking.preferred_date ||
                                  booking.admission_date,
                              )}
                            </div>
                          </div>
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> Contact
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              {booking.patient_phone || "—"}
                            </div>
                          </div>
                        </div>

                        {booking.admission_reason && (
                          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wider text-gray-500">
                              Reason for Admission
                            </div>
                            <div className="mt-1 text-sm text-gray-700">
                              {booking.admission_reason}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate("/my-bed-bookings")}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            View All Bookings
                          </button>
                        </div>
                      </div>
                    ))}

                  {bedBookingsVisibleCount < bedBookings.length && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBedBookingsVisibleCount((prev) =>
                            Math.min(
                              prev + BED_BOOKINGS_PAGE_SIZE,
                              bedBookings.length,
                            ),
                          )
                        }
                        className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SOS History */}
            <div className="mt-10" id="sos-history">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      SOS History
                    </h2>
                    <p className="text-sm text-gray-500">
                      Your past emergency requests
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fetchSosHistory({ reset: true })}
                  disabled={sosHistoryLoading}
                  className="w-28 shrink-0 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {sosHistoryLoading && (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                    )}
                    <span>Refresh</span>
                  </span>
                </button>
              </div>

              {sosHistoryError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {sosHistoryError}
                </div>
              )}

              {!sosHistoryError &&
                sosHistory.length === 0 &&
                !sosHistoryLoading && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                    No SOS history yet.
                  </div>
                )}

              {sosHistory.length > 0 && (
                <div className="grid gap-3">
                  {sosHistory.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-bold text-gray-900">
                              Request #{req.id}
                            </div>
                            <SosStatusBadge status={req.status} />
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            Type:{" "}
                            <span className="font-semibold text-gray-900">
                              {req.emergency_type_label ||
                                req.emergency_type ||
                                "General"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-gray-500">Created</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatDateTime(req.created_at)}
                          </div>

                          {(req.status === "pending" ||
                            (req.status === "acknowledged" &&
                              !req.hospital_id)) && (
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => resolveSosRequest(req.id)}
                                disabled={resolvingSosId === req.id}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <span className="inline-flex items-center justify-center gap-2">
                                  {resolvingSosId === req.id && (
                                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-200 border-t-white" />
                                  )}
                                  <span>Resolve</span>
                                </span>
                              </button>
                            </div>
                          )}
                          {req.status === "acknowledged" && req.hospital_id ? (
                            <div className="mt-2 text-xs text-blue-700">
                              Accepted by a hospital — only the hospital can
                              mark it resolved.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Accepted
                          </div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">
                            {formatDateTime(req.acknowledged_at)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Resolved
                          </div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">
                            {formatDateTime(req.resolved_at)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <div className="text-[11px] uppercase tracking-wider text-gray-500">
                            Hospital
                          </div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">
                            {req.hospital_name || "—"}
                          </div>
                          <div className="mt-0.5 text-sm text-gray-700">
                            {req.hospital_phone || ""}
                          </div>
                        </div>
                      </div>

                      {(req.note ||
                        req.hospital_phone ||
                        (typeof req.latitude === "number" &&
                          typeof req.longitude === "number")) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {req.hospital_phone && (
                            <a
                              href={`tel:${req.hospital_phone}`}
                              className="rounded-xl bg-gray-900 text-white px-3 py-2 text-xs font-semibold hover:bg-gray-800"
                            >
                              Call hospital
                            </a>
                          )}
                          {typeof req.latitude === "number" &&
                            typeof req.longitude === "number" && (
                              <a
                                href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                View location
                              </a>
                            )}
                          {req.note && (
                            <div className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                              <span className="font-semibold text-gray-800">
                                Note:{" "}
                              </span>
                              {req.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {sosHistoryHasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => fetchSosHistory({ reset: false })}
                        disabled={sosHistoryLoading}
                        className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          {sosHistoryLoading && (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                          )}
                          <span>Load more</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* End Main Container */}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default UserProfile;
