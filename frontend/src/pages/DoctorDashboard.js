import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../utils/auth";
import api from "../utils/api";
import ConsultationChatPanel from "../components/ConsultationChatPanel";
import TimeSlotPicker from "../components/TimeSlotPicker";
import {
  User,
  Calendar,
  Star,
  Award,
  Clock,
  DollarSign,
  Edit2,
  Save,
  X,
  CheckCircle,
  Users,
  TrendingUp,
} from "lucide-react";

function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    total_appointments: 0,
    completed_appointments: 0,
    total_patients: 0,
    today_appointments: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilitySlots, setAvailabilitySlots] = useState([
    { day: "Monday", slots: [] },
    { day: "Tuesday", slots: [] },
    { day: "Wednesday", slots: [] },
    { day: "Thursday", slots: [] },
    { day: "Friday", slots: [] },
    { day: "Saturday", slots: [] },
    { day: "Sunday", slots: [] },
  ]);
  const [timeSlotPickerOpen, setTimeSlotPickerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Check if user is a doctor
    if (currentUser.role !== "doctor") {
      console.error("User is not a doctor");
      navigate("/dashboard");
      return;
    }

    // Immediately set doctor from localStorage to show dashboard
    setDoctor(currentUser);
    setEditForm({
      name: currentUser.name || "",
      specialty: currentUser.specialty || "",
      qualification: currentUser.qualification || "",
      experience: currentUser.experience || 0,
      consultation_fee: currentUser.consultation_fee || 0,
      phone: currentUser.phone || "",
      bio: currentUser.bio || "",
    });
    setLoading(false);

    // Then fetch updated data from API in the background
    const fetchDoctorData = async () => {
      try {
        console.log("Fetching doctor data from API...");

        // Fetch doctor profile
        const profileRes = await api.get("/doctor/profile");
        console.log("Doctor profile response:", profileRes.data);
        const doctorData = profileRes.data.doctor;
        setDoctor(doctorData);
        setEditForm({
          name: doctorData.name || "",
          specialty: doctorData.specialty || "",
          qualification: doctorData.qualification || "",
          experience: doctorData.experience || 0,
          consultation_fee: doctorData.consultation_fee || 0,
          phone: doctorData.phone || "",
          bio: doctorData.bio || "",
        });

        // Fetch doctor stats
        const statsRes = await api.get("/doctor/stats");
        console.log("Doctor stats response:", statsRes.data);
        setStats(statsRes.data);

        // Fetch today's appointments
        const today = new Date().toISOString().split("T")[0];
        const appointmentsRes = await api.get(
          `/doctor/appointments?date=${today}`
        );
        console.log("Doctor appointments response:", appointmentsRes.data);
        setTodayAppointments(appointmentsRes.data.appointments || []);
      } catch (error) {
        console.error("Error fetching doctor data from API:", error);
        console.error("Error details:", error.response?.data);

        // Show error message to user
        if (error.response?.status === 401) {
          console.log("Session expired. Please login again.");
          logout();
          navigate("/login");
          return;
        }

        // Already have fallback data from localStorage
        console.log("Using cached data from localStorage");
      }
    };

    // Fetch data but don't block the UI
    fetchDoctorData();
  }, [navigate]);

  // Load doctor availability on mount
  useEffect(() => {
    loadDoctorAvailability();
  }, []);

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    try {
      console.log("Updating profile with:", editForm);
      const response = await api.put("/doctor/profile", editForm);
      console.log("Update response:", response.data);

      // Update local state
      const updatedDoctor = { ...doctor, ...editForm };
      setDoctor(updatedDoctor);

      // Update localStorage to keep user data in sync
      const currentUser = getCurrentUser();
      const updatedUser = { ...currentUser, ...editForm };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setIsEditing(false);
      alert("Profile updated successfully!");

      // Refresh profile from server to ensure sync
      const profileRes = await api.get("/doctor/profile");
      setDoctor(profileRes.data.doctor);
    } catch (error) {
      console.error("Error updating profile:", error);
      console.error("Error details:", error.response?.data);

      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        logout();
        navigate("/login");
      } else {
        alert(
          `Failed to update profile: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: doctor.name || "",
      specialty: doctor.specialty || "",
      qualification: doctor.qualification || "",
      experience: doctor.experience || 0,
      consultation_fee: doctor.consultation_fee || 0,
      phone: doctor.phone || "",
      bio: doctor.bio || "",
    });
    setIsEditing(false);
  };

  const addTimeSlot = (day) => {
    setSelectedDay(day);
    setTimeSlotPickerOpen(true);
  };

  const handleSaveTimeSlots = (newSlots) => {
    setAvailabilitySlots(
      availabilitySlots.map((slot) =>
        slot.day === selectedDay 
          ? { ...slot, slots: [...slot.slots, ...newSlots] } 
          : slot
      )
    );
    // Auto-save after adding slots
    saveAvailabilityToBackend();
  };

  const removeTimeSlot = (day, slotToRemove) => {
    setAvailabilitySlots(
      availabilitySlots.map((slot) =>
        slot.day === day
          ? { ...slot, slots: slot.slots.filter((s) => s !== slotToRemove) }
          : slot
      )
    );
    // Auto-save after removing slot
    saveAvailabilityToBackend();
  };

  const saveAvailabilityToBackend = async () => {
    try {
      setSaving(true);
      
      // Convert availability slots to the format expected by backend
      const allSlots = availabilitySlots.flatMap(daySlot => daySlot.slots);
      const availableDays = availabilitySlots
        .filter(daySlot => daySlot.slots.length > 0)
        .map(daySlot => daySlot.day);

      await api.put("/doctor/profile", {
        available_slots: JSON.stringify(allSlots),
        available_days: JSON.stringify(availableDays),
      });
      
      // Show success message briefly
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error("Error saving availability:", error);
      setSaving(false);
    }
  };

  const loadDoctorAvailability = async () => {
    try {
      const response = await api.get("/doctor/profile");
      const doctor = response.data.doctor;
      
      if (doctor.available_slots && doctor.available_days) {
        const slots = JSON.parse(doctor.available_slots);
        const days = JSON.parse(doctor.available_days);
        
        // For now, assign the same slots to all available days
        // In the future, this could be more sophisticated per-day scheduling
        const updatedSlots = availabilitySlots.map(daySlot => ({
          ...daySlot,
          slots: days.includes(daySlot.day) ? [...slots] : []
        }));
        
        setAvailabilitySlots(updatedSlots);
      }
    } catch (error) {
      console.error("Error loading doctor availability:", error);
    }
  };

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Welcome, Dr. {doctor.name}
            </h1>
            <p className="text-blue-100">{doctor.specialty}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex space-x-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              activeTab === "overview"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("availability")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              activeTab === "availability"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition relative ${
              activeTab === "chat"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Patient Chat
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Progress Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="w-6 h-6 text-amber-500" />
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {doctor?.rating || "4.8"}
                  </p>
                  <p className="text-sm text-gray-600">Rating</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {editForm.experience}+
                  </p>
                  <p className="text-sm text-gray-600">Years Exp.</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_patients}
                  </p>
                  <p className="text-sm text-gray-600">Patients</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${editForm.consultation_fee}
                  </p>
                  <p className="text-sm text-gray-600">Fee</p>
                </div>
              </div>

              {/* Professional Profile Card */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Professional Profile
                  </h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="font-medium">Edit</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveProfile}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Save className="w-4 h-4" />
                        <span className="font-medium">Save</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        <X className="w-4 h-4" />
                        <span className="font-medium">Cancel</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          Dr. {doctor.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialty
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="specialty"
                          value={editForm.specialty}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {doctor.specialty}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qualification
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="qualification"
                          value={editForm.qualification}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {doctor.qualification || "Not specified"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Experience (Years)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          name="experience"
                          value={editForm.experience}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {doctor.experience || 0} years
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Consultation Fee ($)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          name="consultation_fee"
                          value={editForm.consultation_fee}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          ${doctor.consultation_fee || 0}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={editForm.phone}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {doctor.phone || "Not specified"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={editForm.bio}
                        onChange={handleEditChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">
                        {doctor.bio || "No bio available"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Today's Appointments */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Today's Appointments ({stats.today_appointments})
                </h2>
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-gray-500 text-center py-4">Loading...</p>
                  ) : todayAppointments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No appointments for today
                    </p>
                  ) : (
                    todayAppointments.map((apt, idx) => (
                      <div
                        key={apt.id || idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {apt.patient_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {apt.symptoms || "General consultation"}
                            </p>
                            <span
                              className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                                apt.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : apt.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : apt.status === "completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {apt.appointment_time?.substring(0, 5) || apt.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Completion */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Profile Completion
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        Complete your profile
                      </span>
                      <span className="font-medium text-blue-600">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: "85%" }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Basic Information
                    </div>
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Professional Details
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      Set Availability
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      Upload Documents
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Overall Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Appointments</span>
                    <span className="font-bold text-gray-900">
                      {stats.total_appointments}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-bold text-green-600">
                      {stats.completed_appointments}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Patients</span>
                    <span className="font-bold text-gray-900">
                      {stats.total_patients}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Today's Appointments</span>
                    <span className="font-bold text-blue-600">
                      {stats.today_appointments}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === "availability" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Clock className="w-6 h-6 mr-2 text-blue-600" />
                  Set Your Availability
                </h2>
                <button 
                  onClick={saveAvailabilityToBackend}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition font-medium flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                {availabilitySlots.map((daySlot) => (
                  <div
                    key={daySlot.day}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-gray-900">{daySlot.day}</h3>
                      <button
                        onClick={() => addTimeSlot(daySlot.day)}
                        className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium border border-green-200"
                      >
                        + Add Slot
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {daySlot.slots.length > 0 ? (
                        daySlot.slots.map((slot, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200"
                          >
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{slot}</span>
                            <button
                              onClick={() => removeTimeSlot(daySlot.day, slot)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">
                          No slots available
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your availability will be shown to
                  patients when booking appointments. Make sure to keep it
                  updated.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="h-[calc(100vh-300px)]">
            <ConsultationChatPanel role="doctor" className="h-full" />
          </div>
        )}
      </div>

      {/* Time Slot Picker Modal */}
      <TimeSlotPicker
        isOpen={timeSlotPickerOpen}
        onClose={() => setTimeSlotPickerOpen(false)}
        onSave={handleSaveTimeSlots}
        day={selectedDay}
      />
    </div>
  );
}

export default DoctorDashboard;
