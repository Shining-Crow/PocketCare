import { useEffect, useState } from "react";
import api from "../utils/api";
import AppointmentForm from "../components/AppointmentForm";

export default function Appointments() {
    const userId = 1; // Replace with logged-in user id
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        const res = await api.get(`/appointments/user/${userId}`);
        setAppointments(res.data);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Appointments</h1>
                <p className="text-gray-500 mt-1">Manage and view your upcoming medical visits.</p>
            </header>

            {/* Form Section - Wrapped in a Card */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-10">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Book New Appointment</h2>
                <AppointmentForm userId={userId} onBooked={fetchAppointments} />
            </section>

            {/* List Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Upcoming Appointments</h2>
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {appointments.length} Total
                    </span>
                </div>

                <ul className="grid gap-4">
                    {appointments.map((a) => (
                        <li
                            key={a.id}
                            className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row md:items-center justify-between"
                        >
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                                    Doctor ID: {a.doctor_id}
                                </span>
                                <div className="flex items-center text-gray-700 gap-4 mt-1">
                                    <div className="flex items-center">
                                        <span className="font-medium">{a.date}</span>
                                    </div>
                                    <div className="text-gray-400">|</div>
                                    <div className="flex items-center italic">
                                        {a.time}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex items-center">
                                {/* Status Badge */}
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${a.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                        a.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {a.status}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>

                {appointments.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 italic">No appointments scheduled yet.</p>
                    </div>
                )}
            </section>
        </div>

    );
}
