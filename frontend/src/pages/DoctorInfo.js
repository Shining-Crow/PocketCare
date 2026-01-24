import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import {
  Calendar,
  FileText,
  CheckCircle,
  Stethoscope,
  Mail,
  Phone,
  BadgeDollarSign,
  X,
} from "lucide-react";
import Footer from "../components/Footer";
import SuccessModal from "../components/SuccessModal";
import BackToDashboardButton from "../components/BackToDashboardButton";

export default function DoctorInfo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [booking, setBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });

  // Generate next 7 days with dates
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const upcomingDates = generateDates();
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Get time slots from doctor's available_slots for the selected date
  const getTimeSlots = () => {
    // Return empty array if no date selected or no doctor data
    if (!selectedDate || !doctor) {
      return [];
    }

    try {
      // Get the day name for the selected date
      const selectedDateObj = new Date(selectedDate);
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const selectedDayName = dayNames[selectedDateObj.getDay()];

      // Try to use day-specific availability first (new format)
      if (doctor?.day_specific_availability) {
        const daySpecificData =
          typeof doctor.day_specific_availability === "string"
            ? JSON.parse(doctor.day_specific_availability)
            : doctor.day_specific_availability;

        const daySlots = daySpecificData[selectedDayName] || [];
        return daySlots;
      }

      // Fallback to old format (same slots for all available days)
      if (doctor?.available_slots && doctor?.available_days) {
        const slots =
          typeof doctor.available_slots === "string"
            ? JSON.parse(doctor.available_slots)
            : doctor.available_slots;

        const availableDays =
          typeof doctor.available_days === "string"
            ? JSON.parse(doctor.available_days)
            : doctor.available_days;

        if (!Array.isArray(slots) || !Array.isArray(availableDays)) return [];

        // Check if doctor is available on the selected day
        if (!availableDays.includes(selectedDayName)) {
          return []; // Doctor not available on this day
        }

        // Return all slots if doctor is available on this day (old behavior)
        return slots;
      }

      return [];
    } catch (e) {
      console.error("Error getting time slots:", e);
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/doctors/${id}`);
        if (!cancelled) {
          setDoctor(res.data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error || "Failed to load doctor profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDoctor();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Check if doctor is available on a specific date
  const isDoctorAvailableOnDate = (date) => {
    try {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = dayNames[date.getDay()];

      // Check new format first
      if (doctor?.day_specific_availability) {
        const daySpecificData =
          typeof doctor.day_specific_availability === "string"
            ? JSON.parse(doctor.day_specific_availability)
            : doctor.day_specific_availability;

        return daySpecificData[dayName] && daySpecificData[dayName].length > 0;
      }

      // Fallback to old format
      if (doctor?.available_days) {
        const availableDays =
          typeof doctor.available_days === "string"
            ? JSON.parse(doctor.available_days)
            : doctor.available_days;

        if (!Array.isArray(availableDays)) return false;
        return availableDays.includes(dayName);
      }

      return false;
    } catch (e) {
      return false;
    }
  };

  const handleDateClick = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const newSelectedDate = `${year}-${month}-${day}`;

    setSelectedDate(newSelectedDate);
    // Clear selected time when date changes to force user to select from available slots
    setSelectedTime("");
  };

  const convert12to24Hours = (timeSlot) => {
    // Keep the full time range format "10:00-11:00" for backend to calculate capacity
    // Backend will parse the start time for storage
    if (timeSlot.includes("-")) {
      return timeSlot; // Return the full range like "09:00-11:00"
    }
    return timeSlot;
  };

  const format24to12Hours = (timeSlot) => {
    // Convert "10:00-11:00" (24-hour) to "10:00 AM - 11:00 AM" (12-hour)
    if (!timeSlot || !timeSlot.includes("-")) return timeSlot;

    const [startTime, endTime] = timeSlot.split("-");
    const [startHour, startMin] = startTime.split(":");
    const [endHour, endMin] = endTime.split(":");

    const convertTo12 = (hour, min) => {
      const h = parseInt(hour, 10);
      const period = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${min} ${period}`;
    };

    return `${convertTo12(startHour, startMin)} - ${convertTo12(
      endHour,
      endMin,
    )}`;
  };

  const bookAppointment = async () => {
    if (!selectedDate || !selectedTime || !symptoms.trim()) {
      setErrorModal({
        show: true,
        message: "Please select a date, time, and describe your symptoms.",
      });
      return;
    }

    try {
      setBooking(true);

      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.id;

      if (!userId) {
        setErrorModal({
          show: true,
          message: "Please log in to book an appointment.",
        });
        setBooking(false);
        return;
      }

      const convertedTime = convert12to24Hours(selectedTime);
      const appointmentData = {
        user_id: userId,
        doctor_id: Number(id),
        appointment_date: selectedDate,
        appointment_time: convertedTime,
        symptoms,
      };
      console.log("Creating appointment with data:", appointmentData);

      await api.post("/appointments", appointmentData);

      // Show success modal instead of alert
      setShowSuccessModal(true);
    } catch (e) {
      // Get error details from response (suppress error logging since we show modal)
      const errorData = e?.response?.data;
      const errorMessage = errorData?.error || "Failed to book appointment";
      const additionalMessage = errorData?.message;

      // Show error modal instead of console error
      setErrorModal({
        show: true,
        message: additionalMessage || errorMessage,
      });
    } finally {
      setBooking(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    // Reset form
    setSelectedDate("");
    setSelectedTime("");
    setSymptoms("");

    // Navigate to user's appointments page (not doctor dashboard)
    navigate("/appointments");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="flex-grow">
        <div className="max-w-5xl mx-auto p-6">
          {loading ? (
            <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
              <p className="text-gray-600 font-medium">
                Loading doctor profile...
              </p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <p className="text-red-600 font-semibold mb-4">{error}</p>
              <button
                type="button"
                onClick={() => navigate("/appointments")}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50 transition font-semibold"
              >
                Back to Appointments
              </button>
            </div>
          ) : (
            <>
              {/* Doctor Info Section */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6">
                  {/* Doctor Avatar (icon-based) */}
                  <div className="md:w-72 shrink-0">
                    <div className="w-full aspect-square md:w-64 rounded-3xl bg-gradient-to-br from-blue-300 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                      <Stethoscope className="w-20 h-20" />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700">
                        {doctor?.specialty || "Specialty not listed"}
                      </div>
                      <div
                        className={
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border " +
                          (doctor?.is_available
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700")
                        }
                      >
                        <span
                          className={
                            "w-2 h-2 rounded-full " +
                            (doctor?.is_available
                              ? "bg-emerald-500"
                              : "bg-rose-500")
                          }
                        />
                        {doctor?.is_available ? "Available" : "Unavailable"}
                      </div>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <BackToDashboardButton />
                          <h2 className="text-3xl font-extrabold text-gray-900 truncate">
                            {doctor?.name}
                          </h2>
                          <CheckCircle className="w-6 h-6 text-blue-600 shrink-0" />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {!!doctor?.qualification && (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              {doctor.qualification}
                            </span>
                          )}
                          {(doctor?.experience || doctor?.experience === 0) && (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                              {doctor.experience} yrs experience
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                          <BadgeDollarSign className="w-5 h-5" />
                          <span className="font-bold">
                            ৳{doctor?.consultation_fee || 500}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-500">
                            Email
                          </div>
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {doctor?.email || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-500">
                            Phone
                          </div>
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {doctor?.phone || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-2">
                        About
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {doctor?.bio ||
                          `Dr. ${doctor?.name} is committed to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Section */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
                <h3 className="text-2xl font-extrabold text-gray-900 mb-6">
                  Book an appointment
                </h3>

                {/* Doctor Unavailable Warning */}
                {!doctor?.is_available && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-600" />
                    </div>
                    <h4 className="text-lg font-bold text-red-800 mb-2">
                      Doctor Currently Unavailable
                    </h4>
                    <p className="text-red-600 text-sm">
                      Dr. {doctor?.name} is currently not accepting new appointments.
                      Please check back later or choose another doctor.
                    </p>
                  </div>
                )}

                {doctor?.is_available && (
                <div className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {upcomingDates.map((date, idx) => {
                        const dateStr = `${date.getFullYear()}-${String(
                          date.getMonth() + 1,
                        ).padStart(2, "0")}-${String(date.getDate()).padStart(
                          2,
                          "0",
                        )}`;
                        const isSelected = selectedDate === dateStr;
                        const isAvailable = isDoctorAvailableOnDate(date);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleDateClick(date)}
                            className={`relative flex flex-col items-center justify-center px-4 py-3 rounded-full font-semibold whitespace-nowrap transition-all ${
                              isSelected
                                ? "bg-blue-500 text-white shadow-lg"
                                : isAvailable
                                  ? "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-400"
                                  : "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                            disabled={!isAvailable}
                          >
                            <span className="text-sm">
                              {daysOfWeek[date.getDay()]}
                            </span>
                            <span className="text-lg">{date.getDate()}</span>
                            {!isAvailable && (
                              <span className="absolute -top-1 -right-1 text-red-500 text-xl font-bold">
                                ×
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Selection - Only show when date is selected */}
                  {selectedDate && selectedDate.trim() !== "" && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-3">
                        Select Time
                      </label>
                      {getTimeSlots().length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                          <p className="text-yellow-800 font-medium">
                            Doctor is not available on the selected day
                          </p>
                          <p className="text-yellow-600 text-sm mt-1">
                            Please select a different date where the doctor is
                            available
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-3 flex-wrap">
                          {getTimeSlots().map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`px-6 py-2 rounded-full font-medium transition-all border-2 ${
                                selectedTime === time
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                              }`}
                            >
                              {format24to12Hours(time)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Symptoms Input */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      <FileText className="inline w-5 h-5 mr-2 text-green-500" />
                      Describe Your Symptoms
                    </label>
                    <textarea
                      placeholder="Please describe your symptoms in detail..."
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition min-h-[100px] resize-none"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                    />
                  </div>

                  {/* Validation Message */}
                  {!selectedDate || !selectedTime || !symptoms.trim() ? (
                    <p className="text-orange-600 text-sm font-medium">
                      Please select a date, time, and describe your symptoms to
                      continue
                    </p>
                  ) : null}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={bookAppointment}
                    disabled={
                      !selectedDate ||
                      !selectedTime ||
                      !symptoms.trim() ||
                      booking
                    }
                    className={`w-full py-3 rounded-full font-bold text-white text-lg transition-all flex items-center justify-center gap-2 ${
                      selectedDate && selectedTime && symptoms.trim()
                        ? "bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg"
                        : "bg-gray-400 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    {booking ? "Booking..." : "Book an appointment"}
                  </button>
                </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="Appointment Booked Successfully!"
        message={
          doctor
            ? `Your appointment with Dr. ${doctor.name} has been confirmed for ${selectedDate} at ${selectedTime}. You will receive a confirmation shortly.`
            : "Your appointment has been booked successfully!"
        }
        buttonText="View My Appointments"
      />

      {/* Error Modal */}
      {errorModal.show && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setErrorModal({ show: false, message: "" });
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 relative"
            style={{ maxWidth: "400px" }}
          >
            {/* Close button */}
            <button
              onClick={() => setErrorModal({ show: false, message: "" })}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ fontSize: "24px", lineHeight: "1" }}
            >
              ×
            </button>

            <div className="text-center">
              {/* Error Icon - Red circle with X */}
              <div
                className="mx-auto flex items-center justify-center mb-6"
                style={{ width: "80px", height: "80px" }}
              >
                <div
                  className="rounded-full bg-red-100 flex items-center justify-center"
                  style={{ width: "80px", height: "80px" }}
                >
                  <svg
                    className="text-red-600"
                    width="48"
                    height="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-bold text-gray-900 mb-4"
                style={{ fontSize: "26px", fontWeight: "700" }}
              >
                Cannot Book Appointment
              </h3>

              {/* Message */}
              <p
                className="text-gray-600 mb-8"
                style={{ fontSize: "15px", lineHeight: "1.6" }}
              >
                {errorModal.message}
              </p>

              {/* OK Button */}
              <button
                onClick={() => setErrorModal({ show: false, message: "" })}
                className="w-full bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
                style={{
                  padding: "16px 24px",
                  fontSize: "16px",
                  borderRadius: "12px",
                }}
              >
                OK, I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
