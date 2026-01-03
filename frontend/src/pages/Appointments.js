import { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import DoctorCard from "../components/DoctorCard";

export default function Appointments() {
    const [doctors, setDoctors] = useState([]);
    const navigate = useNavigate();

    const [search, setSearch] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [feeRange, setFeeRange] = useState("");


    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const params = {};

                if (search) params.name = search;
                if (specialty) params.specialty = specialty;

                if (feeRange === "low") {
                    params.min_fee = 0;
                    params.max_fee = 500;
                } else if (feeRange === "mid") {
                    params.min_fee = 500;
                    params.max_fee = 1500;
                } else if (feeRange === "high") {
                    params.min_fee = 1500;
                    params.max_fee = 10000;
                }

                const res = await api.get("/doctors", { params });
                setDoctors(res.data);
            } catch (error) {
                console.error("Failed to fetch doctors", error);
            }
        };

        fetchDoctors();
    }, [search, specialty, feeRange]);



    return (
        <div>
            {/* Navigation */}
                <Navbar />
            <div className="p-3 max-w-7xl mx-auto">
                {/* Filter Navbar */}
                <div className="w-full bg-white shadow rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-center">

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search doctor name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border p-2 rounded w-full md:w-64"
                    />

                    {/* Specialty */}
                    <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="border p-2 rounded"
                    >
                        <option value="">All Specialties</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedic">Orthopedic</option>
                        <option value="Dermatology">Dermatology</option>
                    </select>

                    {/* Fee */}
                    <select
                        value={feeRange}
                        onChange={(e) => setFeeRange(e.target.value)}
                        className="border p-2 rounded"
                    >
                        <option value="">All Fees</option>
                        <option value="low">Below ৳500</option>
                        <option value="mid">৳500 - ৳1500</option>
                        <option value="high">Above ৳1500</option>
                    </select>
                </div>

                <br />
                <h1 className="text-3xl font-bold mb-6">Available Doctors</h1>


                {/* Card Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {doctors.map((doctor) => (
                        <DoctorCard
                            key={doctor.id}
                            doctor={doctor}
                            onClick={() => navigate(`/doctor/${doctor.id}`)}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
}
