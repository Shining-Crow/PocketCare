import { useEffect, useState } from "react";
import api from "../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import { BadgeDollarSign, Filter, Search, X } from "lucide-react";
import DoctorCard from "../components/DoctorCard";
import Footer from "../components/Footer";
import BackToDashboardButton from "../components/BackToDashboardButton";

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [specialties, setSpecialties] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [feeRange, setFeeRange] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sp = params.get("specialty");
    if (sp) setSpecialty(sp);
  }, [location.search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

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
          <div className="w-full rounded-2xl bg-white border border-gray-200 shadow-sm p-4 mb-6">
            <div className="mb-5 flex items-center gap-3">
              <BackToDashboardButton />
              <h2 className="text-2xl font-semibold text-gray-800">
                Available Doctors
              </h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                {doctors.length} found
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search doctor name"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                />
                {!!searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-500 hover:text-gray-700"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Specialty */}
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
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
              </div>

              {/* Fee */}
              <div className="relative">
                <BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={feeRange}
                  onChange={(e) => setFeeRange(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                >
                  <option value="">All Fees</option>
                  <option value="low">Below ৳500</option>
                  <option value="mid">৳500 - ৳1500</option>
                  <option value="high">Above ৳1500</option>
                </select>
              </div>
            </div>

            {(searchInput || specialty || feeRange) && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">Filters applied</div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setSpecialty("");
                    setFeeRange("");
                  }}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900"
                >
                  Clear all
                </button>
              </div>
            )}
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
