import { useEffect, useState } from "react";
import api from "../utils/api";
import Footer from "../components/Footer";
import ConfirmationModal from "../components/ConfirmationModal";
import BackToDashboardButton from "../components/BackToDashboardButton";

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    appointmentId: null,
    doctorName: "",
    appointmentDate: "",
    appointmentTime: "",
    loading: false,
    action: "cancel", // 'cancel' or 'delete'
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/user/appointments");
      // Backend returns { appointments: [...] }
      const appointmentsData = response.data?.appointments || [];
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const openCancelModal = (appointment) => {
    setConfirmModal({
      isOpen: true,
      appointmentId: appointment.id,
      doctorName: appointment.doctor_name,
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      loading: false,
      action: "cancel",
    });
  };

  const openDeleteModal = (appointment) => {
    setConfirmModal({
      isOpen: true,
      appointmentId: appointment.id,
      doctorName: appointment.doctor_name,
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      loading: false,
      action: "delete",
    });
  };

  const closeModal = () => {
    if (confirmModal.loading) return; // Prevent closing during operation
    setConfirmModal({
      isOpen: false,
      appointmentId: null,
      doctorName: "",
      appointmentDate: "",
      appointmentTime: "",
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
      }
      fetchAppointments(); // Refresh the list
      closeModal();
    } catch (error) {
      console.error(`Failed to ${confirmModal.action} appointment:`, error);
      alert(`Failed to ${confirmModal.action} appointment. Please try again.`);
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isUpcomingAppointment = (appointmentDate, appointmentTime, status) => {
    // Cancelled appointments should be categorized by date, not automatically as past
    if (status.toLowerCase() === "completed") {
      return false; // Completed appointments are always past
    }

    const now = new Date();
    const appointment = new Date(`${appointmentDate} ${appointmentTime}`);
    return appointment > now;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-8">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading your appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter((app) =>
    isUpcomingAppointment(
      app.appointment_date,
      app.appointment_time,
      app.status
    )
  );

  const pastAppointments = appointments.filter(
    (app) =>
      !isUpcomingAppointment(
        app.appointment_date,
        app.appointment_time,
        app.status
      )
  );

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <BackToDashboardButton />
                <h1 className="text-3xl font-bold text-gray-900">
                  My Appointments
                </h1>
              </div>
              <p className="text-gray-600">
                Manage your healthcare appointments
              </p>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No appointments found
                </h3>
                <p className="text-gray-500">
                  You haven't booked any appointments yet.
                </p>
                <a
                  href="/doctors"
                  className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Book Your First Appointment
                </a>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Upcoming Appointments */}
                {upcomingAppointments.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                        {upcomingAppointments.length} Upcoming
                      </span>
                      Upcoming Appointments
                    </h2>
                    <div className="grid gap-4">
                      {upcomingAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  Dr. {appointment.doctor_name}
                                </h3>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    appointment.status
                                  )}`}
                                >
                                  {appointment.status}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-2">
                                {appointment.doctor_specialty}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9H4V7z" />
                                  </svg>
                                  {new Date(
                                    appointment.appointment_date
                                  ).toLocaleDateString()}
                                </span>
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                                  </svg>
                                  {appointment.appointment_time}
                                </span>
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8z" />
                                  </svg>
                                  ৳{appointment.consultation_fee}
                                </span>
                              </div>
                              {appointment.purpose && (
                                <p className="mt-2 text-sm text-gray-700">
                                  <strong>Purpose:</strong>{" "}
                                  {appointment.purpose}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {appointment.status.toLowerCase() ===
                              "cancelled" ? (
                                <button
                                  onClick={() => openDeleteModal(appointment)}
                                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 text-sm"
                                >
                                  Delete
                                </button>
                              ) : (
                                <button
                                  onClick={() => openCancelModal(appointment)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 text-sm"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Appointments */}
                {pastAppointments.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                        {pastAppointments.length} Past
                      </span>
                      Past Appointments
                    </h2>
                    <div className="grid gap-4">
                      {pastAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-300 opacity-90"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  Dr. {appointment.doctor_name}
                                </h3>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    appointment.status
                                  )}`}
                                >
                                  {appointment.status}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-2">
                                {appointment.doctor_specialty}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9H4V7z" />
                                  </svg>
                                  {new Date(
                                    appointment.appointment_date
                                  ).toLocaleDateString()}
                                </span>
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                                  </svg>
                                  {appointment.appointment_time}
                                </span>
                                <span className="flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8z" />
                                  </svg>
                                  ৳{appointment.consultation_fee}
                                </span>
                              </div>
                              {appointment.purpose && (
                                <p className="mt-2 text-sm text-gray-700">
                                  <strong>Purpose:</strong>{" "}
                                  {appointment.purpose}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {appointment.status.toLowerCase() ===
                                "cancelled" && (
                                <button
                                  onClick={() => openDeleteModal(appointment)}
                                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 text-sm"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={closeModal}
          onConfirm={confirmAction}
          title={
            confirmModal.action === "cancel"
              ? "Cancel Appointment"
              : "Delete Appointment"
          }
          message={
            confirmModal.action === "cancel"
              ? `Are you sure you want to cancel your appointment with Dr. ${
                  confirmModal.doctorName
                } on ${new Date(
                  confirmModal.appointmentDate
                ).toLocaleDateString()} at ${
                  confirmModal.appointmentTime
                }? This action cannot be undone.`
              : `Are you sure you want to permanently delete your cancelled appointment with Dr. ${confirmModal.doctorName}? This will completely remove it from your records.`
          }
          confirmText={
            confirmModal.action === "cancel"
              ? "Cancel Appointment"
              : "Delete Permanently"
          }
          cancelText={
            confirmModal.action === "cancel"
              ? "Keep Appointment"
              : "Keep in List"
          }
          type="danger"
          loading={confirmModal.loading}
        />
      </div>
      <Footer />
    </div>
  );
}
