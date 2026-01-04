import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminInfo = localStorage.getItem('adminInfo');

    if (!adminToken || !adminInfo) {
      navigate('/admin/login');
      return;
    }

    const adminData = JSON.parse(adminInfo);
    setAdmin(adminData);
    setLoading(false);
    fetchDashboardStats();
  }, [navigate]);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/auth/admin/dashboard-stats');
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Admin information not found</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <span className={`text-3xl ${color}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value || 0}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-20 -mb-20"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome, {admin.name}!</h1>
              <p className="text-blue-100 text-lg">PocketCare Administration Panel</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex space-x-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            👥 Users & Doctors
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition ${
              activeTab === 'appointments'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 Appointments
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ⚙️ System
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Key Stats Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Users"
                  value={stats.total_users}
                  icon="👥"
                  color="text-blue-600"
                />
                <StatCard
                  title="Active Doctors"
                  value={stats.total_doctors}
                  icon="👨‍⚕️"
                  color="text-green-600"
                />
                <StatCard
                  title="Pending Appointments"
                  value={stats.pending_appointments}
                  icon="📅"
                  color="text-yellow-600"
                />
                <StatCard
                  title="SOS Alerts"
                  value={stats.active_sos_alerts}
                  icon="🚨"
                  color="text-red-600"
                />
              </div>
            </div>

            {/* Secondary Metrics */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">System Activity</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{stats.total_reports}</p>
                  <p className="text-sm text-gray-600 mb-4">Total reviewed</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">AI Chat Activity</h3>
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{stats.chats_today}</p>
                  <p className="text-sm text-gray-600 mb-4">Chats today</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ● Live
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mb-2">98%</p>
                  <p className="text-sm text-gray-600 mb-4">Uptime (30 days)</p>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Healthy
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Specialties</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Cardiology', count: 45, color: 'bg-red-100' },
                    { name: 'Dermatology', count: 38, color: 'bg-blue-100' },
                    { name: 'Neurology', count: 32, color: 'bg-purple-100' },
                    { name: 'Pediatrics', count: 28, color: 'bg-green-100' },
                  ].map((specialty, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 text-sm">{specialty.name}</p>
                        <p className="font-semibold text-gray-900">{specialty.count}</p>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${specialty.color} rounded-full`}
                          style={{ width: `${(specialty.count / 50) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
                <div className="space-y-4">
                  {[
                    { action: 'New user registered', time: '2 minutes ago', icon: '👤' },
                    { action: 'Appointment scheduled', time: '15 minutes ago', icon: '📅' },
                    { action: 'SOS alert received', time: '1 hour ago', icon: '🚨' },
                    { action: 'Medical report uploaded', time: '2 hours ago', icon: '📄' },
                    { action: 'Doctor login', time: '3 hours ago', icon: '👨‍⚕️' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <span className="text-xl">{activity.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users & Doctors Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Users & Doctors Management</h2>
            <p className="text-gray-600 mb-6">Manage and view all users and doctors on the platform</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-4xl font-bold text-blue-600 mb-2">{stats?.total_users || 0}</p>
                <p className="text-gray-700 font-medium">Total Users</p>
              </div>
              <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                <p className="text-4xl font-bold text-green-600 mb-2">{stats?.total_doctors || 0}</p>
                <p className="text-gray-700 font-medium">Total Doctors</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">Advanced user and doctor management features coming soon...</p>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Appointments Management</h2>
            <p className="text-gray-600 mb-6">Track and manage all appointments in the system</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-4xl font-bold text-yellow-600 mb-2">{stats?.pending_appointments || 0}</p>
                <p className="text-gray-700 font-medium">Pending Appointments</p>
              </div>
              <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-4xl font-bold text-purple-600 mb-2">156</p>
                <p className="text-gray-700 font-medium">Completed (This Month)</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-6">Appointment management features coming soon...</p>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">System Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">API Status</p>
                  <p className="text-2xl font-bold text-green-600 mb-2">✓ Running</p>
                  <p className="text-xs text-gray-500">Version: 1.0.0</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Database Status</p>
                  <p className="text-2xl font-bold text-green-600 mb-2">✓ Connected</p>
                  <p className="text-xs text-gray-500">MySQL 8.0</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Profile</h2>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {admin.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{admin.name}</p>
                  <p className="text-gray-600">{admin.email}</p>
                  <p className="text-sm text-gray-500 mt-2">Role: {admin.role || 'Administrator'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
