import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from 'recharts';
import HospitalBedManagement from './HospitalBedManagement';
import HospitalDoctorsManagement from './HospitalDoctorsManagement';

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
      navigate('/hospital/login');
      return;
    }

    setHospital(JSON.parse(hospitalInfo));
    fetchHospitalData();
  }, [navigate]);

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
    navigate('/hospital/login');
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
    // Map color names to actual Tailwind classes
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
    PocketCare
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
                  onClick={() => setActiveTab('emergency')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'emergency' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Emergency SOS
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
                    {hospital?.name || (localStorage.getItem('hospitalInfo') ? 
                      JSON.parse(localStorage.getItem('hospitalInfo')).name : 
                      "City General Hospital")}
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
              label="New Appointment"
              onClick={() => setActiveTab('appointments')}
            />
            <QuickActionButton
              icon="🛏️"
              label="Update Beds"
              onClick={() => setActiveTab('beds')}
              color="green"
            />
            <QuickActionButton
              icon="🚨"
              label="Emergency View"
              onClick={() => setActiveTab('emergency')}
              color="red"
            />
            <QuickActionButton
              icon="👨‍⚕️"
              label="Manage Doctors"
              onClick={() => setActiveTab('doctors')}
              color="purple"
            />
            <QuickActionButton
              icon="📊"
              label="Generate Report"
              onClick={() => setActiveTab('reports')}
              color="yellow"
            />
            <QuickActionButton
              icon="💬"
              label="Live Chat"
              onClick={() => alert('Live chat feature coming soon!')}
              color="blue"
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
                title="Emergency Cases"
                value={stats.emergency.active}
                change={-3}
                icon="🚨"
                color="red"
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

            {/* Active Emergency SOS Alerts */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Active Emergency SOS Alerts</h3>
                <button 
                  onClick={() => setActiveTab('emergency')}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                >
                  View All Alerts
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { id: 1, name: 'John Doe', age: 45, condition: 'Cardiac Arrest', time: '2 min ago', priority: 'High' },
                  { id: 2, name: 'Sarah Smith', age: 32, condition: 'Severe Bleeding', time: '5 min ago', priority: 'High' },
                  { id: 3, name: 'Mike Johnson', age: 58, condition: 'Difficulty Breathing', time: '8 min ago', priority: 'Medium' },
                ].map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">🚨</div>
                      <div>
                        <p className="font-semibold text-gray-800">{alert.name} ({alert.age})</p>
                        <p className="text-sm text-gray-600">{alert.condition}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${alert.priority === 'High' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>
                        {alert.priority} Priority
                      </span>
                      <p className="text-sm text-gray-500 mt-1">{alert.time}</p>
                    </div>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                      Accept & Respond
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Appointments & Bed Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upcoming Appointments */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Today's Appointments</h3>
                  <button 
                    onClick={() => setActiveTab('appointments')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Schedule →
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 1, name: 'Dr. Sarah Wilson', specialty: 'Cardiology', time: '10:30 AM', patient: 'Robert Chen' },
                    { id: 2, name: 'Dr. Michael Brown', specialty: 'Neurology', time: '11:15 AM', patient: 'Lisa Wang' },
                    { id: 3, name: 'Dr. Emily Davis', specialty: 'Pediatrics', time: '2:00 PM', patient: 'Tommy Johnson' },
                    { id: 4, name: 'Dr. James Miller', specialty: 'Orthopedics', time: '3:30 PM', patient: 'Maria Garcia' },
                  ].map(appointment => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">👨‍⚕️</div>
                        <div>
                          <p className="font-medium text-gray-800">{appointment.name}</p>
                          <p className="text-sm text-gray-600">{appointment.specialty}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">{appointment.patient}</p>
                        <p className="text-sm text-gray-600">{appointment.time}</p>
                      </div>
                    </div>
                  ))}
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
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-800">Need to update bed status?</p>
                      <p className="text-sm text-blue-600">Keep bed availability real-time for better SOS routing</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('beds')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Update Now
                    </button>
                  </div>
                </div>
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

        {/* Appointments Tab - UPDATED VERSION */}
{activeTab === 'appointments' && (
  <div className="bg-white rounded-xl shadow-sm p-8">
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Appointments Management</h2>
        <p className="text-gray-600">Schedule, manage, and track patient appointments</p>
      </div>
      <div className="flex gap-3">
        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
          📋 View Calendar
        </button>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          + Schedule New
        </button>
      </div>
    </div>
    
    {/* Dynamic Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">Today's Appointments</h3>
            <p className="text-3xl font-bold">24</p>
          </div>
          <div className="text-3xl">📅</div>
        </div>
        <p className="text-blue-100 text-sm mt-2">8:00 AM - 6:00 PM</p>
      </div>
      
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">Waiting Room</h3>
            <p className="text-3xl font-bold">8</p>
          </div>
          <div className="text-3xl">👥</div>
        </div>
        <p className="text-green-100 text-sm mt-2">Avg wait: 15 mins</p>
      </div>
      
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">Doctor Availability</h3>
            <p className="text-3xl font-bold">12/15</p>
          </div>
          <div className="text-3xl">👨‍⚕️</div>
        </div>
        <p className="text-purple-100 text-sm mt-2">80% available</p>
      </div>
      
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold">85%</p>
          </div>
          <div className="text-3xl">✅</div>
        </div>
        <p className="text-orange-100 text-sm mt-2">Today's efficiency</p>
      </div>
    </div>
    
    {/* Filters & Search */}
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search patient, doctor, or ID..."
          className="px-4 py-2 border border-gray-300 rounded-lg flex-1 min-w-[200px]"
        />
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>All Status</option>
          <option>Scheduled</option>
          <option>Checked-in</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>All Departments</option>
          <option>Cardiology</option>
          <option>Neurology</option>
          <option>Orthopedics</option>
          <option>Pediatrics</option>
          <option>Oncology</option>
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Apply Filters
        </button>
      </div>
    </div>
    
    {/* Real-time Status Updates */}
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Today's Appointments</h3>
        <div className="text-sm text-gray-600">Last updated: 2 mins ago</div>
      </div>
      
      {/* Appointment Status Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {['All', 'Scheduled', 'Checked-in', 'In Progress', 'Completed'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium ${tab === 'All' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            {tab} ({tab === 'All' ? 24 : tab === 'Scheduled' ? 10 : tab === 'Checked-in' ? 8 : tab === 'In Progress' ? 4 : 2})
          </button>
        ))}
      </div>
      
      {/* Live Appointment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { id: 1, patient: 'Robert Chen', time: '09:30 AM', doctor: 'Dr. Sarah Wilson', dept: 'Cardiology', status: 'checked-in', room: '301' },
          { id: 2, patient: 'Lisa Wang', time: '10:15 AM', doctor: 'Dr. Michael Brown', dept: 'Neurology', status: 'waiting', room: '305' },
          { id: 3, patient: 'Tommy Johnson', time: '10:45 AM', doctor: 'Dr. Emily Davis', dept: 'Pediatrics', status: 'in-progress', room: '210' },
          { id: 4, patient: 'Maria Garcia', time: '11:30 AM', doctor: 'Dr. James Miller', dept: 'Orthopedics', status: 'scheduled', room: '402' },
          { id: 5, patient: 'Ahmed Rahman', time: '02:00 PM', doctor: 'Dr. Lisa Chen', dept: 'Oncology', status: 'scheduled', room: '308' },
          { id: 6, patient: 'Fatima Begum', time: '03:15 PM', doctor: 'Dr. Sarah Wilson', dept: 'Cardiology', status: 'scheduled', room: '301' },
        ].map((apt) => (
          <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-800">{apt.patient}</p>
                <p className="text-sm text-gray-600">{apt.doctor}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                apt.status === 'checked-in' ? 'bg-green-100 text-green-800' :
                apt.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                apt.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {apt.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{apt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium">{apt.dept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room:</span>
                <span className="font-medium">{apt.room}</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm">
                Update
              </button>
              <button className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Live Dashboard & Analytics */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Department-wise Load */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Load & Wait Times</h3>
        <div className="space-y-4">
          {[
            { dept: 'Cardiology', current: 8, avgWait: '25 mins', capacity: 90, color: 'red' },
            { dept: 'Neurology', current: 5, avgWait: '18 mins', capacity: 75, color: 'blue' },
            { dept: 'Pediatrics', current: 6, avgWait: '15 mins', capacity: 65, color: 'green' },
            { dept: 'Orthopedics', current: 4, avgWait: '12 mins', capacity: 50, color: 'yellow' },
            { dept: 'Oncology', current: 3, avgWait: '20 mins', capacity: 40, color: 'purple' },
          ].map((dept) => (
            <div key={dept.dept} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800">{dept.dept}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{dept.current} patients</span>
                  <span className="text-sm text-gray-600">Avg: {dept.avgWait}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${dept.capacity}%`,
                    backgroundColor: 
                      dept.color === 'red' ? '#EF4444' :
                      dept.color === 'blue' ? '#3B82F6' :
                      dept.color === 'green' ? '#10B981' :
                      dept.color === 'yellow' ? '#F59E0B' :
                      '#8B5CF6'
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Light load</span>
                <span className={`font-medium ${
                  dept.capacity > 80 ? 'text-red-600' :
                  dept.capacity > 60 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {dept.capacity}% capacity
                </span>
                <span>Full capacity</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Doctor Availability & Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Doctor Availability & Quick Actions</h3>
        
        {/* Doctor Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-700">Active Doctors</h4>
            <span className="text-sm text-green-600">● 12 Available</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Dr. Sarah Wilson', 'Dr. Michael Brown', 'Dr. Emily Davis', 'Dr. James Miller', 'Dr. Lisa Chen', 'Dr. Robert Taylor'].map((doc) => (
              <span key={doc} className="px-3 py-1 bg-white border border-green-200 text-green-700 rounded-full text-sm">
                {doc}
              </span>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition flex items-center justify-center">
            <span className="text-2xl mr-2">📝</span>
            <span>Quick Add</span>
          </button>
          <button className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition flex items-center justify-center">
            <span className="text-2xl mr-2">🔔</span>
            <span>Send Alerts</span>
          </button>
          <button className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition flex items-center justify-center">
            <span className="text-2xl mr-2">📊</span>
            <span>Reports</span>
          </button>
          <button className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition flex items-center justify-center">
            <span className="text-2xl mr-2">🔄</span>
            <span>Reschedule</span>
          </button>
        </div>
        
        {/* Upcoming Features */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">📈 Real-time Features</h4>
          <div className="space-y-2">
            <div className="flex items-center text-green-600">
              <span className="mr-2">✓</span>
              <span className="text-sm">Live waiting time updates</span>
            </div>
            <div className="flex items-center text-green-600">
              <span className="mr-2">✓</span>
              <span className="text-sm">Automatic SMS reminders</span>
            </div>
            <div className="flex items-center text-blue-600">
              <span className="mr-2">🔄</span>
              <span className="text-sm">QR code check-in (coming soon)</span>
            </div>
            <div className="flex items-center text-blue-600">
              <span className="mr-2">🔄</span>
              <span className="text-sm">AI wait time prediction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Notification Panel */}
    <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
      <div className="flex items-start">
        <div className="text-2xl mr-3">⚠️</div>
        <div>
          <p className="font-medium text-yellow-800">System Notifications</p>
          <p className="text-sm text-yellow-700 mt-1">
            • Cardiology department at 90% capacity - Consider rescheduling non-urgent appointments<br/>
            • Dr. Sarah Wilson has 2 appointments running behind schedule (15 mins)<br/>
            • 3 patients have been waiting for over 30 minutes
          </p>
          <button className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm">
            View Details & Actions
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {/* Emergency SOS Tab */}
        {activeTab === 'emergency' && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Emergency SOS Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Emergencies</h3>
                <div className="space-y-4">
                  {[
                    { id: 1, patient: 'John Doe (45)', condition: 'Cardiac Arrest', time: '2 min ago', priority: 'high' },
                    { id: 2, patient: 'Sarah Smith (32)', condition: 'Severe Bleeding', time: '5 min ago', priority: 'high' },
                    { id: 3, patient: 'Mike Johnson (58)', condition: 'Difficulty Breathing', time: '8 min ago', priority: 'medium' },
                  ].map(emergency => (
                    <div key={emergency.id} className="p-4 border border-red-200 rounded-xl bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{emergency.patient}</p>
                          <p className="text-sm text-gray-600">{emergency.condition}</p>
                          <p className="text-xs text-gray-500 mt-1">{emergency.time}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${emergency.priority === 'high' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>
                          {emergency.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
                          Accept & Dispatch
                        </button>
                        <button className="flex-1 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition text-sm">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Emergency Statistics</h3>
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 rounded-xl">
                    <h4 className="font-medium text-blue-800 mb-2">Response Time</h4>
                    <p className="text-3xl font-bold text-blue-600">4.2 min</p>
                    <p className="text-sm text-blue-600">Average response time</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-xl">
                    <h4 className="font-medium text-green-800 mb-2">Cases Handled</h4>
                    <p className="text-3xl font-bold text-green-600">128</p>
                    <p className="text-sm text-green-600">This month</p>
                  </div>
                  <div className="p-6 bg-purple-50 rounded-xl">
                    <h4 className="font-medium text-purple-800 mb-2">Success Rate</h4>
                    <p className="text-3xl font-bold text-purple-600">94%</p>
                    <p className="text-sm text-purple-600">Successful interventions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Reports</h3>
              <div className="space-y-3">
                {[
                  { name: 'November 2023 Financial Report', date: 'Dec 1, 2023', type: 'PDF', size: '2.4 MB' },
                  { name: 'Patient Satisfaction Survey Results', date: 'Nov 28, 2023', type: 'Excel', size: '1.8 MB' },
                  { name: 'Emergency Response Analysis', date: 'Nov 25, 2023', type: 'PDF', size: '3.2 MB' },
                ].map(report => (
                  <div key={report.name} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="mr-4 text-2xl">
                        {report.type === 'PDF' ? '📄' : '📊'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{report.name}</p>
                        <p className="text-sm text-gray-600">{report.date} • {report.size}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalDashboard;