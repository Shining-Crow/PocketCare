import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import LocationPickerMap from '../components/LocationPickerMap';
import {
  Users,
  Stethoscope,
  CalendarClock,
  Siren,
  FileText,
  MessageSquare,
  CheckCircle2,
  LayoutDashboard,
  Settings,
  BarChart3,
  UserPlus,
  Clock,
  Upload,
  UserCheck,
  Activity,
  Target,
  TrendingUp,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Ban,
  ShieldCheck,
  X,
  Building2,
  ShieldPlus,
  Star,
  Server,
  Database,
  LogOut,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const PALETTE = [
  '#2563eb', // blue
  '#7c3aed', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#ec4899', // pink
];

const hexToRgba = (hex, alpha) => {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [analyticsRange, setAnalyticsRange] = useState('30d');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const [apptSeries, setApptSeries] = useState([]);
  const [specialtiesDistribution, setSpecialtiesDistribution] = useState([]);
  const [specialtiesDemand, setSpecialtiesDemand] = useState([]);
  const [doctorTop, setDoctorTop] = useState([]);
  const [chatSeries, setChatSeries] = useState([]);
  const [reportSeries, setReportSeries] = useState([]);
  const [symptomSeries, setSymptomSeries] = useState([]);
  const [weightWeekly, setWeightWeekly] = useState([]);
  const [weightActiveGoals, setWeightActiveGoals] = useState(0);
  const [weightAvgCheckins, setWeightAvgCheckins] = useState(0);

  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    password: '',
    emergency_contact: '',
    latitude: 23.8103,
    longitude: 90.4125,
  });
  const [hospitalCreateLoading, setHospitalCreateLoading] = useState(false);
  const [hospitalCreateError, setHospitalCreateError] = useState('');
  const [hospitalCreateSuccess, setHospitalCreateSuccess] = useState('');

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState('hospital'); // hospital | admin

  const [adminCreateForm, setAdminCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const [adminCreateLoading, setAdminCreateLoading] = useState(false);
  const [adminCreateError, setAdminCreateError] = useState('');
  const [adminCreateSuccess, setAdminCreateSuccess] = useState('');

  // Users & Doctors Management State
  const [usersListTab, setUsersListTab] = useState('users'); // 'users' | 'doctors'
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [doctorsList, setDoctorsList] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsSearch, setDoctorsSearch] = useState('');
  const [doctorsPage, setDoctorsPage] = useState(1);
  const [doctorsTotalPages, setDoctorsTotalPages] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', id: null, name: '', action: '' });

  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });

  useEffect(() => {
    if (!toast.isOpen) return;
    const t = setTimeout(() => {
      setToast((s) => ({ ...s, isOpen: false }));
    }, 3200);
    return () => clearTimeout(t);
  }, [toast.isOpen]);

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

  const loadAnalytics = async () => {
    if (!admin) return;
    setAnalyticsLoading(true);
    setAnalyticsError('');

    try {
      const range = analyticsRange;
      const [
        apptRes,
        specsRes,
        docRes,
        chatRes,
        repRes,
        symRes,
        weightRes,
      ] = await Promise.all([
        api.get('/auth/admin/analytics/appointments', { params: { range } }),
        api.get('/auth/admin/analytics/specialties', { params: { range } }),
        api.get('/auth/admin/analytics/doctors/activity', { params: { range } }),
        api.get('/auth/admin/analytics/chats', { params: { range } }),
        api.get('/auth/admin/analytics/reports', { params: { range } }),
        api.get('/auth/admin/analytics/symptoms', { params: { range } }),
        api.get('/auth/admin/analytics/weight', { params: { range: range === '7d' ? '30d' : range } }),
      ]);

      setApptSeries(Array.isArray(apptRes.data?.series) ? apptRes.data.series : []);

      setSpecialtiesDistribution(Array.isArray(specsRes.data?.distribution) ? specsRes.data.distribution : []);
      setSpecialtiesDemand(Array.isArray(specsRes.data?.demand) ? specsRes.data.demand : []);

      setDoctorTop(Array.isArray(docRes.data?.top_doctors) ? docRes.data.top_doctors : []);

      setChatSeries(Array.isArray(chatRes.data?.series) ? chatRes.data.series : []);
      setReportSeries(Array.isArray(repRes.data?.series) ? repRes.data.series : []);
      setSymptomSeries(Array.isArray(symRes.data?.series) ? symRes.data.series : []);

      setWeightWeekly(Array.isArray(weightRes.data?.weekly) ? weightRes.data.weekly : []);
      setWeightActiveGoals(Number(weightRes.data?.active_goals || 0));
      setWeightAvgCheckins(Number(weightRes.data?.avg_checkins_per_user_per_week || 0));
    } catch (err) {
      setAnalyticsError('Failed to load analytics data');
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) return;
    if (activeTab !== 'analytics') return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, activeTab, analyticsRange]);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/auth/admin/dashboard-stats');
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      console.error(err);
    }
  };

  const fetchUsersList = async (page = 1, search = '') => {
    setUsersLoading(true);
    try {
      const response = await api.get('/auth/admin/users', {
        params: { page, limit: 10, search }
      });
      setUsersList(response.data.users || []);
      setUsersTotalPages(response.data.total_pages || 1);
      setUsersPage(page);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setToast({ isOpen: true, type: 'error', message: 'Failed to fetch users' });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchDoctorsList = async (page = 1, search = '') => {
    setDoctorsLoading(true);
    try {
      const response = await api.get('/auth/admin/doctors', {
        params: { page, limit: 10, search }
      });
      setDoctorsList(response.data.doctors || []);
      setDoctorsTotalPages(response.data.total_pages || 1);
      setDoctorsPage(page);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
      setToast({ isOpen: true, type: 'error', message: 'Failed to fetch doctors' });
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      await api.put(`/auth/admin/users/${userId}/block`, { is_blocked: isBlocked });
      setToast({ isOpen: true, type: 'success', message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully` });
      fetchUsersList(usersPage, usersSearch);
      fetchDashboardStats();
    } catch (err) {
      console.error('Failed to update user:', err);
      setToast({ isOpen: true, type: 'error', message: 'Failed to update user' });
    }
  };

  const handleBlockDoctor = async (doctorId, isBlocked) => {
    try {
      await api.put(`/auth/admin/doctors/${doctorId}/block`, { is_blocked: isBlocked });
      setToast({ isOpen: true, type: 'success', message: `Doctor ${isBlocked ? 'blocked' : 'unblocked'} successfully` });
      fetchDoctorsList(doctorsPage, doctorsSearch);
      fetchDashboardStats();
    } catch (err) {
      console.error('Failed to update doctor:', err);
      setToast({ isOpen: true, type: 'error', message: 'Failed to update doctor' });
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/auth/admin/users/${userId}`);
      setToast({ isOpen: true, type: 'success', message: 'User deleted successfully' });
      setConfirmModal({ open: false, type: '', id: null, name: '', action: '' });
      fetchUsersList(usersPage, usersSearch);
      fetchDashboardStats();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setToast({ isOpen: true, type: 'error', message: 'Failed to delete user' });
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    try {
      await api.delete(`/auth/admin/doctors/${doctorId}`);
      setToast({ isOpen: true, type: 'success', message: 'Doctor deleted successfully' });
      setConfirmModal({ open: false, type: '', id: null, name: '', action: '' });
      fetchDoctorsList(doctorsPage, doctorsSearch);
      fetchDashboardStats();
    } catch (err) {
      console.error('Failed to delete doctor:', err);
      setToast({ isOpen: true, type: 'error', message: 'Failed to delete doctor' });
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      if (usersListTab === 'users') {
        fetchUsersList(1, usersSearch);
      } else {
        fetchDoctorsList(1, doctorsSearch);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, usersListTab]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    navigate('/admin/login');
  };

  const submitCreateHospital = async (e) => {
    e.preventDefault();
    setHospitalCreateError('');
    setHospitalCreateSuccess('');
    setHospitalCreateLoading(true);

    try {
      const payload = {
        ...hospitalForm,
        latitude: Number(hospitalForm.latitude),
        longitude: Number(hospitalForm.longitude),
      };
      const res = await api.post('/auth/admin/hospitals', payload);
      setHospitalCreateSuccess(`Hospital created (ID: ${res.data?.hospital?.id})`);
      setAccountModalOpen(false);
      setToast({
        isOpen: true,
        type: 'success',
        message: `Hospital created (ID: ${res.data?.hospital?.id})`,
      });
      setHospitalForm((s) => ({
        ...s,
        name: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        password: '',
        emergency_contact: '',
      }));
    } catch (err) {
      setHospitalCreateError(err?.response?.data?.error || 'Failed to create hospital');
      console.error(err);
    } finally {
      setHospitalCreateLoading(false);
    }
  };

  const submitCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminCreateError('');
    setAdminCreateSuccess('');
    setAdminCreateLoading(true);

    try {
      const res = await api.post('/auth/admin/admins', adminCreateForm);
      setAdminCreateSuccess(`Admin created (ID: ${res.data?.admin?.id})`);
      setAccountModalOpen(false);
      setToast({
        isOpen: true,
        type: 'success',
        message: `Admin created (ID: ${res.data?.admin?.id})`,
      });
      setAdminCreateForm({ name: '', email: '', password: '', role: 'admin' });
    } catch (err) {
      setAdminCreateError(err?.response?.data?.error || 'Failed to create admin');
      console.error(err);
    } finally {
      setAdminCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 font-medium">Admin information not found</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className={`p-2.5 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value || 0}</p>
    </div>
  );

  const AppointmentsChartCard = ({ series, loading, errorText, range, onRangeChange }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current) return;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const labels = (series || []).map((d) => (d.day || '').toString());
      const total = (series || []).map((d) => Number(d.total || 0));
      const pending = (series || []).map((d) => Number(d.pending || 0));
      const confirmed = (series || []).map((d) => Number(d.confirmed || 0));
      const completed = (series || []).map((d) => Number(d.completed || 0));
      const cancelled = (series || []).map((d) => Number(d.cancelled || 0));
      if (!labels.length) return;

      const ctx = canvasRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)'); // blue
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0.04)'); // purple

      chartRef.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Total',
              data: total,
              borderColor: '#2563eb',
              backgroundColor: gradient,
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointBackgroundColor: '#2563eb',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
            {
              label: 'Pending',
              data: pending,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              fill: false,
              tension: 0.35,
              borderWidth: 2,
              borderDash: [6, 4],
              pointRadius: 2,
              pointHoverRadius: 5,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
            {
              label: 'Confirmed',
              data: confirmed,
              borderColor: '#7c3aed',
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              fill: false,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointBackgroundColor: '#7c3aed',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
            {
              label: 'Completed',
              data: completed,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              fill: false,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
            {
              label: 'Cancelled',
              data: cancelled,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              fill: false,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                boxWidth: 8,
                color: '#e2e8f0',
                font: { family: 'ui-sans-serif, system-ui', weight: '600' },
              },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(71, 85, 105, 0.5)',
              borderWidth: 1,
            },
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#94a3b8',
                maxTicksLimit: 7,
                callback: function (val) {
                  const raw = this.getLabelForValue(val);
                  try {
                    const d = new Date(raw);
                    if (Number.isNaN(d.getTime())) return raw;
                    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
                  } catch {
                    return raw;
                  }
                },
              },
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8', precision: 0 },
              grid: { color: 'rgba(148, 163, 184, 0.1)' },
            },
          },
        },
      });

      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, [series]);

    const RangeButton = ({ value, label }) => (
      <button
        onClick={() => onRangeChange(value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
          range === value
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent'
            : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
        }`}
      >
        {label}
      </button>
    );

    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Appointments Analytics</h3>
            <p className="text-sm text-slate-400">Daily bookings + outcomes</p>
          </div>
          <div className="flex items-center gap-2">
            <RangeButton value="7d" label="7D" />
            <RangeButton value="30d" label="30D" />
            <RangeButton value="90d" label="90D" />
          </div>
        </div>

        {errorText && (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {errorText}
          </div>
        )}

        <div className="h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-slate-400 font-medium text-sm">Loading chart…</p>
              </div>
            </div>
          ) : !series.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-500 text-sm">No data available</p>
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      </div>
    );
  };

  const BarChartCard = ({ title, subtitle, labels, values, loading, errorText }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current) return;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      if (!labels?.length) return;

      const ctx = canvasRef.current.getContext('2d');
      const bgColors = (labels || []).map((_, i) => hexToRgba(PALETTE[i % PALETTE.length], 0.22));
      const borderColors = (labels || []).map((_, i) => hexToRgba(PALETTE[i % PALETTE.length], 0.9));
      const hoverColors = (labels || []).map((_, i) => hexToRgba(PALETTE[i % PALETTE.length], 0.32));

      chartRef.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: title,
              data: values,
              backgroundColor: bgColors,
              hoverBackgroundColor: hoverColors,
              borderColor: borderColors,
              borderWidth: 1,
              borderRadius: 12,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { 
              intersect: false,
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(71, 85, 105, 0.5)',
              borderWidth: 1,
            },
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8', precision: 0 }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
          },
        },
      });

      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, [labels, values, title]);

    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
        </div>

        {errorText ? (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm">{errorText}</div>
        ) : null}

        <div className="h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-slate-400 font-medium text-sm">Loading chart…</p>
              </div>
            </div>
          ) : !labels?.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-500 text-sm">No data available</p>
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      </div>
    );
  };

  const SimpleLineChartCard = ({ title, subtitle, labels, datasets, loading, errorText }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
      if (!canvasRef.current) return;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      if (!labels?.length) return;

      const ctx = canvasRef.current.getContext('2d');

      const normalized = (datasets || []).map((ds, i) => {
        const c = ds.borderColor || PALETTE[i % PALETTE.length];
        const wantsFill = ds.fill === true;
        return {
          ...ds,
          borderColor: c,
          backgroundColor:
            ds.backgroundColor || (wantsFill ? hexToRgba(c, 0.14) : hexToRgba(c, 0.06)),
          borderWidth: ds.borderWidth || 2,
          pointRadius: ds.pointRadius ?? 2,
          pointHoverRadius: ds.pointHoverRadius ?? 5,
          pointBackgroundColor: ds.pointBackgroundColor || c,
          pointBorderColor: ds.pointBorderColor || '#ffffff',
          pointBorderWidth: ds.pointBorderWidth || 2,
          tension: ds.tension ?? 0.35,
        };
      });

      chartRef.current = new ChartJS(ctx, {
        type: 'line',
        data: { labels, datasets: normalized },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                boxWidth: 8,
                color: '#e2e8f0',
                font: { family: 'ui-sans-serif, system-ui', weight: '600' },
              },
            },
            tooltip: {
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(71, 85, 105, 0.5)',
              borderWidth: 1,
            },
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 7 } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8', precision: 0 }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
          },
        },
      });

      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, [labels, datasets]);

    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
        </div>

        {errorText ? (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm">{errorText}</div>
        ) : null}

        <div className="h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-slate-400 font-medium text-sm">Loading chart…</p>
              </div>
            </div>
          ) : !labels?.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-500 text-sm">No data available</p>
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast.isOpen ? (
          <div className="fixed top-5 right-5 z-[60]">
            <div
              className={`shadow-xl border rounded-xl px-4 py-3 flex items-start gap-3 bg-slate-800 ${
                toast.type === 'success' ? 'border-green-500/50' : 'border-slate-600'
              }`}
            >
              <div
                className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                  toast.type === 'success' ? 'bg-green-500' : 'bg-slate-500'
                }`}
              />
              <div className="min-w-[220px]">
                <div className="text-sm font-semibold text-white">Success</div>
                <div className="text-sm text-slate-300 mt-0.5">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => setToast((s) => ({ ...s, isOpen: false }))}
                className="ml-2 text-slate-400 hover:text-slate-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}

        {/* Welcome Banner */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-2xl shadow-purple-900/30 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-20 -mb-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome, {admin.name}!</h1>
              <p className="text-blue-100 text-lg">PocketCare Administration Panel</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition text-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex space-x-2 bg-slate-800/50 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-slate-700/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Users className="w-4 h-4" /> Users & Doctors
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Settings className="w-4 h-4" /> System
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Analytics
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700/50 text-red-400 px-6 py-4 rounded-xl flex items-center gap-3">
            <Siren className="w-5 h-5" />
            <div>{error}</div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Key Stats Grid */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Key Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Users"
                  value={stats.total_users}
                  icon={Users}
                  color="text-blue-400"
                  bgColor="bg-blue-500/20"
                />
                <StatCard
                  title="Active Doctors"
                  value={stats.total_doctors}
                  icon={Stethoscope}
                  color="text-emerald-400"
                  bgColor="bg-emerald-500/20"
                />
                <StatCard
                  title="Pending Appointments"
                  value={stats.pending_appointments}
                  icon={CalendarClock}
                  color="text-amber-400"
                  bgColor="bg-amber-500/20"
                />
                <StatCard
                  title="SOS Alerts"
                  value={stats.active_sos_alerts}
                  icon={Siren}
                  color="text-red-400"
                  bgColor="bg-red-500/20"
                />
              </div>
            </div>

            {/* Secondary Metrics */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">System Activity</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Medical Reports</h3>
                    <div className="p-2.5 rounded-xl bg-indigo-500/20">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{stats.total_reports}</p>
                  <p className="text-sm text-slate-400 mb-4">Total reviewed</p>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">AI Chat Activity</h3>
                    <div className="p-2.5 rounded-xl bg-purple-500/20">
                      <MessageSquare className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{stats.chats_today}</p>
                  <p className="text-sm text-slate-400 mb-4">Chats today</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Activity className="w-3 h-3 mr-1.5" /> Live
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">System Status</h3>
                    <div className="p-2.5 rounded-xl bg-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-emerald-400 mb-2">98%</p>
                  <p className="text-sm text-slate-400 mb-4">Uptime (30 days)</p>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Healthy
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments Chart Preview */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Appointments Overview</h3>
                    <p className="text-xs text-slate-400">Last {analyticsRange === '7d' ? '7 days' : analyticsRange === '30d' ? '30 days' : analyticsRange === '90d' ? '90 days' : '1 year'}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="px-3 py-1.5 rounded-lg font-medium text-xs text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 shadow-lg"
                  >
                    View All Analytics
                  </button>
                </div>
                <div className="p-4">
                  <AppointmentsChartCard
                    series={apptSeries}
                    loading={analyticsLoading}
                    errorText={''}
                    range={analyticsRange}
                    onRangeChange={setAnalyticsRange}
                  />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Activities</h3>
                <div className="space-y-4">
                  {[
                    { action: 'New user registered', time: '2 minutes ago', icon: UserPlus, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
                    { action: 'Appointment scheduled', time: '15 minutes ago', icon: CalendarClock, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
                    { action: 'SOS alert received', time: '1 hour ago', icon: Siren, color: 'text-red-400', bgColor: 'bg-red-500/20' },
                    { action: 'Medical report uploaded', time: '2 hours ago', icon: Upload, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
                    { action: 'Doctor login', time: '3 hours ago', icon: Stethoscope, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
                  ].map((activity, i) => {
                    const IconComponent = activity.icon;
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 transition-colors">
                        <div className={`p-2 rounded-lg ${activity.bgColor}`}>
                          <IconComponent className={`w-4 h-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{activity.action}</p>
                          <p className="text-xs text-slate-500">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Analytics</h2>
                <p className="text-sm text-slate-400">Charts across doctors, chats, reports, symptoms, and weight.</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 shadow-lg border border-slate-700/50">
                {[
                  { v: '7d', t: '7 Days' },
                  { v: '30d', t: '30 Days' },
                  { v: '90d', t: '90 Days' },
                ].map((x) => (
                  <button
                    key={x.v}
                    onClick={() => setAnalyticsRange(x.v)}
                    className={`px-4 py-2 rounded-md font-semibold text-sm transition ${
                      analyticsRange === x.v
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {x.t}
                  </button>
                ))}
              </div>
            </div>

            {analyticsError ? (
              <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-6 py-4 rounded-xl">{analyticsError}</div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm font-medium">Total Appointments</p>
                <p className="mt-2 text-3xl font-bold text-white">{(apptSeries || []).reduce((sum, d) => sum + Number(d.total || 0), 0)}</p>
                <p className="mt-2 text-xs text-slate-500">In selected time period</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm font-medium">Active weight goals</p>
                <p className="mt-2 text-3xl font-bold text-white">{weightActiveGoals}</p>
                <p className="mt-2 text-xs text-slate-500">Users currently tracking a goal</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm font-medium">Avg check-ins / user / week</p>
                <p className="mt-2 text-3xl font-bold text-white">{Number(weightAvgCheckins || 0).toFixed(2)}</p>
                <p className="mt-2 text-xs text-slate-500">Weight entries in selected range</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AppointmentsChartCard
                series={apptSeries}
                loading={analyticsLoading}
                errorText={''}
                range={analyticsRange}
                onRangeChange={setAnalyticsRange}
              />

              <BarChartCard
                title="Doctor Specialty Distribution"
                subtitle="How many doctors per specialty"
                labels={(specialtiesDistribution || []).map((r) => String(r.specialty || 'Unknown'))}
                values={(specialtiesDistribution || []).map((r) => Number(r.doctors || 0))}
                loading={analyticsLoading}
                errorText={''}
              />

              <BarChartCard
                title="Appointments by Specialty"
                subtitle="Demand per specialty (appointments created)"
                labels={(specialtiesDemand || []).map((r) => String(r.specialty || 'Unknown'))}
                values={(specialtiesDemand || []).map((r) => Number(r.appointments || 0))}
                loading={analyticsLoading}
                errorText={''}
              />

              <BarChartCard
                title="Top Doctors"
                subtitle="Most appointments in selected range"
                labels={(doctorTop || []).map((r) => String(r.name || 'Doctor'))}
                values={(doctorTop || []).map((r) => Number(r.appointments || 0))}
                loading={analyticsLoading}
                errorText={''}
              />

              <SimpleLineChartCard
                title="Chat Sessions"
                subtitle="AI chats + consultation threads per day"
                labels={(chatSeries || []).map((d) => String(d.day || ''))}
                datasets={[
                  {
                    label: 'AI sessions',
                    data: (chatSeries || []).map((d) => Number(d.ai_sessions || 0)),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.10)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                  {
                    label: 'Consultation threads',
                    data: (chatSeries || []).map((d) => Number(d.consult_threads || 0)),
                    borderColor: '#9333ea',
                    backgroundColor: 'rgba(147, 51, 234, 0.08)',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                ]}
                loading={analyticsLoading}
                errorText={''}
              />

              <SimpleLineChartCard
                title="Medical Reports"
                subtitle="Uploads per day + AI simplifications"
                labels={(reportSeries || []).map((d) => String(d.day || ''))}
                datasets={[
                  {
                    label: 'Uploads',
                    data: (reportSeries || []).map((d) => Number(d.total || 0)),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.10)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                  {
                    label: 'AI simplified',
                    data: (reportSeries || []).map((d) => Number(d.ai_simplified || 0)),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                ]}
                loading={analyticsLoading}
                errorText={''}
              />

              <SimpleLineChartCard
                title="Symptom Checks"
                subtitle="Total checks per day (with urgency split)"
                labels={(symptomSeries || []).map((d) => String(d.day || ''))}
                datasets={[
                  {
                    label: 'Total',
                    data: (symptomSeries || []).map((d) => Number(d.total || 0)),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.10)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                  {
                    label: 'High urgency',
                    data: (symptomSeries || []).map((d) => Number(d.high || 0)),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                  },
                ]}
                loading={analyticsLoading}
                errorText={''}
              />

              <BarChartCard
                title="Weight Check-ins"
                subtitle="Entries per week"
                labels={(weightWeekly || []).map((w) => String(w.week || ''))}
                values={(weightWeekly || []).map((w) => Number(w.entries || 0))}
                loading={analyticsLoading}
                errorText={''}
              />
            </div>

            <div className="text-xs text-slate-500">
              Notes: Doctor approval funnel, OCR confidence, processing time, and chat escalation rate require extra fields/logging (not currently stored).
            </div>
          </div>
        )}

        {/* Users & Doctors Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold text-white mb-2">Users & Doctors Management</h2>
              <p className="text-slate-400">Platform totals and account creation.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="p-6 bg-blue-500/10 rounded-xl border border-blue-500/30">
                  <p className="text-4xl font-bold text-blue-400 mb-2">{stats?.total_users || 0}</p>
                  <p className="text-slate-300 font-medium">Total Users</p>
                </div>
                <div className="p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-4xl font-bold text-emerald-400 mb-2">{stats?.total_doctors || 0}</p>
                  <p className="text-slate-300 font-medium">Total Doctors</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-slate-700/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Account Creation</h3>
                  <p className="text-sm text-slate-400 mt-1">Create Hospital or Admin accounts from a modal.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountModalTab('hospital');
                      setHospitalCreateError('');
                      setHospitalCreateSuccess('');
                      setAdminCreateError('');
                      setAdminCreateSuccess('');
                      setAccountModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 shadow-lg"
                  >
                    + Create Account
                  </button>
                  <a
                    href="/hospital/login"
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600"
                  >
                    Hospital Login
                  </a>
                </div>
              </div>
            </div>

            {/* Users & Doctors List */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-slate-700/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1 border border-slate-600/50">
                  <button
                    type="button"
                    onClick={() => setUsersListTab('users')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition flex items-center gap-1.5 ${
                      usersListTab === 'users'
                        ? 'bg-slate-600 shadow text-blue-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4" /> Users ({stats?.total_users || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsersListTab('doctors')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition flex items-center gap-1.5 ${
                      usersListTab === 'doctors'
                        ? 'bg-slate-600 shadow text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" /> Doctors ({stats?.total_doctors || 0})
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Search ${usersListTab}...`}
                    className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm w-64 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={usersListTab === 'users' ? usersSearch : doctorsSearch}
                    onChange={(e) => {
                      if (usersListTab === 'users') {
                        setUsersSearch(e.target.value);
                      } else {
                        setDoctorsSearch(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (usersListTab === 'users') {
                          fetchUsersList(1, usersSearch);
                        } else {
                          fetchDoctorsList(1, doctorsSearch);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (usersListTab === 'users') {
                        fetchUsersList(1, usersSearch);
                      } else {
                        fetchDoctorsList(1, doctorsSearch);
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Users List */}
              {usersListTab === 'users' && (
                <div>
                  {usersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : usersList.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No users found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700/50 border-b border-slate-600">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Phone</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Joined</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((user) => (
                            <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                              <td className="px-4 py-3 text-slate-400">#{user.id}</td>
                              <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                              <td className="px-4 py-3 text-slate-400">{user.email}</td>
                              <td className="px-4 py-3 text-slate-400">{user.phone || '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  user.is_blocked 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {user.is_blocked ? 'Blocked' : 'Active'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleBlockUser(user.id, !user.is_blocked)}
                                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                      user.is_blocked
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                                    }`}
                                  >
                                    {user.is_blocked ? 'Unblock' : 'Block'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmModal({ open: true, type: 'user', id: user.id, name: user.name, action: 'delete' })}
                                    className="px-3 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Pagination */}
                  {usersTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => fetchUsersList(usersPage - 1, usersSearch)}
                        disabled={usersPage <= 1}
                        className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm disabled:opacity-50 hover:bg-slate-600 border border-slate-600"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-400">Page {usersPage} of {usersTotalPages}</span>
                      <button
                        onClick={() => fetchUsersList(usersPage + 1, usersSearch)}
                        disabled={usersPage >= usersTotalPages}
                        className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm disabled:opacity-50 hover:bg-slate-600 border border-slate-600"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Doctors List */}
              {usersListTab === 'doctors' && (
                <div>
                  {doctorsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : doctorsList.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No doctors found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700/50 border-b border-slate-600">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">ID</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Specialty</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Rating</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorsList.map((doctor) => (
                            <tr key={doctor.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                              <td className="px-4 py-3 text-slate-400">#{doctor.id}</td>
                              <td className="px-4 py-3 font-medium text-white">{doctor.name}</td>
                              <td className="px-4 py-3 text-slate-400">{doctor.email}</td>
                              <td className="px-4 py-3 text-slate-400">{doctor.specialty || '-'}</td>
                              <td className="px-4 py-3 text-amber-400 flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400" /> {doctor.rating || 0}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  doctor.is_blocked 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {doctor.is_blocked ? 'Blocked' : 'Active'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleBlockDoctor(doctor.id, !doctor.is_blocked)}
                                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                      doctor.is_blocked
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                                    }`}
                                  >
                                    {doctor.is_blocked ? 'Unblock' : 'Block'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmModal({ open: true, type: 'doctor', id: doctor.id, name: doctor.name, action: 'delete' })}
                                    className="px-3 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Pagination */}
                  {doctorsTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => fetchDoctorsList(doctorsPage - 1, doctorsSearch)}
                        disabled={doctorsPage <= 1}
                        className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm disabled:opacity-50 hover:bg-slate-600 border border-slate-600"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-400">Page {doctorsPage} of {doctorsTotalPages}</span>
                      <button
                        onClick={() => fetchDoctorsList(doctorsPage + 1, doctorsSearch)}
                        disabled={doctorsPage >= doctorsTotalPages}
                        className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm disabled:opacity-50 hover:bg-slate-600 border border-slate-600"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.open && (
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center px-4">
                  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmModal({ open: false, type: '', id: null, name: '', action: '' })} />
                  <div className="relative bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-2">Confirm Delete</h3>
                    <p className="text-slate-400 mb-6">
                      Are you sure you want to delete <span className="font-semibold text-white">{confirmModal.name}</span>? This action cannot be undone.
                    </p>
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => setConfirmModal({ open: false, type: '', id: null, name: '', action: '' })}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 border border-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (confirmModal.type === 'user') {
                            handleDeleteUser(confirmModal.id);
                          } else {
                            handleDeleteDoctor(confirmModal.id);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {accountModalOpen ? (
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                    onClick={() => setAccountModalOpen(false)}
                  />

                  <div className="inline-block transform overflow-hidden rounded-2xl bg-slate-800 text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle border border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Create Account</h3>
                        <p className="text-xs text-slate-400 mt-1">Choose Hospital or Admin.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAccountModalOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold border border-slate-600"
                      >
                        Close
                      </button>
                    </div>

                    <div className="px-6 pt-5">
                      <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1 border border-slate-600/50">
                        <button
                          type="button"
                          onClick={() => setAccountModalTab('hospital')}
                          className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                            accountModalTab === 'hospital'
                              ? 'bg-slate-600 shadow text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Hospital Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountModalTab('admin')}
                          className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                            accountModalTab === 'admin'
                              ? 'bg-slate-600 shadow text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Admin Account
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-6">
                      {accountModalTab === 'hospital' ? (
                        <div>
                          {hospitalCreateError ? (
                            <div className="mb-4 bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                              {hospitalCreateError}
                            </div>
                          ) : null}
                          {hospitalCreateSuccess ? (
                            <div className="mb-4 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 px-4 py-3 rounded-lg text-sm">
                              {hospitalCreateSuccess}
                            </div>
                          ) : null}

                          <form onSubmit={submitCreateHospital} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Hospital Name *</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.name}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, name: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Email (Login) *</label>
                                <input
                                  type="email"
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.email}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, email: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Password *</label>
                                <input
                                  type="password"
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.password}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, password: e.target.value }))}
                                  required
                                />
                                <p className="text-xs text-slate-500 mt-1">Use 8+ chars with uppercase, lowercase, number, symbol.</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Phone</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.phone}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, phone: e.target.value }))}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Address *</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.address}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, address: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">City</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.city}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, city: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">State</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.state}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, state: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Emergency Contact</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={hospitalForm.emergency_contact}
                                  onChange={(e) => setHospitalForm((s) => ({ ...s, emergency_contact: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-300 mb-2">Location (Mini Map) *</label>
                              <LocationPickerMap
                                value={{ lat: hospitalForm.latitude, lng: hospitalForm.longitude }}
                                onChange={(v) =>
                                  setHospitalForm((s) => ({
                                    ...s,
                                    latitude: v?.lat,
                                    longitude: v?.lng,
                                  }))
                                }
                                height={320}
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                disabled={hospitalCreateLoading}
                                className="px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 disabled:opacity-60 shadow-lg"
                              >
                                {hospitalCreateLoading ? 'Creating...' : 'Create Hospital Account'}
                              </button>
                              <div className="text-xs text-slate-500">Saves credentials + latitude/longitude.</div>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div>
                          {adminCreateError ? (
                            <div className="mb-4 bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                              {adminCreateError}
                            </div>
                          ) : null}
                          {adminCreateSuccess ? (
                            <div className="mb-4 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 px-4 py-3 rounded-lg text-sm">
                              {adminCreateSuccess}
                            </div>
                          ) : null}

                          <form onSubmit={submitCreateAdmin} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Name *</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={adminCreateForm.name}
                                  onChange={(e) => setAdminCreateForm((s) => ({ ...s, name: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Email *</label>
                                <input
                                  type="email"
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={adminCreateForm.email}
                                  onChange={(e) => setAdminCreateForm((s) => ({ ...s, email: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Password *</label>
                                <input
                                  type="password"
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={adminCreateForm.password}
                                  onChange={(e) => setAdminCreateForm((s) => ({ ...s, password: e.target.value }))}
                                  required
                                />
                                <p className="text-xs text-slate-500 mt-1">Use 8+ chars with uppercase, lowercase, number, symbol.</p>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Role</label>
                                <input
                                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={adminCreateForm.role}
                                  onChange={(e) => setAdminCreateForm((s) => ({ ...s, role: e.target.value }))}
                                  placeholder="admin"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                disabled={adminCreateLoading}
                                className="px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 disabled:opacity-60 shadow-lg"
                              >
                                {adminCreateLoading ? 'Creating...' : 'Create Admin Account'}
                              </button>
                              <div className="text-xs text-slate-500">Creates another admin user.</div>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold text-white mb-6">System Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-slate-400">API Status</p>
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <Server className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <p className="text-2xl font-bold text-emerald-400">Running</p>
                  </div>
                  <p className="text-xs text-slate-500">Version: 1.0.0</p>
                </div>
                <div className="p-6 bg-slate-700/30 rounded-xl border border-slate-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-slate-400">Database Status</p>
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Database className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <p className="text-2xl font-bold text-emerald-400">Connected</p>
                  </div>
                  <p className="text-xs text-slate-500">MySQL 8.0</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold text-white mb-6">Admin Profile</h2>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/30">
                  {admin.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{admin.name}</p>
                  <p className="text-slate-400">{admin.email}</p>
                  <p className="text-sm text-slate-500 mt-2">Role: {admin.role || 'Administrator'}</p>
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
