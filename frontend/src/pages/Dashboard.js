import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import { 
  HeartPulse, 
  AlertCircle, 
  Activity, 
  Hospital, 
  Calendar, 
  User, 
  FileText, 
  MessageSquare,
  LogOut,
  Bell,
  Settings,
  TrendingUp,
  Clock,
  Award,
  Zap,
  AlertTriangle
} from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sosHolding, setSosHolding] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  const [stats, setStats] = useState({
    appointments: 0,
    reports: 0,
    streak: 0
  });
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [emergencyNote, setEmergencyNote] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
      // Animate stats on load
      setTimeout(() => {
        setStats({ appointments: 3, reports: 5, streak: 7 });
      }, 300);
    }
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (sosHolding) {
      interval = setInterval(() => {
        setSosProgress((prev) => {
          if (prev >= 100) {
            handleSOSActivate();
            return 0;
          }
          return prev + 2;
        });
      }, 20);
    } else {
      setSosProgress(0);
    }
    return () => clearInterval(interval);
  }, [sosHolding]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSOSActivate = () => {
    const typeLabel = selectedEmergency || 'general-emergency';
    // TODO: replace alert with real API call using typeLabel and emergencyNote
    alert(`🚨 SOS Activated (${typeLabel})! Contacting emergency services...`);
    setSosHolding(false);
    setSosProgress(0);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <HeartPulse className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PocketCare
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition group">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section with Stats */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Welcome Card */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-md p-8">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-blue-600 text-sm mb-2">Welcome back 👋</p>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{user.name}</h1>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-md">
                  <User className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.appointments}</p>
                  <p className="text-xs text-gray-500">Appointments</p>
                </div>
                <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-cyan-600" />
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.reports}</p>
                  <p className="text-xs text-gray-500">Reports</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.streak}</p>
                  <p className="text-xs text-gray-500">Day Streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Health Score Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-md p-8">
            <div className="text-center">
              <p className="text-green-600 text-sm mb-4">Health Score</p>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="rgba(15,23,42,0.08)" strokeWidth="12" fill="none" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="56" 
                    stroke="url(#gradient)" 
                    strokeWidth="12" 
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * 0.15}`}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">85</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">Great! Keep it up 🎉</p>
            </div>
          </div>
        </div>

        {/* Enhanced SOS Card */}
        <div className="mb-10">
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              Emergency SOS
            </h2>

            {/* HOLD circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-52 h-52 flex items-center justify-center">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-[10px] border-gray-200" />

                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="104"
                    cy="104"
                    r="88"
                    stroke="transparent"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="88"
                    stroke="#ef4444"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - sosProgress / 100)}`}
                    className="transition-all duration-100"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Hold button */}
                <button
                  type="button"
                  onMouseDown={() => setSosHolding(true)}
                  onMouseUp={() => setSosHolding(false)}
                  onMouseLeave={() => setSosHolding(false)}
                  onTouchStart={() => setSosHolding(true)}
                  onTouchEnd={() => setSosHolding(false)}
                  className="relative w-36 h-36 rounded-full bg-white shadow-md border border-gray-200 flex flex-col items-center justify-center transition-transform duration-150"
                  style={{ transform: sosHolding ? 'scale(0.96)' : 'scale(1)' }}
                >
                  <span className="text-2xl font-semibold tracking-wide text-gray-900">
                    {sosHolding ? `${Math.floor(sosProgress)}%` : 'HOLD'}
                  </span>
                  <span className="mt-1 text-[11px] uppercase tracking-[0.25em] text-gray-500">
                    Panic Mode
                  </span>
                </button>
              </div>

              <p className="mt-5 text-xs text-gray-500 text-center">
                {sosHolding
                  ? 'Keep holding to confirm SOS. Release to cancel.'
                  : 'Press and hold for 1 second to send an emergency alert.'}
              </p>
            </div>

            {/* Emergency types */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 text-center">
                Emergency type (optional)
              </h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { id: 'chest-pain', label: 'Chest Pain', icon: HeartPulse },
                  { id: 'breathing', label: 'Breathing Issue', icon: Activity },
                  { id: 'bleeding', label: 'Heavy Bleeding', icon: AlertTriangle },
                  { id: 'unconscious', label: 'Unconscious', icon: User },
                  { id: 'seizure', label: 'Seizure', icon: Zap },
                  { id: 'other', label: 'Other Medical', icon: AlertCircle },
                ].map((type) => {
                  const active = selectedEmergency === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        setSelectedEmergency(active ? null : type.id)
                      }
                      className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2 transition text-[11px] ${
                        active
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional details */}
            <div className="mt-6">
              <textarea
                rows={3}
                value={emergencyNote}
                onChange={(e) => setEmergencyNote(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50"
                placeholder="Additional details (optional)"
              />
            </div>
          </div>
        </div>

        {/* Quick Actions with 3D Effect */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-yellow-500" />
            Quick Actions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Symptom Checker */}
            <div className="group relative">
              <div className="relative bg-white rounded-2xl shadow-md p-8 text-gray-900 transform group-hover:scale-105 transition-all duration-300 cursor-pointer border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                    <Activity className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Symptom Checker</h3>
                    <p className="text-orange-600 text-sm font-medium">AI-Powered Analysis</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">Get instant insights about your symptoms with our advanced AI</p>
                <button className="w-full bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition shadow-lg">
                  Start Analysis →
                </button>
              </div>
            </div>

            {/* Find Doctors */}
            <div className="group relative">
              <div className="relative bg-white rounded-2xl shadow-md p-8 text-gray-900 transform group-hover:scale-105 transition-all duration-300 cursor-pointer border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                    <Hospital className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Find Doctors</h3>
                    <p className="text-blue-600 text-sm font-medium">500+ Specialists</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">Search and book appointments with verified healthcare professionals</p>
                <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg">
                  Browse Now →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Healthcare Services Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Healthcare Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Calendar, title: 'Appointments', desc: 'Manage bookings', color: 'from-green-400 to-emerald-500', bg: 'bg-green-500/10', onClick: () => navigate('/appointments') },
              { icon: FileText, title: 'Medical Reports', desc: 'Upload & analyze', color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-500/10', onClick: () => {} },
              { icon: MessageSquare, title: 'Health Chat', desc: '24/7 AI assistant', color: 'from-cyan-400 to-teal-500', bg: 'bg-cyan-500/10', onClick: () => navigate('/health-chat') },
              { icon: User, title: 'My Profile', desc: 'Health information', color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-500/10', onClick: () => {} },
            ].map((service, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-2xl p-6 hover:bg-blue-50/40 transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 transform hover:-translate-y-2 hover:shadow-lg"
                onClick={service.onClick}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg`}>
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{service.desc}</p>
                <span className={`text-sm font-semibold bg-gradient-to-r ${service.color} bg-clip-text text-transparent group-hover:underline`}>
                  Open →
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Recent Activity
              </h3>
            </div>
            <div className="space-y-3">
              <p className="text-gray-600 text-sm">No recent activity yet</p>
              <p className="text-gray-500 text-xs">Start using PocketCare to see your health journey here</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <HeartPulse className="w-5 h-5 mr-2 text-cyan-500 animate-pulse" />
              Daily Health Tip
            </h3>
            <p className="text-gray-700 leading-relaxed">
              💧 <strong>Stay Hydrated:</strong> Drink at least 8 glasses of water daily. Proper hydration improves energy, skin health, and overall wellbeing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
