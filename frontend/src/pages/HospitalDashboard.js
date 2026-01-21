import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("hospitalToken");
    const info = localStorage.getItem("hospitalInfo");
    if (!token || !info) {
      navigate("/hospital/login", { replace: true });
      return;
    }
    try {
      setHospital(JSON.parse(info));
    } catch (e) {
      setHospital({});
    }
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem("hospitalToken");
    localStorage.removeItem("hospitalInfo");
    navigate("/hospital/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as: <span className="font-semibold">{hospital?.name || "Hospital"}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">SOS request inbox will be added next.</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          <p className="text-sm text-gray-700 mt-2">
            Latitude: <span className="font-mono">{hospital?.latitude ?? "—"}</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Longitude: <span className="font-mono">{hospital?.longitude ?? "—"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
