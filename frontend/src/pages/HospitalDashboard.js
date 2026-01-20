import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import HospitalBedManagement from './HospitalBedManagement';
import HospitalDoctorsManagement from './HospitalDoctorsManagement';
import HospitalAppointments from './HospitalAppointments';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [stats] = useState({
    bedAvailability: { total: 100, occupied: 75, available: 25 },
    appointments: { today: 45, upcoming: 120, completed: 320 },
    emergency: { active: 3, responded: 12, pending: 2 },
    finances: { revenue: 1250000, pending: 85000 }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for charts
  const occupancyData = [
    { name: 'Mon', general: 65, icu: 85, emergency: 45 },
    { name: 'Tue', general: 70, icu: 90, emergency: 50 },
    { name: 'Wed', general: 75, icu: 88, emergency: 55 },
    { name: 'Thu', general: 68, icu: 82, emergency: 48 },
    { name: 'Fri', general: 72, icu: 86, emergency: 52 },
    { name: 'Sat', general: 65, icu: 80, emergency: 40 },
    { name: 'Sun', general: 60, icu: 75, emergency: 35 }
  ];

  const departmentData = [
    { name: 'Cardiology', patients: 45 },
    { name: 'Neurology', patients: 32 },
    { name: 'Orthopedics', patients: 28 },
    { name: 'Pediatrics', patients: 38 },
    { name: 'Oncology', patients: 25 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const hospitalToken = localStorage.getItem('hospitalToken');
    const hospitalInfo = localStorage.getItem('hospitalInfo');

    if (!hospitalToken || !hospitalInfo) {
      // Initialize default hospital for demo purposes
      const defaultHospital = {
        name: 'City General Hospital',
        id: 'hospital_001'
      };
      localStorage.setItem('hospitalInfo', JSON.stringify(defaultHospital));
      setHospital(defaultHospital);
    } else {
      setHospital(JSON.parse(hospitalInfo));
    }
    fetchHospitalData();
  }, []);

  const fetchHospitalData = async () => {
    try {
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching hospital data:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hospitalToken');
    localStorage.removeItem('hospitalInfo');
    navigate('/');
  };

  const QuickActionButton = ({ icon, label, onClick, color = 'blue' }) => {
    const hoverColors = {
      blue: 'hover:border-blue-200',
      green: 'hover:border-green-200',
      red: 'hover:border-red-200',
      purple: 'hover:border-purple-200',
      yellow: 'hover:border-yellow-200'
    };

    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 ${hoverColors[color]} min-w-[120px]`}
      >
        <span className="text-3xl mb-2">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </button>
    );
  };

  const StatCard = ({ title, value, change, icon, color = 'blue' }) => {
    const colorClasses = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
      green: { bg: 'bg-green-50', text: 'text-green-600' },
      red: { bg: 'bg-red-50', text: 'text-red-600' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600' }
    };

    const currentColor = colorClasses[color] || colorClasses.blue;

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
            {change && (
              <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${currentColor.bg} ${currentColor.text}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Hospital Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  PocketCare Hospital
                </span>
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'appointments' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => setActiveTab('beds')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'beds' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Bed Management
                </button>
                <button
                  onClick={() => setActiveTab('doctors')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'doctors' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Doctors
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Reports
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100 relative">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {hospital?.name || 'City General Hospital'}
                  </p>
                  <p className="text-xs text-gray-500">Hospital Administrator</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">H</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <QuickActionButton
              icon="📅"
              label="Appointments"
              onClick={() => setActiveTab('appointments')}
            />
            <QuickActionButton
              icon="🛏️"
              label="Update Beds"
              onClick={() => setActiveTab('beds')}
              color="green"
            />
            <QuickActionButton
              icon="👨‍⚕️"
              label="Manage Doctors"
              onClick={() => setActiveTab('doctors')}
              color="purple"
            />
            <QuickActionButton
              icon="📊"
              label="Reports"
              onClick={() => setActiveTab('reports')}
              color="yellow"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Patients Today"
                value="148"
                change={12}
                icon="👥"
                color="blue"
              />
              <StatCard
                title="Bed Occupancy"
                value={`${stats.bedAvailability.occupied}%`}
                change={5}
                icon="🛏️"
                color="green"
              />
              <StatCard
                title="Appointments Today"
                value={stats.appointments.today}
                change={-3}
                icon="📅"
                color="purple"
              />
              <StatCard
                title="Revenue Today"
                value={`৳${(stats.finances.revenue / 1000).toFixed(0)}K`}
                change={8}
                icon="💰"
                color="yellow"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Bed Occupancy Chart */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bed Occupancy Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="general" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="icu" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="emergency" stroke="#EF4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="patients"
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bed Availability */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bed Availability Status</h3>
              <div className="space-y-4">
                {[
                  { type: 'General Ward', total: 50, occupied: 35, color: 'blue' },
                  { type: 'ICU', total: 20, occupied: 18, color: 'red' },
                  { type: 'Emergency', total: 15, occupied: 10, color: 'green' },
                  { type: 'Pediatrics', total: 25, occupied: 15, color: 'yellow' },
                  { type: 'Maternity', total: 30, occupied: 20, color: 'purple' },
                ].map(bed => (
                  <div key={bed.type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{bed.type}</span>
                      <span className="text-gray-600">{bed.occupied}/{bed.total} beds</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${(bed.occupied / bed.total) * 100}%`,
                          backgroundColor: 
                            bed.type === 'General Ward' ? '#3B82F6' :
                            bed.type === 'ICU' ? '#EF4444' :
                            bed.type === 'Emergency' ? '#10B981' :
                            bed.type === 'Pediatrics' ? '#F59E0B' :
                            '#8B5CF6'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bed Management Tab */}
        {activeTab === 'beds' && (
          <HospitalBedManagement />
        )}

        {/* Doctors Management Tab */}
        {activeTab === 'doctors' && (
          <HospitalDoctorsManagement />
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <HospitalAppointments />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="font-semibold text-gray-800 mb-2">Financial Report</h3>
                <p className="text-sm text-gray-600">Monthly revenue, expenses, and profits</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                  Generate
                </button>
              </div>
              <div className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="font-semibold text-gray-800 mb-2">Patient Statistics</h3>
                <p className="text-sm text-gray-600">Admissions, discharges, and demographics</p>
                <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                  Generate
                </button>
              </div>
              <div className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-4">🏥</div>
                <h3 className="font-semibold text-gray-800 mb-2">Hospital Performance</h3>
                <p className="text-sm text-gray-600">Efficiency, quality, and patient satisfaction</p>
                <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm">
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalDashboard;
