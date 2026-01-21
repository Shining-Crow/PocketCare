import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import HospitalBedManagement from './HospitalBedManagement';
import HospitalDoctorsManagement from './HospitalDoctorsManagement';
import HospitalAppointments from './HospitalAppointments';
import HospitalEmergencySOS from './HospitalEmergencySOS';
import Footer from '../components/Footer';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({
    bedAvailability: { total: 100, occupied: 75, available: 25 },
    appointments: { today: 45, upcoming: 120, completed: 320 },
    emergency: { active: 3, responded: 12, pending: 2 },
    finances: { revenue: 1250000, pending: 85000 }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [patientsToday, setPatientsToday] = useState(0);
  const [bedOccupancyPercentage, setBedOccupancyPercentage] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);

  // Mock data for charts - will be replaced with real data
  const [occupancyData, setOccupancyData] = useState([
    { name: 'Mon', general: 65, icu: 85, emergency: 45 },
    { name: 'Tue', general: 70, icu: 90, emergency: 50 },
    { name: 'Wed', general: 75, icu: 88, emergency: 55 },
    { name: 'Thu', general: 68, icu: 82, emergency: 48 },
    { name: 'Fri', general: 72, icu: 86, emergency: 52 },
    { name: 'Sat', general: 65, icu: 80, emergency: 40 },
    { name: 'Sun', general: 60, icu: 75, emergency: 35 }
  ]);

  const [departmentData, setDepartmentData] = useState([
    { name: 'Cardiology', patients: 45 },
    { name: 'Neurology', patients: 32 },
    { name: 'Orthopedics', patients: 28 },
    { name: 'Pediatrics', patients: 38 },
    { name: 'Oncology', patients: 25 }
  ]);

  const [bedAvailability, setBedAvailability] = useState([
    { type: 'General Ward', total: 50, occupied: 35, color: 'blue' },
    { type: 'ICU', total: 20, occupied: 18, color: 'red' },
    { type: 'Emergency', total: 15, occupied: 10, color: 'green' },
    { type: 'Pediatrics', total: 25, occupied: 15, color: 'yellow' },
    { type: 'Maternity', total: 30, occupied: 20, color: 'purple' },
  ]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const hospitalToken = localStorage.getItem('hospitalToken');
    const hospitalInfo = localStorage.getItem('hospitalInfo');

    if (!hospitalToken || !hospitalInfo) {
      navigate('/hospital/login');
      return;
    } else {
      const parsedHospital = JSON.parse(hospitalInfo);
      setHospital(parsedHospital);
      fetchHospitalData(parsedHospital.id);
    }
  }, []);

  // Refetch data when switching back to overview tab
  useEffect(() => {
    if (activeTab === 'overview' && hospital?.id) {
      fetchHospitalData(hospital.id);
    }
  }, [activeTab, hospital?.id]);

  const fetchHospitalData = async (hospitalId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/hospital-dashboard/all?hospital_id=${hospitalId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch hospital data');
      }

      const data = await response.json();

      if (data.success) {
        // Update hospital info
        if (data.hospital) {
          setHospital(prevHospital => ({
            ...prevHospital,
            name: data.hospital.name
          }));
        }

        // Update stats
        if (data.stats) {
          setStats(data.stats);
        }

        // Update occupancy data
        if (data.occupancyData && data.occupancyData.length > 0) {
          setOccupancyData(data.occupancyData);
        }

        // Update department data
        if (data.departmentData && data.departmentData.length > 0) {
          setDepartmentData(data.departmentData);
        }

        // Update bed availability
        if (data.bedAvailability && data.bedAvailability.length > 0) {
          setBedAvailability(data.bedAvailability);
        }

        // Update dashboard metrics
        setPatientsToday(data.patientsToday || 0);
        setBedOccupancyPercentage(data.bedOccupancyPercentage || 0);
        setRevenueToday(data.revenueToday || 0);
      }

      setLoading(false);
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
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left: Logo and Brand */}
              <div className="flex items-center flex-shrink-0">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  PocketCare Hospital
                </span>
              </div>

              {/* Center: Navigation Tabs */}
              <div className="flex items-baseline space-x-2 flex-1 justify-center">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'appointments' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => setActiveTab('beds')}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'beds' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Bed Management
                </button>
                <button
                  onClick={() => setActiveTab('emergency')}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'emergency' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Emergency SOS
                </button>
                <button
                  onClick={() => setActiveTab('doctors')}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'doctors' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Doctors
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Reports
                </button>
              </div>

              {/* Right: User Info and Actions */}
              <div className="flex items-center space-x-4 flex-shrink-0">
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
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Patients Today"
                  value={patientsToday}
                  change={12}
                  icon="👥"
                  color="blue"
                />
                <StatCard
                  title="Bed Occupancy"
                  value={`${bedOccupancyPercentage}%`}
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
                  value={`৳${(revenueToday / 1000).toFixed(0)}K`}
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
                  <ResponsiveContainer width="100%" height={256} minHeight={256}>
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

                {/* Department Distribution */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Distribution</h3>
                  <ResponsiveContainer width="100%" height={256} minHeight={256}>
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

              {/* Bed Availability */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bed Availability Status</h3>
                <div className="space-y-4">
                  {bedAvailability.map(bed => {
                    const available = bed.available || (bed.total - bed.occupied);
                    const availabilityPercent = (available / bed.total) * 100;
                    return (
                      <div key={bed.type} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{bed.type}</span>
                          <span className="text-gray-600">{available}/{bed.total} beds available</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${availabilityPercent}%`,
                              backgroundColor:
                                bed.color === 'blue' ? '#3B82F6' :
                                  bed.color === 'red' ? '#EF4444' :
                                    bed.color === 'green' ? '#10B981' :
                                      bed.color === 'yellow' ? '#F59E0B' :
                                        bed.color === 'indigo' ? '#6366F1' :
                                          '#8B5CF6'
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
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

          {/* Emergency SOS Tab */}
          {activeTab === 'emergency' && (
            <HospitalEmergencySOS />
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
      <Footer />
    </div>
  );
};

export default HospitalDashboard;
