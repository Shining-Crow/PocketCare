import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    const adminInfo = localStorage.getItem('adminInfo');

    if (!adminToken || !adminInfo) {
      navigate('/admin/login');
      return;
    }

    setAdmin(JSON.parse(adminInfo));
    fetchDashboardStats(adminToken);
  }, [navigate]);

  const fetchDashboardStats = async (token) => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/admin/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold">PocketCare</h1>
          <p className="text-blue-100 text-sm">Admin Dashboard</p>
        </div>

        <nav className="mt-8">
          <a href="#dashboard" className="block px-6 py-3 bg-blue-800 border-l-4 border-white">
            <span className="text-xl mr-3">📊</span> Dashboard
          </a>
          <a href="#users" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">👥</span> Users
          </a>
          <a href="#doctors" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">👨‍⚕️</span> Doctors & Hospitals
          </a>
          <a href="#appointments" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">📅</span> Appointments
          </a>
          <a href="#alerts" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">🚨</span> SOS Alerts
          </a>
          <a href="#reports" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">📄</span> Reports
          </a>
          <a href="#monitoring" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">🔍</span> AI Monitoring
          </a>
          <a href="#settings" className="block px-6 py-3 hover:bg-blue-800 transition">
            <span className="text-xl mr-3">⚙️</span> Settings
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="relative p-2">
              🔔
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                1
              </span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-gray-800">{admin?.name || 'Admin'}</p>
                <p className="text-xs text-gray-600">{admin?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 overflow-auto flex-1">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Users Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Users</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.total_users || 0}</p>
                    </div>
                    <div className="text-4xl">👥</div>
                  </div>
                </div>

                {/* Active SOS Alerts Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Active SOS Alerts</p>
                      <p className="text-3xl font-bold text-red-600">{stats.active_sos_alerts || 0}</p>
                    </div>
                    <div className="text-4xl">🚨</div>
                  </div>
                </div>

                {/* Pending Appointments Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Pending Appointments</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.pending_appointments || 0}</p>
                    </div>
                    <div className="text-4xl">📅</div>
                  </div>
                </div>

                {/* OCR Reports Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">OCR Reports Reviewed</p>
                      <p className="text-3xl font-bold text-green-600">{stats.total_reports || 0}</p>
                    </div>
                    <div className="text-4xl">📄</div>
                  </div>
                </div>
              </div>

              {/* Disease Predictions & Chat Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Disease Predictions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Disease Predictions</h3>
                  <p className="text-gray-600 text-sm mb-4">Accuracy: 92%</p>
                  <ul className="space-y-3">
                    <li className="flex justify-between">
                      <span className="text-gray-700">1. Diabetes</span>
                      <span className="text-gray-600">23%</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-700">2. Hypertension</span>
                      <span className="text-gray-600">18%</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-700">3. Migraine</span>
                      <span className="text-gray-600">15%</span>
                    </li>
                  </ul>
                </div>

                {/* Chatbot Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Chatbot Activity</h3>
                  <p className="text-gray-700 font-semibold mb-4">Chats Today: {stats.chats_today || 0}</p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-gray-700">Health Queries</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-gray-700">BMI Advice</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-gray-700">Emergency Guidance</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Doctors & Live Consultations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Doctors Count */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Total Doctors</h3>
                  <p className="text-4xl font-bold text-blue-600">{stats.total_doctors || 0}</p>
                  <p className="text-gray-600 text-sm mt-2">Across all specialties</p>
                </div>

                {/* Live Consultations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Live Consultations</h3>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded">
                    <div className="text-4xl">👨‍⚕️</div>
                    <div>
                      <p className="font-semibold text-gray-800">Dr. Smith</p>
                      <p className="text-sm text-green-600">• In Session • 08:12 min</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
