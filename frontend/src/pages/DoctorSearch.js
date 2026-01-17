import { useEffect, useState } from "react";
import api from "../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import DoctorCard from "../components/DoctorCard";
import Footer from "../components/Footer";
import BackToDashboardButton from "../components/BackToDashboardButton";

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [specialties, setSpecialties] = useState([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [feeRange, setFeeRange] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sp = params.get("specialty");
    if (sp) setSpecialty(sp);
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;
    const fetchSpecialties = async () => {
      try {
        const res = await api.get("/specialties");
        const list = Array.isArray(res.data?.specialties)
          ? res.data.specialties
          : [];
        if (isMounted) setSpecialties(list);
      } catch {
        if (isMounted) setSpecialties([]);
      }
    };
    fetchSpecialties();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
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
        if (isMounted) {
          setDoctors(res.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to fetch doctors", error);
        }
      }
    };
    fetchDoctors();
    return () => {
      isMounted = false;
    };
  }, [search, specialty, feeRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="flex-grow">
        <div className="p-3 max-w-7xl mx-auto pb-14">
          {/* Filter Bar */}
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
              {specialties.length ? (
                specialties
                  .filter((s) => (s?.name || "").toLowerCase() !== "other")
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))
              ) : (
                <>
                  <option value="General Practice">General Practice</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="Dentistry">Dentistry</option>
                </>
              )}
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
          <div className="mb-8 flex items-center gap-3">
            <BackToDashboardButton />
            <h2 className="text-2xl font-semibold text-gray-800">
              Available Doctors
            </h2>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
              {doctors.length} found
            </span>
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
      </div>
      <Footer />
    </div>
  );
}
