import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import { isAuthenticated } from "../utils/auth";

export default function DoctorInfo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [symptoms, setSymptoms] = useState("");

    useEffect(() => {
        api.get(`/doctors/${id}`).then((res) => setDoctor(res.data));
    }, [id]);

    const bookAppointment = async () => {
        if (!isAuthenticated()) {
            localStorage.setItem('redirectAfterLogin', `/doctor/${id}`);
            navigate("/login");
            return;
        }
        await api.post("/appointments", {
            doctor_id: id,
            appointment_date: date,
            appointment_time: time,
            symptoms,
        });
        alert("Appointment booked!");
    };

    if (!doctor) return <p>Loading...</p>;

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto p-6 flex gap-6">
                {/* LEFT — Doctor Info */}
                <div className="w-3/4 bg-white rounded-xl shadow p-6 h-[80vh] overflow-y-auto">
                    <h1 className="text-3xl font-bold">{doctor.name}</h1>
                    <p className="text-gray-600">{doctor.specialty}</p>
                    <div className="mt-4 space-y-2">
                        <p><b>Email:</b> {doctor.email}</p>
                        <p><b>Phone:</b> {doctor.phone}</p>
                        <p><b>Qualification:</b> {doctor.qualification}</p>
                        <p><b>Experience:</b> {doctor.experience} years</p>
                        <p><b>Rating:</b> ⭐ {doctor.rating}</p>
                        <p><b>Hospital ID:</b> {doctor.hospital_id}</p>
                        <p><b>Consultation Fee:</b> ৳{doctor.consultation_fee}</p>
                    </div>

                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-2">About Doctor</h2>
                        <p className="text-gray-700 whitespace-pre-line">{doctor.bio}</p>
                    </div>
                </div>

                {/* RIGHT — Appointment Booking (Sticky) */}
                <div className="w-1/4 bg-white rounded-xl shadow p-6 sticky top-6 h-fit">
                    <h2 className="text-xl font-semibold mb-4">Book Appointment</h2>

                    <input
                        type="date"
                        className="w-full border p-2 rounded mb-3"
                        onChange={(e) => setDate(e.target.value)}
                    />

                    <input
                        type="time"
                        className="w-full border p-2 rounded mb-3"
                        onChange={(e) => setTime(e.target.value)}
                    />

                    <textarea
                        placeholder="Symptoms"
                        className="w-full border p-2 rounded mb-4"
                        onChange={(e) => setSymptoms(e.target.value)}
                    />

                    <button
                        onClick={bookAppointment}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                    >
                        Confirm Booking
                    </button>
                </div>
            </div>
        </>
    );
}
