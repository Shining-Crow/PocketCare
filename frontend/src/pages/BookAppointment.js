import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { Calendar, FileText, CheckCircle, X } from "lucide-react";
import Footer from "../components/Footer";
import BackToDashboardButton from "../components/BackToDashboardButton";

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });
  const [slotFullModal, setSlotFullModal] = useState({ show: false });
  const userId = JSON.parse(localStorage.getItem("user"))?.id || 1;

  // Debug: log when modal state changes
  useEffect(() => {
    console.log("Error modal state changed:", errorModal);
  }, [errorModal]);

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

      console.log(
        `Getting time slots for ${selectedDayName} (${selectedDate})`
      );
      console.log("Doctor data:", doctor);

      // Try to use day-specific availability first (new format)
      if (doctor?.day_specific_availability) {
        const daySpecificData =
          typeof doctor.day_specific_availability === "string"
            ? JSON.parse(doctor.day_specific_availability)
            : doctor.day_specific_availability;

        console.log("Day-specific availability data:", daySpecificData);
        const daySlots = daySpecificData[selectedDayName] || [];
        console.log(`Day-specific slots for ${selectedDayName}:`, daySlots);
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

        console.log("Available days:", availableDays);
        console.log("Available slots:", slots);

        if (!Array.isArray(slots) || !Array.isArray(availableDays)) {
          console.log("Invalid slots or days data");
          return [];
        }

        // Check if doctor is available on the selected day
        if (!availableDays.includes(selectedDayName)) {
          console.log(`Doctor not available on ${selectedDayName}`);
          return []; // Doctor not available on this day
        }

        // Return all slots if doctor is available on this day (old behavior)
        console.log(`Using old format slots for ${selectedDayName}:`, slots);
        return slots;
      }

      console.log("No availability data found");
      return [];
    } catch (e) {
      console.error("Error getting time slots:", e);
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDoctor = async () => {
      try {
        const res = await api.get(`/doctors/${doctorId}`);
        if (isMounted) {
          setDoctor(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch doctor", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchDoctor();
    return () => {
      isMounted = false;
    };
  }, [doctorId]);

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
    // Convert "10:00-11:00" format to just "10:00:00" (start time)
    if (timeSlot.includes("-")) {
      const startTime = timeSlot.split("-")[0];
      return `${startTime}:00`;
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
      endMin
    )}`;
  };

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

  const handleSubmit = async (e, isEmergency = false) => {
    e.preventDefault();

    console.log("BookAppointment handleSubmit v3.0 - Emergency support");

    // Validation: Check if all fields are filled
    if (!selectedDate || !selectedTime || !symptoms.trim()) {
      console.log("Setting error modal - missing fields");
      setErrorModal({
        show: true,
        message: "Please fill in all fields: Date, Time, and Symptoms",
      });
      return;
    }

    try {
      const convertedTime = convert12to24Hours(selectedTime);
      console.log("Submitting appointment...", { selectedDate, convertedTime, isEmergency });

      const response = await api.post("/appointments", {
        user_id: userId,
        doctor_id: doctorId,
        appointment_date: selectedDate,
        appointment_time: convertedTime,
        symptoms,
        is_emergency: isEmergency,
      });

      console.log("Appointment successful:", response.data);
      // Success - navigate to appointments page
      navigate("/appointments");
    } catch (err) {
      console.log("Appointment error caught:", err.response?.data);

      // Get error details from response
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || "Failed to book appointment";
      const additionalMessage = errorData?.message;
      const slotFull = errorData?.slot_full;

      // If slot is full and not an emergency booking attempt, show emergency option
      if (slotFull && !isEmergency) {
        console.log("Slot full, showing emergency option");
        setSlotFullModal({
          show: true,
        });
        return;
      }

      const displayMessage = additionalMessage || errorMessage;
      console.log("Showing error modal with message:", displayMessage);

      // Set the error modal to show
      setErrorModal({
        show: true,
        message: displayMessage,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="flex-grow">
        <div className="max-w-4xl mx-auto p-6">
          {/* Doctor Info Section */}
          <div className="flex gap-6 bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-400">
            {/* Doctor Image */}
            <div className="w-64 h-64 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
              {doctor?.image ? (
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-7xl font-bold">
                  {doctor?.name?.charAt(0)}
                </span>
              )}
            </div>

            {/* Doctor Details */}
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-2">
                <BackToDashboardButton className="shrink-0" />
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {doctor?.name}
                  </h2>
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                {doctor?.qualification} • {doctor?.experience} Years
              </p>

              <div className="space-y-2 mb-4">
                <p className="text-gray-700">
                  <span className="font-semibold">Email:</span>{" "}
                  {doctor?.email || "N/A"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Phone:</span>{" "}
                  {doctor?.phone || "N/A"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Rating:</span> ⭐{" "}
                  {doctor?.rating || "N/A"}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  About
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {doctor?.bio ||
                    "Dr. " +
                      doctor?.name +
                      " has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies."}
                </p>
              </div>

              <div className="text-lg font-semibold text-gray-900">
                Appointment fee:{" "}
                <span className="text-blue-600">
                  ৳{doctor?.consultation_fee || 500}
                </span>
              </div>
            </div>
          </div>

          {/* Booking Section */}
          <div className="bg-white p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Booking slots
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Selection */}
              <div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {upcomingDates.map((date, idx) => {
                    const isAvailable = isDoctorAvailableOnDate(date);
                    const dateStr = `${date.getFullYear()}-${String(
                      date.getMonth() + 1
                    ).padStart(2, "0")}-${String(date.getDate()).padStart(
                      2,
                      "0"
                    )}`;
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          isAvailable ? handleDateClick(date) : null
                        }
                        disabled={!isAvailable}
                        className={`flex flex-col items-center justify-center px-4 py-3 rounded-full font-semibold whitespace-nowrap transition-all relative ${
                          !isAvailable
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200"
                            : isSelected
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-400"
                        }`}
                        title={
                          !isAvailable ? "Doctor not available on this day" : ""
                        }
                      >
                        <span className="text-sm">
                          {daysOfWeek[date.getDay()]}
                        </span>
                        <span className="text-lg">{date.getDate()}</span>
                        {!isAvailable && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection - Only show when date is selected AND doctor has availability */}
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
                              ? "bg-blue-600 text-white border-blue-600"
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

              {/* Debug info - remove this later */}
              <div style={{ display: "none" }}>
                <p>selectedDate: '{selectedDate}'</p>
                <p>selectedDate type: {typeof selectedDate}</p>
                <p>selectedDate length: {selectedDate?.length}</p>
                <p>
                  Condition result: {selectedDate && selectedDate.trim() !== ""}
                </p>
              </div>

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
                type="submit"
                disabled={!selectedDate || !selectedTime || !symptoms.trim()}
                className={`w-full py-3 rounded-full font-bold text-white text-lg transition-all flex items-center justify-center gap-2 ${
                  selectedDate && selectedTime && symptoms.trim()
                    ? "bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg"
                    : "bg-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                <Calendar className="w-5 h-5" />
                Book an appointment
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Slot Full Modal with Emergency Option */}
      {slotFullModal.show && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSlotFullModal({ show: false });
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 relative"
            style={{ maxWidth: "450px" }}
          >
            {/* Close button */}
            <button
              onClick={() => setSlotFullModal({ show: false })}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ fontSize: "24px", lineHeight: "1" }}
            >
              ×
            </button>

            <div className="text-center">
              {/* Warning Icon */}
              <div
                className="mx-auto flex items-center justify-center mb-6"
                style={{ width: "80px", height: "80px" }}
              >
                <div
                  className="rounded-full bg-yellow-100 flex items-center justify-center"
                  style={{ width: "80px", height: "80px" }}
                >
                  <svg
                    className="text-yellow-600"
                    width="48"
                    height="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h3
                className="text-2xl font-bold text-gray-900 mb-4"
                style={{ fontSize: "26px", fontWeight: "700" }}
              >
                Time Slot is Full
              </h3>

              {/* Message */}
              <p
                className="text-gray-600 mb-6"
                style={{ fontSize: "15px", lineHeight: "1.6" }}
              >
                This time slot already has 5 appointments. If this is an
                emergency, you can send a request to the doctor for approval.
              </p>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={(e) => {
                    setSlotFullModal({ show: false });
                    handleSubmit(e, true); // Submit as emergency
                  }}
                  className="w-full bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all"
                  style={{
                    padding: "16px 24px",
                    fontSize: "16px",
                    borderRadius: "12px",
                  }}
                >
                  🚨 Book as Emergency
                </button>

                <button
                  onClick={() => setSlotFullModal({ show: false })}
                  className="w-full bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all"
                  style={{
                    padding: "16px 24px",
                    fontSize: "16px",
                    borderRadius: "12px",
                  }}
                >
                  Choose Another Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
