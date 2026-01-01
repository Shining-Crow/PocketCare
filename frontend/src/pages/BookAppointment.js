import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../utils/api";

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
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Book Appointment</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="date"
                    className="w-full p-3 border rounded"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />

                <input
                    type="time"
                    className="w-full p-3 border rounded"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                />

                <textarea
                    placeholder="Describe your symptoms"
                    className="w-full p-3 border rounded"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                />

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
                >
                    Confirm Booking
                </button>
            </form>
        </div>
    );
}
