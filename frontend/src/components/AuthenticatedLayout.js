import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DoctorNavbar from "./DoctorNavbar";
import UserNavbar from "./UserNavbar";
import { getCurrentUser, logout } from "../utils/auth";

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const isDoctor = user?.role === "doctor";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const onDashboard = location.pathname === "/dashboard";

  return (
    <div className="min-h-screen">
      {isDoctor ? (
        <DoctorNavbar handleLogout={handleLogout} />
      ) : (
        <UserNavbar />
      )}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            disabled={onDashboard}
            className={`px-4 py-2 rounded-lg border transition ${
              onDashboard
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <Outlet />
    </div>
  );
}

export default AuthenticatedLayout;
