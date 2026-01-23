import React from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse, LogOut, User, MessageSquare } from "lucide-react";
import { logout } from "../utils/auth";

const UserNavbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center space-x-3"
            aria-label="Go to dashboard"
          >
            <div className="relative">
              <HeartPulse className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PocketCare
            </span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate("/messages")}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              type="button"
              title="Messages"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              type="button"
              title="Profile"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
              type="button"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserNavbar;
