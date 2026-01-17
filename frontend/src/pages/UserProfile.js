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
  FileText,
  CalendarCheck,
  Award,
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
    reports: 0,
    day_streak: 0,
  });
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

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
      setStats(
        response.data.stats || { appointments: 0, reports: 0, day_streak: 0 }
      );
      setEditedData(userData);
    } catch (error) {
      console.error("Error fetching profile:", error);
      alert(error.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

              {/* Reports */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-4 right-4">
                  <TrendingUp className="w-5 h-5 text-cyan-600 opacity-50" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.reports}
                </h2>
                <p className="text-gray-600 text-sm font-medium">Reports</p>
              </div>

              {/* Day Streak */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-4 right-4">
                  <Award className="w-5 h-5 text-yellow-600 opacity-50" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white p-2.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Award className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.day_streak}
                </h2>
                <p className="text-gray-600 text-sm font-medium">Day Streak</p>
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
          </div>
          {/* End Main Container */}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default UserProfile;
