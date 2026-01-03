import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../utils/api";
import { Calendar, Clock, FileText, HeartPulse, User, Stethoscope } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function BookAppointment() {
    const { doctorId } = useParams();
    const navigate = useNavigate();

    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const userId = JSON.parse(localStorage.getItem("user"))?.id || 1;

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await api.post("/appointments", {
                user_id: userId,
                doctor_id: doctorId,
                appointment_date: date,
                appointment_time: time,
                symptoms,
            });

            alert("Appointment booked!");
            navigate("/appointments");
        } catch (err) {
            alert(err.response.data.error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 flex flex-col">
            <Navbar />
            <div className="flex-grow flex items-center justify-center py-12">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
                    <div className="absolute -top-8 -left-8 bg-blue-100 rounded-full w-32 h-32 opacity-20 z-0"></div>
                    <div className="absolute -bottom-8 -right-8 bg-purple-100 rounded-full w-32 h-32 opacity-20 z-0"></div>
                    <div className="relative z-10">
                        <div className="flex items-center mb-6 space-x-3">
                            <User className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full p-1" />
                            <Stethoscope className="w-8 h-8 text-green-600 bg-green-100 rounded-full p-1" />
                            <HeartPulse className="w-8 h-8 text-purple-600 bg-purple-100 rounded-full p-1" />
                            <h1 className="text-3xl font-bold text-blue-700 ml-2">Book Appointment</h1>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="flex items-center text-gray-700 font-semibold mb-2">
                                    <Calendar className="w-5 h-5 mr-2 text-blue-500" /> Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="flex items-center text-gray-700 font-semibold mb-2">
                                    <Clock className="w-5 h-5 mr-2 text-purple-500" /> Time
                                </label>
                                <input
                                    type="time"
                                    className="w-full p-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="flex items-center text-gray-700 font-semibold mb-2">
                                    <FileText className="w-5 h-5 mr-2 text-green-500" /> Symptoms
                                </label>
                                <textarea
                                    placeholder="Describe your symptoms"
                                    className="w-full p-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition min-h-[90px]"
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold shadow-lg hover:bg-green-700 transition-all text-lg flex items-center justify-center gap-2"
                            >
                                <HeartPulse className="w-5 h-5 text-white" /> Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
