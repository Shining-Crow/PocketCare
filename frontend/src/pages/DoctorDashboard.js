import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../utils/auth";
import api from "../utils/api";
import ConsultationChatPanel from "../components/ConsultationChatPanel";
import TimeSlotPicker from "../components/TimeSlotPicker";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  User,
  Calendar,
  RefreshCw,
  Award,
  Clock,
  DollarSign,
  Edit2,
  Save,
  X,
  CheckCircle,
  Users,
} from "lucide-react";

function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [specialtyDropdownOpen, setSpecialtyDropdownOpen] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]); // [{ id?: number, name: string }]
  const doctorSpecialtiesText = useMemo(() => {
    if (!doctor) return "";
    const raw = doctor.specialties;

    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
        else list = [raw];
      } catch {
        list = [raw];
      }
    } else if (doctor.specialty) {
      list = [doctor.specialty];
    }

    const cleaned = list
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);

    // de-dupe case-insensitively
    const seen = new Set();
    const uniq = [];
    for (const s of cleaned) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(s);
      }
    }

    return uniq.join(", ");
  }, [doctor]);
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
  const [allAppointments, setAllAppointments] = useState([]);
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
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
    loading: false,
    action: "cancel", // 'cancel', 'delete', or 'accept'
  });

  const filteredSpecialties = useMemo(() => {
    const q = (specialtyQuery || "").trim().toLowerCase();
    const base = Array.isArray(specialties) ? specialties : [];
    if (!q) return base.slice(0, 8);
    return base
      .filter((s) => (s?.name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [specialties, specialtyQuery]);

  const canAddCustom = useMemo(() => {
    const q = (specialtyQuery || "").trim();
    if (!q) return false;
    const existsInSelected = selectedSpecialties.some(
      (x) => (x?.name || "").toLowerCase() === q.toLowerCase(),
    );
    const existsInList = (Array.isArray(specialties) ? specialties : []).some(
      (s) => (s?.name || "").toLowerCase() === q.toLowerCase(),
    );
    return !existsInSelected && !existsInList;
  }, [specialtyQuery, selectedSpecialties, specialties]);

  const setSelectedSpecialtiesFromDoctor = (doc) => {
    if (!doc) {
      setSelectedSpecialties([]);
      return;
    }

    const raw = doc.specialties;
    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
        else list = [raw];
      } catch {
        list = [raw];
      }
    } else if (doc.specialty) {
      list = [doc.specialty];
    }

    const cleaned = list
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);

    const seen = new Set();
    const uniq = [];
    for (const s of cleaned) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(s);
      }
    }

    setSelectedSpecialties(uniq.map((name) => ({ name })));
  };

  const addSpecialty = (item) => {
    const name = (item?.name || "").trim();
    if (!name) return;
    const exists = selectedSpecialties.some(
      (x) => (x?.name || "").toLowerCase() === name.toLowerCase(),
    );
    if (exists) return;

    const next = [...selectedSpecialties, { id: item?.id, name }];
    setSelectedSpecialties(next);
    setSpecialtyQuery("");
    setSpecialtyDropdownOpen(false);
  };

  const removeSpecialty = (name) => {
    setSelectedSpecialties((prev) =>
      prev.filter(
        (x) => (x?.name || "").toLowerCase() !== (name || "").toLowerCase(),
      ),
    );
  };

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await api.get("/specialties");
        const list = Array.isArray(res.data?.specialties)
          ? res.data.specialties
          : [];
        setSpecialties(list);
      } catch {
        setSpecialties([]);
      }
    };
    fetchSpecialties();
  }, []);

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
    setSelectedSpecialtiesFromDoctor(currentUser);
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
        setSelectedSpecialtiesFromDoctor(doctorData);
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

        // Fetch today's appointments - use local date to avoid timezone issues
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        console.log("Fetching appointments for today:", today);
        const appointmentsRes = await api.get(
          `/doctor/appointments?date=${today}`,
        );
        console.log("Doctor appointments response:", appointmentsRes.data);
        setTodayAppointments(appointmentsRes.data.appointments || []);

        // Fetch all appointments for the doctor
        const allAppointmentsRes = await api.get(`/doctor/appointments`);
        console.log(
          "All doctor appointments response:",
          allAppointmentsRes.data,
        );
        setAllAppointments(allAppointmentsRes.data.appointments || []);
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

  const loadDoctorAvailability = useCallback(async () => {
    try {
      const response = await api.get("/doctor/profile");
      const doctor = response.data.doctor;

      // Try to load from new day-specific format first
      if (doctor.day_specific_availability) {
        const daySpecificData = JSON.parse(doctor.day_specific_availability);
        setAvailabilitySlots((prev) =>
          prev.map((daySlot) => ({
            ...daySlot,
            slots: daySpecificData[daySlot.day] || [],
          })),
        );
      }
      // Fallback to old format if new format doesn't exist
      else if (doctor.available_slots && doctor.available_days) {
        const slots = JSON.parse(doctor.available_slots);
        const days = JSON.parse(doctor.available_days);

        setAvailabilitySlots((prev) =>
          prev.map((daySlot) => ({
            ...daySlot,
            slots: days.includes(daySlot.day) ? [...slots] : [],
          })),
        );
      }
    } catch (error) {
      console.error("Error loading doctor availability:", error);
    }
  }, []);

  // Load doctor availability on mount
  useEffect(() => {
    loadDoctorAvailability();
  }, [loadDoctorAvailability]);

  // Auto-refresh today's appointments every 30 seconds
  useEffect(() => {
    const refreshAppointments = async () => {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const appointmentsRes = await api.get(
          `/doctor/appointments?date=${today}`,
        );
        setTodayAppointments(appointmentsRes.data.appointments || []);
      } catch (error) {
        console.error("Error refreshing appointments:", error);
      }
    };

    const interval = setInterval(refreshAppointments, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  const refreshTodaysAppointments = async () => {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      console.log("Refreshing appointments for date:", today);
      const appointmentsRes = await api.get(
        `/doctor/appointments?date=${today}`,
      );
      console.log("Refreshed appointments response:", appointmentsRes.data);
      setTodayAppointments(appointmentsRes.data.appointments || []);
    } catch (error) {
      console.error("Error refreshing appointments:", error);
    }
  };

  const openCancelModal = (appointmentId, patientName) => {
    setConfirmModal({
      isOpen: true,
      appointmentId,
      patientName,
      loading: false,
      action: "cancel",
    });
  };

  const openDeleteModal = (appointmentId, patientName) => {
    setConfirmModal({
      isOpen: true,
      appointmentId,
      patientName,
      loading: false,
      action: "delete",
    });
  };

  const openAcceptModal = (appointmentId, patientName) => {
    setConfirmModal({
      isOpen: true,
      appointmentId,
      patientName,
      loading: false,
      action: "accept",
    });
  };

  const closeModal = () => {
    if (confirmModal.loading) return; // Prevent closing during operation
    setConfirmModal({
      isOpen: false,
      appointmentId: null,
      patientName: "",
      loading: false,
      action: "cancel",
    });
  };

  const confirmAction = async () => {
    setConfirmModal((prev) => ({ ...prev, loading: true }));

    try {
      if (confirmModal.action === "cancel") {
        await api.put(`/appointments/${confirmModal.appointmentId}/cancel`);
      } else if (confirmModal.action === "delete") {
        await api.delete(`/appointments/${confirmModal.appointmentId}`);
      } else if (confirmModal.action === "accept") {
        await api.put(`/appointments/${confirmModal.appointmentId}/confirm`);
      }

      // Refresh both appointment lists
      await refreshTodaysAppointments();

      // Refresh all appointments
      const allAppointmentsRes = await api.get(`/doctor/appointments`);
      setAllAppointments(allAppointmentsRes.data.appointments || []);

      closeModal();
    } catch (error) {
      console.error(`Error ${confirmModal.action}ing appointment:`, error);
      alert(
        error.response?.data?.error ||
          `Failed to ${confirmModal.action} appointment`,
      );
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    try {
      const names = selectedSpecialties.map((s) => s.name).filter(Boolean);
      if (!names.length) {
        alert("Please select at least one specialty.");
        return;
      }
      const ids = selectedSpecialties
        .map((s) => s.id)
        .filter((x) => typeof x === "number");

      const payload = {
        ...editForm,
        specialties: names,
        specialty_ids: ids,
        // keep legacy field consistent
        specialty: names[0],
      };

      console.log("Updating profile with:", payload);
      const response = await api.put("/doctor/profile", payload);
      console.log("Update response:", response.data);

      // Update local state
      const updatedDoctor = {
        ...doctor,
        ...editForm,
        specialty: names[0],
        specialties: names,
      };
      setDoctor(updatedDoctor);

      // Update localStorage to keep user data in sync
      const currentUser = getCurrentUser();
      const updatedUser = {
        ...currentUser,
        ...editForm,
        specialty: names[0],
        specialties: names,
      };
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
          }`,
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
    setSelectedSpecialtiesFromDoctor(doctor);
    setSpecialtyQuery("");
    setSpecialtyDropdownOpen(false);
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
          : slot,
      ),
    );
    // Auto-save after adding slots
    saveAvailabilityToBackend();
  };

  const removeTimeSlot = (day, slotToRemove) => {
    setAvailabilitySlots(
      availabilitySlots.map((slot) =>
        slot.day === day
          ? { ...slot, slots: slot.slots.filter((s) => s !== slotToRemove) }
          : slot,
      ),
    );
    // Auto-save after removing slot
    saveAvailabilityToBackend();
  };

  const saveAvailabilityToBackend = async () => {
    try {
      setSaving(true);

      // Convert availability slots to day-specific format
      const daySpecificAvailability = {};
      availabilitySlots.forEach((daySlot) => {
        if (daySlot.slots.length > 0) {
          daySpecificAvailability[daySlot.day] = daySlot.slots;
        }
      });

      // For backward compatibility, also maintain the old format
      const allSlots = availabilitySlots.flatMap((daySlot) => daySlot.slots);
      const availableDays = availabilitySlots
        .filter((daySlot) => daySlot.slots.length > 0)
        .map((daySlot) => daySlot.day);

      await api.put("/doctor/profile", {
        available_slots: JSON.stringify(allSlots), // Keep for backward compatibility
        available_days: JSON.stringify(availableDays), // Keep for backward compatibility
        day_specific_availability: JSON.stringify(daySpecificAvailability), // New format
      });

      // Show success message briefly
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error("Error saving availability:", error);
      setSaving(false);
    }
  };

  const profileCompletion = useMemo(() => {
    const safeTrim = (value) => (typeof value === "string" ? value.trim() : "");
    const hasValue = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "number") return Number.isFinite(value);
      return Boolean(value);
    };

    const name = safeTrim(doctor?.name) || safeTrim(editForm?.name);
    const phone = safeTrim(doctor?.phone) || safeTrim(editForm?.phone);
    const qualification =
      safeTrim(doctor?.qualification) || safeTrim(editForm?.qualification);
    const bio = safeTrim(doctor?.bio) || safeTrim(editForm?.bio);
    const experience = doctor?.experience ?? editForm?.experience;
    const consultationFee =
      doctor?.consultation_fee ?? editForm?.consultation_fee;

    const hasSpecialty =
      (Array.isArray(selectedSpecialties) &&
        selectedSpecialties.some((s) => safeTrim(s?.name))) ||
      safeTrim(doctor?.specialty) ||
      safeTrim(doctorSpecialtiesText);

    const hasAnyAvailability = Array.isArray(availabilitySlots)
      ? availabilitySlots.some(
          (d) => Array.isArray(d?.slots) && d.slots.length > 0,
        )
      : false;

    const basicDone = hasValue(name) && hasValue(phone);
    const professionalDone =
      hasValue(qualification) &&
      hasValue(experience) &&
      hasValue(consultationFee) &&
      hasValue(hasSpecialty) &&
      hasValue(bio);
    const availabilityDone = hasAnyAvailability;

    const items = [
      { label: "Basic Information", done: basicDone },
      { label: "Professional Details", done: professionalDone },
      { label: "Set Availability", done: availabilityDone },
    ];

    const total = items.length || 1;
    const completed = items.filter((x) => x.done).length;
    const percent = Math.round((completed / total) * 100);

    return { percent, items };
  }, [
    doctor,
    editForm,
    selectedSpecialties,
    doctorSpecialtiesText,
    availabilitySlots,
  ]);

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
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome, Dr. {doctor.name}
              </h1>
              <p className="text-blue-100">
                {doctorSpecialtiesText || doctor.specialty}
              </p>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
              <div className="text-right">
                <p className="text-sm text-blue-100 mb-1">Status</p>
                <p className="text-lg font-bold">
                  {doctor?.is_available ? "Available" : "Unavailable"}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const newStatus = !doctor.is_available;
                    await api.put("/doctor/availability", {
                      is_available: newStatus,
                    });
                    setDoctor({ ...doctor, is_available: newStatus });
                  } catch (error) {
                    console.error("Failed to toggle availability:", error);
                    alert("Failed to update availability");
                  }
                }}
                className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                  doctor?.is_available ? "bg-green-500" : "bg-gray-400"
                }`}
              >
                <span
                  className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                    doctor?.is_available ? "translate-x-11" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        <div>
                          {!!selectedSpecialties.length && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {selectedSpecialties.map((s) => (
                                <span
                                  key={s.name}
                                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-sm"
                                >
                                  {s.name}
                                  <button
                                    type="button"
                                    className="text-blue-700 hover:text-blue-900"
                                    onClick={() => removeSpecialty(s.name)}
                                    aria-label={`Remove ${s.name}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Select specialties (search and pick multiple)"
                              value={specialtyQuery}
                              onChange={(e) => {
                                setSpecialtyQuery(e.target.value);
                                setSpecialtyDropdownOpen(true);
                              }}
                              onFocus={() => setSpecialtyDropdownOpen(true)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />

                            {specialtyDropdownOpen && (
                              <div
                                className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto"
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                {filteredSpecialties.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                    onClick={() =>
                                      addSpecialty({
                                        id: Number(s.id),
                                        name: s.name,
                                      })
                                    }
                                  >
                                    {s.name}
                                  </button>
                                ))}

                                {canAddCustom && (
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-700"
                                    onClick={() =>
                                      addSpecialty({ name: specialtyQuery })
                                    }
                                  >
                                    Add “{specialtyQuery.trim()}”
                                  </button>
                                )}

                                {!filteredSpecialties.length &&
                                  !canAddCustom && (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      No matches
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {doctorSpecialtiesText || doctor.specialty}
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Today's Appointments ({stats.today_appointments})
                  </h2>
                  <button
                    onClick={refreshTodaysAppointments}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200 gap-3"
                    title="Refresh appointments"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
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
                            <div className="flex items-center space-x-2 mt-1">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  apt.status === "confirmed"
                                    ? "bg-green-100 text-green-700"
                                    : apt.status === "pending"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : apt.status === "completed"
                                        ? "bg-blue-100 text-blue-700"
                                        : apt.status === "cancelled"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {apt.status}
                              </span>
                              {apt.is_emergency && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                                  🚨 Emergency
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">
                              {apt.appointment_time?.substring(0, 5) ||
                                apt.time}
                            </p>
                            {apt.status === "cancelled" ? (
                              <button
                                onClick={() =>
                                  openDeleteModal(apt.id, apt.patient_name)
                                }
                                className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                                title="Delete appointment"
                              >
                                Delete
                              </button>
                            ) : apt.status === "pending" ? (
                              <>
                                <button
                                  onClick={() =>
                                    openAcceptModal(apt.id, apt.patient_name)
                                  }
                                  className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                  title="Accept appointment"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    openCancelModal(apt.id, apt.patient_name)
                                  }
                                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                  title="Cancel appointment"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  openCancelModal(apt.id, apt.patient_name)
                                }
                                className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                title="Cancel appointment"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* All Appointments */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-green-600" />
                  All Appointments ({allAppointments.length})
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    <p className="text-gray-500 text-center py-4">Loading...</p>
                  ) : allAppointments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No appointments found
                    </p>
                  ) : (
                    allAppointments.map((apt, idx) => {
                      const appointmentDate = new Date(apt.appointment_date);
                      const now = new Date();
                      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                      const isToday = apt.appointment_date === today;
                      const isPast = appointmentDate < now;

                      return (
                        <div
                          key={apt.id || idx}
                          className={`flex items-center justify-between p-4 rounded-lg border transition ${
                            isToday
                              ? "bg-blue-50 border-blue-300"
                              : isPast
                                ? "bg-gray-50 border-gray-200"
                                : "bg-green-50 border-green-200 hover:border-green-300"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isToday
                                  ? "bg-blue-100"
                                  : isPast
                                    ? "bg-gray-100"
                                    : "bg-green-100"
                              }`}
                            >
                              <User
                                className={`w-5 h-5 ${
                                  isToday
                                    ? "text-blue-600"
                                    : isPast
                                      ? "text-gray-600"
                                      : "text-green-600"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {apt.patient_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {apt.symptoms || "General consultation"}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    apt.appointment_date,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    apt.status === "confirmed"
                                      ? "bg-green-100 text-green-700"
                                      : apt.status === "pending"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : apt.status === "completed"
                                          ? "bg-blue-100 text-blue-700"
                                          : apt.status === "cancelled"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {apt.status}
                                </span>
                                {apt.is_emergency && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                                    🚨 Emergency
                                  </span>
                                )}
                                {isToday && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                    Today
                                  </span>
                                )}
                                {isPast && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                    Past
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900">
                                {apt.appointment_time?.substring(0, 5) ||
                                  apt.time}
                              </p>
                              {apt.status === "cancelled" ? (
                                <button
                                  onClick={() =>
                                    openDeleteModal(apt.id, apt.patient_name)
                                  }
                                  className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                                  title="Delete appointment"
                                >
                                  Delete
                                </button>
                              ) : apt.status === "pending" && !isPast ? (
                                <>
                                  <button
                                    onClick={() =>
                                      openAcceptModal(apt.id, apt.patient_name)
                                    }
                                    className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                    title="Accept appointment"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      openCancelModal(apt.id, apt.patient_name)
                                    }
                                    className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                    title="Cancel appointment"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : apt.status !== "cancelled" && !isPast ? (
                                <button
                                  onClick={() =>
                                    openCancelModal(apt.id, apt.patient_name)
                                  }
                                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                  title="Cancel appointment"
                                >
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                      <span className="font-medium text-blue-600">
                        {profileCompletion.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${profileCompletion.percent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {profileCompletion.items.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center ${
                          item.done ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <Clock className="w-4 h-4 mr-2" />
                        )}
                        {item.label}
                      </div>
                    ))}
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeModal}
        onConfirm={confirmAction}
        title={
          confirmModal.action === "cancel"
            ? "Cancel Appointment"
            : confirmModal.action === "delete"
              ? "Delete Appointment"
              : "Accept Appointment"
        }
        message={
          confirmModal.action === "cancel"
            ? `Are you sure you want to cancel the appointment with ${confirmModal.patientName}? This action cannot be undone.`
            : confirmModal.action === "delete"
              ? `Are you sure you want to permanently delete the cancelled appointment with ${confirmModal.patientName}? This will completely remove it from your records.`
              : `Are you sure you want to accept and confirm the appointment with ${confirmModal.patientName}?`
        }
        confirmText={
          confirmModal.action === "cancel"
            ? "Cancel Appointment"
            : confirmModal.action === "delete"
              ? "Delete Permanently"
              : "Accept Appointment"
        }
        cancelText={
          confirmModal.action === "cancel"
            ? "Keep Appointment"
            : confirmModal.action === "delete"
              ? "Keep in List"
              : "Go Back"
        }
        type={confirmModal.action === "accept" ? "info" : "danger"}
        loading={confirmModal.loading}
      />
    </div>
  );
}

export default DoctorDashboard;
