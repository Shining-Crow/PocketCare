import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../utils/auth";
import api from "../utils/api";
import {
  User,
  Calendar,
  MessageSquare,
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
  Send,
  Search,
  MoreVertical,
} from "lucide-react";
import DoctorNavbar from "../components/DoctorNavbar";

function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [stats, setStats] = useState({
    total_appointments: 0,
    completed_appointments: 0,
    total_patients: 0,
    today_appointments: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilitySlots, setAvailabilitySlots] = useState([
    { day: "Monday", slots: ["09:00-12:00", "14:00-17:00"] },
    { day: "Tuesday", slots: ["09:00-12:00", "14:00-17:00"] },
    { day: "Wednesday", slots: ["09:00-12:00"] },
    { day: "Thursday", slots: ["09:00-12:00", "14:00-17:00"] },
    { day: "Friday", slots: ["09:00-12:00", "14:00-16:00"] },
  ]);

  const [patients] = useState([
    {
      id: 1,
      name: "John Smith",
      lastMessage: "Thank you doctor!",
      time: "2m ago",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      lastMessage: "When should I take the medicine?",
      time: "15m ago",
      unread: 0,
      online: true,
    },
    {
      id: 3,
      name: "Mike Brown",
      lastMessage: "Appointment confirmed",
      time: "1h ago",
      unread: 0,
      online: false,
    },
    {
      id: 4,
      name: "Emily Davis",
      lastMessage: "Can we reschedule?",
      time: "2h ago",
      unread: 1,
      online: false,
    },
    {
      id: 5,
      name: "Robert Wilson",
      lastMessage: "Test results received",
      time: "3h ago",
      unread: 0,
      online: false,
    },
  ]);

  const [chatHistory] = useState([
    {
      id: 1,
      sender: "patient",
      message: "Hello Dr., I have a question about my medication",
      time: "10:30 AM",
    },
    {
      id: 2,
      sender: "doctor",
      message: "Hello! Of course, how can I help you?",
      time: "10:32 AM",
    },
    {
      id: 3,
      sender: "patient",
      message: "Should I take it before or after meals?",
      time: "10:33 AM",
    },
    {
      id: 4,
      sender: "doctor",
      message: "Take it after meals, twice daily. Morning and evening.",
      time: "10:35 AM",
    },
    {
      id: 5,
      sender: "patient",
      message: "Thank you doctor!",
      time: "10:36 AM",
    },
  ]);

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

    const fetchDoctorData = async () => {
      try {
        setLoading(true);
        console.log("Fetching doctor data...");

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
        console.error("Error fetching doctor data:", error);
        console.error("Error details:", error.response?.data);

        // Show error message to user
        if (error.response?.status === 401) {
          alert("Session expired. Please login again.");
          logout();
          navigate("/login");
          return;
        }

        // Fall back to localStorage data if API fails
        console.log("Falling back to localStorage data");
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
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // TODO: Send message via API
      console.log("Sending message:", chatMessage);
      setChatMessage("");
    }
  };

  const addTimeSlot = (day) => {
    const newSlot = prompt("Enter time slot (e.g., 09:00-12:00):");
    if (newSlot) {
      setAvailabilitySlots(
        availabilitySlots.map((slot) =>
          slot.day === day ? { ...slot, slots: [...slot.slots, newSlot] } : slot
        )
      );
    }
  };

  const removeTimeSlot = (day, slotToRemove) => {
    setAvailabilitySlots(
      availabilitySlots.map((slot) =>
        slot.day === day
          ? { ...slot, slots: slot.slots.filter((s) => s !== slotToRemove) }
          : slot
      )
    );
  };

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navbar  */}
      <DoctorNavbar handleLogout={handleLogout}></DoctorNavbar>
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
            {patients.filter((p) => p.unread > 0).length > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {patients
                  .filter((p) => p.unread > 0)
                  .reduce((sum, p) => sum + p.unread, 0)}
              </span>
            )}
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
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  Save Changes
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
          <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
            {/* Patient List */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-y-auto h-full">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedChat(patient)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition ${
                      selectedChat?.id === patient.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        {patient.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {patient.name}
                          </p>
                          {patient.unread > 0 && (
                            <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                              {patient.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {patient.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {patient.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {selectedChat.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          {selectedChat.online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {selectedChat.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedChat.online ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender === "doctor"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            msg.sender === "doctor"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-900"
                          } rounded-lg p-3`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.sender === "doctor"
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSendMessage()
                        }
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center space-x-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      Select a patient to start chatting
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;
