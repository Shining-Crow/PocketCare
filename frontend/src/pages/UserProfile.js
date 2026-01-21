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
  const [sosHistoryOffset, setSosHistoryOffset] = useState(0);
  const [sosHistoryHasMore, setSosHistoryHasMore] = useState(false);
  const SOS_HISTORY_PAGE_SIZE = 10;

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/profile");
      const userData = response.data.user;

      // Load profile picture from localStorage
      const savedPicture = localStorage.getItem(
        `profilePicture_${userData.id}`
      );
      if (savedPicture) {
        userData.profile_picture = savedPicture;
      }

      setProfile(userData);
      setStats({
        appointments: Number(response.data?.stats?.appointments || 0),
      });
      setEditedData(userData);

      // Load SOS history after we have a valid user profile.
      fetchSosHistory({ reset: true });
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
      setSosHistoryError(error.response?.data?.error || "Failed to load SOS history");
      setSosHistory([]);
      setSosHistoryOffset(0);
      setSosHistoryHasMore(false);
    } finally {
      setSosHistoryLoading(false);
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
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
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

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      // Store in localStorage with user ID
      localStorage.setItem(`profilePicture_${profile.id}`, base64String);
      setProfile({ ...profile, profile_picture: base64String });
    };
    reader.readAsDataURL(file);
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

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Main Container with Background and Shadow */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <BackToDashboardButton />
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            </div>
            {/* Profile Picture */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative mb-4">
                <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-blue-200">
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-20 h-20 text-blue-600" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 p-3 rounded-full cursor-pointer hover:bg-blue-700 transition-all shadow-xl hover:scale-110">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-2xl text-gray-800 font-bold">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
              {/* Appointments */}
              <div
                onClick={() => navigate("/appointments")}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-4 right-4">
                  <TrendingUp className="w-5 h-5 text-blue-600 opacity-50" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.appointments}
                </h2>
                <p className="text-gray-600 text-sm font-medium">
                  Appointments
                </p>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="flex justify-end mb-6">
              {!editing ? (
                <button
                  onClick={handleEdit}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-green-600 transition-all shadow-lg disabled:opacity-50 font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-600 transition-all shadow-lg font-medium"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-indigo-100 p-3 rounded-xl shadow-sm">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">Name</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editedData.name || ""}
                      onChange={(e) =>
                        setEditedData({ ...editedData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter your name"
                    />
                  ) : (
                    <p className="text-gray-900 font-semibold">
                      {profile.name || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-blue-100 p-3 rounded-xl shadow-sm">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">
                    Email
                  </p>
                  <p className="text-gray-900 font-semibold">{profile.email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-green-100 p-3 rounded-xl shadow-sm">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">
                    Phone
                  </p>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedData.phone || ""}
                      onChange={(e) =>
                        setEditedData({ ...editedData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-gray-900 font-semibold">
                      {profile.phone || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-purple-100 p-3 rounded-xl shadow-sm">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">
                    Date of Birth
                  </p>
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
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  ) : (
                    <p className="text-gray-900 font-semibold">
                      {formatDate(profile.date_of_birth)}
                    </p>
                  )}
                </div>
              </div>

              {/* Gender */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-pink-100 p-3 rounded-xl shadow-sm">
                  <User className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">
                    Gender
                  </p>
                  {editing ? (
                    <select
                      value={editedData.gender || ""}
                      onChange={(e) =>
                        setEditedData({ ...editedData, gender: e.target.value })
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 font-semibold capitalize">
                      {profile.gender || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Blood Group */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-red-100 p-3 rounded-xl shadow-sm">
                  <Droplet className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">
                    Blood Group
                  </p>
                  {editing ? (
                    <select
                      value={editedData.blood_group || ""}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          blood_group: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                    <p className="text-gray-900 font-semibold">
                      {profile.blood_group || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                <div className="bg-orange-100 p-3 rounded-xl shadow-sm">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1 font-medium">
                    Address
                  </p>
                  {editing ? (
                    <textarea
                      value={editedData.address || ""}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      rows="3"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <p className="text-gray-900 font-semibold">
                      {profile.address || "Not set"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SOS History */}
            <div className="mt-10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">SOS History</h2>
                    <p className="text-sm text-gray-500">Your past emergency requests</p>
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

              {!sosHistoryError && sosHistory.length === 0 && !sosHistoryLoading && (
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
                            <div className="text-sm font-bold text-gray-900">Request #{req.id}</div>
                            <SosStatusBadge status={req.status} />
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            Type: <span className="font-semibold text-gray-900">{req.emergency_type || "General"}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-gray-500">Created</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatDateTime(req.created_at)}
                          </div>
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
                          <div className="text-[11px] uppercase tracking-wider text-gray-500">Hospital</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">
                            {req.hospital_name || "—"}
                          </div>
                          <div className="mt-0.5 text-sm text-gray-700">{req.hospital_phone || ""}</div>
                        </div>
                      </div>

                      {(req.note || req.hospital_phone || (typeof req.latitude === "number" && typeof req.longitude === "number")) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {req.hospital_phone && (
                            <a
                              href={`tel:${req.hospital_phone}`}
                              className="rounded-xl bg-gray-900 text-white px-3 py-2 text-xs font-semibold hover:bg-gray-800"
                            >
                              Call hospital
                            </a>
                          )}
                          {typeof req.latitude === "number" && typeof req.longitude === "number" && (
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
                              <span className="font-semibold text-gray-800">Note: </span>
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
