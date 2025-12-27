import { useState } from "react";
import api from "../utils/api";

export default function AppointmentForm({ userId, onBooked }) {
    const [doctorId, setDoctorId] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/appointments/book", {
                user_id: userId,
                doctor_id: doctorId,
                appointment_date: date,
                appointment_time: time,
            });
            setMessage(res.data.message);
            onBooked && onBooked();
        } catch (err) {
            console.log("BOOK ERROR:", err.response || err);
            setMessage(err.response?.data?.message || "Booking failed");
        }
    };


    return (
        <div className="max-w-md mx-auto p-4 border rounded shadow">
            <h2 className="text-xl font-bold mb-4">Book Appointment</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="number"
                    placeholder="Doctor ID"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded"
                >
                    Book
                </button>
            </form>
            {message && <p className="mt-3 text-red-500">{message}</p>}
        </div>
    );
}
