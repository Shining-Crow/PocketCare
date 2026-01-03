import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import Footer from "../components/Footer";

export default function DoctorInfo() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [booking, setBooking] = useState(false);

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
                    setError(e?.response?.data?.error || "Failed to load doctor profile.");
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

    const bookAppointment = async () => {
        if (!date || !time) {
            alert("Please select a date and time.");
            return;
        }

        try {
            setBooking(true);
            await api.post("/appointments", {
                doctor_id: Number(id),
                appointment_date: date,
                appointment_time: time,
                symptoms,
            });
            alert("Appointment booked successfully!");
            navigate("/appointments");
        } catch (e) {
            console.error("Failed to book appointment", e);
            alert(e?.response?.data?.error || "Failed to book appointment.");
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 flex flex-col">
            <div className="max-w-7xl mx-auto p-6 flex gap-6 flex-grow">
                {loading ? (
                    <div className="w-full bg-white rounded-xl shadow p-6">
                        <p className="text-gray-600">Loading doctor profile...</p>
                    </div>
                ) : error ? (
                    <div className="w-full bg-white rounded-xl shadow p-6">
                        <p className="text-red-600 font-semibold mb-3">{error}</p>
                        <button
                            type="button"
                            onClick={() => navigate("/appointments")}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                        >
                            Back to Appointments
                        </button>
                    </div>
                ) : (
                    <>
                        {/* LEFT — Doctor Info */}
                        <div className="w-3/4 bg-white rounded-xl shadow p-6 h-[80vh] overflow-y-auto">
                            <h1 className="text-3xl font-bold">{doctor?.name}</h1>
                            <p className="text-gray-600">{doctor?.specialty}</p>

                            <div className="mt-4 space-y-2">
                                <p>
                                    <b>Email:</b> {doctor?.email}
                                </p>
                                <p>
                                    <b>Phone:</b> {doctor?.phone}
                                </p>
                                <p>
                                    <b>Qualification:</b> {doctor?.qualification}
                                </p>
                                <p>
                                    <b>Experience:</b> {doctor?.experience} years
                                </p>
                                <p>
                                    <b>Rating:</b> ⭐ {doctor?.rating}
                                </p>
                                <p>
                                    <b>Hospital ID:</b> {doctor?.hospital_id}
                                </p>
                                <p>
                                    <b>Consultation Fee:</b> ৳{doctor?.consultation_fee}
                                </p>
                            </div>

                            <div className="mt-6">
                                <h2 className="text-xl font-semibold mb-2">About Doctor</h2>
                                <p className="text-gray-700 whitespace-pre-line">{doctor?.bio}</p>
                            </div>
                        </div>

                        {/* RIGHT — Appointment Booking (Sticky) */}
                        <div className="w-1/4 bg-white rounded-xl shadow p-6 sticky top-6 h-fit">
                            <h2 className="text-xl font-semibold mb-4 text-blue-700">
                                Book Appointment
                            </h2>

                            <input
                                type="date"
                                value={date}
                                className="w-full border-2 border-blue-200 bg-blue-50 p-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                onChange={(e) => setDate(e.target.value)}
                            />

                            <input
                                type="time"
                                value={time}
                                className="w-full border-2 border-purple-200 bg-purple-50 p-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                                onChange={(e) => setTime(e.target.value)}
                            />

                            <textarea
                                placeholder="Symptoms"
                                value={symptoms}
                                className="w-full border-2 border-green-200 bg-green-50 p-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                                onChange={(e) => setSymptoms(e.target.value)}
                            />

                            <button
                                type="button"
                                onClick={bookAppointment}
                                disabled={booking}
                                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold shadow-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-lg flex items-center justify-center gap-2"
                            >
                                {booking ? "Booking..." : "Confirm Booking"}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <Footer />
        </div>
    );
}
