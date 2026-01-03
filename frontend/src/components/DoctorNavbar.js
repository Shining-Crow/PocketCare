import React from "react";
import { HeartPulse, Bell, Settings, LogOut } from "lucide-react";

const DoctorNavbar = ({ handleLogout }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <HeartPulse className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PocketCare
            </span>
            <span className="hidden sm:inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
              Doctor Portal
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DoctorNavbar;
