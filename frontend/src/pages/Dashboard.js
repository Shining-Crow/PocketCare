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
  Zap
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
    alert('🚨 SOS Activated! Contacting emergency services...');
    setSosHolding(false);
    setSosProgress(0);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <HeartPulse className="w-8 h-8 text-blue-400 animate-pulse" />
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-md"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                PocketCare
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition group">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition border border-red-500/20"
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
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/20 shadow-2xl p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-transparent rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-blue-300 text-sm mb-2">Welcome back 👋</p>
                  <h1 className="text-4xl font-bold text-white mb-2">{user.name}</h1>
                  <p className="text-gray-300">{user.email}</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <User className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.appointments}</p>
                  <p className="text-xs text-gray-300">Appointments</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.reports}</p>
                  <p className="text-xs text-gray-300">Reports</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.streak}</p>
                  <p className="text-xs text-gray-300">Day Streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Health Score Card */}
          <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/20 shadow-2xl p-8">
            <div className="text-center">
              <p className="text-green-300 text-sm mb-4">Health Score</p>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
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
                  <span className="text-4xl font-bold text-white">85</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm">Great! Keep it up 🎉</p>
            </div>
          </div>
        </div>

        {/* Enhanced SOS Button */}
        <div className="mb-8">
          <div className="flex flex-col items-center">
            <div className="relative group">
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
              <div className="absolute inset-0 rounded-full bg-red-500/40 animate-pulse"></div>
              
              <button
                onMouseDown={() => setSosHolding(true)}
                onMouseUp={() => setSosHolding(false)}
                onMouseLeave={() => setSosHolding(false)}
                onTouchStart={() => setSosHolding(true)}
                onTouchEnd={() => setSosHolding(false)}
                className="relative w-56 h-56 bg-gradient-to-br from-red-500 to-red-700 rounded-full shadow-2xl flex flex-col items-center justify-center text-white transform transition-all duration-300 cursor-pointer border-4 border-red-300/50"
                style={{
                  boxShadow: sosHolding 
                    ? '0 0 100px rgba(239, 68, 68, 0.9), 0 0 200px rgba(239, 68, 68, 0.6)' 
                    : '0 25px 50px -12px rgba(239, 68, 68, 0.5)',
                  transform: sosHolding ? 'scale(0.95)' : 'scale(1)'
                }}
              >
                {/* Animated Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="112"
                    cy="112"
                    r="106"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="112"
                    cy="112"
                    r="106"
                    stroke="white"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 106}`}
                    strokeDashoffset={`${2 * Math.PI * 106 * (1 - sosProgress / 100)}`}
                    className="transition-all duration-100"
                    strokeLinecap="round"
                  />
                </svg>
                
                <AlertCircle className="w-20 h-20 mb-3 animate-pulse" />
                <span className="text-3xl font-bold tracking-wider">SOS</span>
                <span className="text-sm text-red-100 mt-2 font-medium">
                  {sosHolding ? `${Math.floor(sosProgress)}%` : 'Hold for Emergency'}
                </span>
              </button>
            </div>
            <div className="mt-6 text-center max-w-md">
              <p className="text-gray-300 text-sm backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10">
                🚨 Press and hold for 1 second to activate emergency alert
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions with 3D Effect */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-yellow-400" />
            Quick Actions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Symptom Checker */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-2xl p-8 text-white transform group-hover:scale-105 transition-all duration-300 cursor-pointer border border-white/20">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Symptom Checker</h3>
                    <p className="text-orange-100 text-sm">AI-Powered Analysis</p>
                  </div>
                </div>
                <p className="text-orange-50 mb-6">Get instant insights about your symptoms with our advanced AI</p>
                <button className="w-full bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-50 transition shadow-lg">
                  Start Analysis →
                </button>
              </div>
            </div>

            {/* Find Doctors */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-2xl p-8 text-white transform group-hover:scale-105 transition-all duration-300 cursor-pointer border border-white/20">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                    <Hospital className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Find Doctors</h3>
                    <p className="text-blue-100 text-sm">500+ Specialists</p>
                  </div>
                </div>
                <p className="text-blue-50 mb-6">Search and book appointments with verified healthcare professionals</p>
                <button className="w-full bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition shadow-lg">
                  Browse Now →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Healthcare Services Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Healthcare Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Calendar, title: 'Appointments', desc: 'Manage bookings', color: 'from-green-400 to-emerald-500', bg: 'bg-green-500/10' },
              { icon: FileText, title: 'Medical Reports', desc: 'Upload & analyze', color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-500/10' },
              { icon: MessageSquare, title: 'Health Chat', desc: '24/7 AI assistant', color: 'from-cyan-400 to-teal-500', bg: 'bg-cyan-500/10' },
              { icon: User, title: 'My Profile', desc: 'Health information', color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-500/10' },
            ].map((service, idx) => (
              <div
                key={idx}
                className="group relative backdrop-blur-xl bg-white/5 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/10 hover:border-white/30 transform hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg`}>
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{service.desc}</p>
                <span className={`text-sm font-semibold bg-gradient-to-r ${service.color} bg-clip-text text-transparent group-hover:underline`}>
                  Open →
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-400" />
                Recent Activity
              </h3>
            </div>
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">No recent activity yet</p>
              <p className="text-gray-500 text-xs">Start using PocketCare to see your health journey here</p>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <HeartPulse className="w-5 h-5 mr-2 text-cyan-400 animate-pulse" />
              Daily Health Tip
            </h3>
            <p className="text-gray-200 leading-relaxed">
              💧 <strong>Stay Hydrated:</strong> Drink at least 8 glasses of water daily. Proper hydration improves energy, skin health, and overall wellbeing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
