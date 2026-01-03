import { useEffect, useState } from "react";
import api from "../utils/api";
import { Search, Stethoscope, DollarSign, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import DoctorCard from "../components/DoctorCard";
import Footer from "../components/Footer";

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Navbar />
            <div className="max-w-7xl mx-auto pt-4 pb-10 px-4">
                <div className="bg-white/90 rounded-2xl shadow-xl p-4 mb-10 border border-blue-100">
                    <h1 className="text-4xl font-bold text-blue-700 mb-8 flex items-center gap-3">
                        <User className="w-10 h-10 text-blue-500" /> Find Your Doctor
                    </h1>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        {/* Search */}
                        <div className="flex items-center border-2 border-blue-100 rounded-lg px-3 py-2 w-full md:w-1/3 bg-blue-50">
                            <Search className="w-5 h-5 text-blue-500 mr-2" />
                            <input
                                type="text"
                                placeholder="Search doctor name"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent outline-none w-full text-gray-700"
                            />
                        </div>
                        {/* Specialty */}
                        <div className="flex items-center border-2 border-purple-100 rounded-lg px-3 py-2 w-full md:w-1/3 bg-purple-50">
                            <Stethoscope className="w-5 h-5 text-purple-500 mr-2" />
                            <select
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                className="bg-transparent outline-none w-full text-gray-700"
                            >
                                <option value="">All Specialties</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Neurology">Neurology</option>
                                <option value="Orthopedic">Orthopedic</option>
                                <option value="Dermatology">Dermatology</option>
                            </select>
                        </div>
                        {/* Fee */}
                        <div className="flex items-center border-2 border-purple-100 rounded-lg px-3 py-2 w-full md:w-1/3 bg-purple-50">
                            <DollarSign className="w-5 h-5 text-purple-500 mr-2" />
                            <select
                                value={feeRange}
                                onChange={(e) => setFeeRange(e.target.value)}
                                className="bg-transparent outline-none w-full text-gray-700"
                            >
                                <option value="">All Fees</option>
                                <option value="low">Below ৳500</option>
                                <option value="mid">৳500 - ৳1500</option>
                                <option value="high">Above ৳1500</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mb-8 flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-gray-800">Available Doctors</h2>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{doctors.length} found</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {doctors.map((doctor) => (
                        <DoctorCard
                            key={doctor.id}
                            doctor={doctor}
                            onClick={() => navigate(`/doctor/${doctor.id}`)}
                        />
                    ))}
                </div>
            </div>
            <Footer />
        </div>
    );
}
