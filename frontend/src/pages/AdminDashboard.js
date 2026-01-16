import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
  const [doctorZero, setDoctorZero] = useState(0);
  const [chatSeries, setChatSeries] = useState([]);
  const [reportSeries, setReportSeries] = useState([]);
  const [symptomSeries, setSymptomSeries] = useState([]);
  const [weightWeekly, setWeightWeekly] = useState([]);
  const [weightActiveGoals, setWeightActiveGoals] = useState(0);
  const [weightAvgCheckins, setWeightAvgCheckins] = useState(0);

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
      setDoctorZero(Number(docRes.data?.doctors_with_zero_appointments || 0));

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
                color: '#111827',
                font: { family: 'ui-sans-serif, system-ui', weight: '600' },
              },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
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
                color: '#6b7280',
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
              ticks: { color: '#6b7280', precision: 0 },
              grid: { color: 'rgba(17, 24, 39, 0.06)' },
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
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`}
      >
        {label}
      </button>
    );

    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Appointments Analytics</h3>
            <p className="text-sm text-gray-600">Daily bookings + outcomes</p>
          </div>
          <div className="flex items-center gap-2">
            <RangeButton value="7d" label="7D" />
            <RangeButton value="30d" label="30D" />
            <RangeButton value="90d" label="90D" />
          </div>
        </div>

        {errorText && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {errorText}
          </div>
        )}

        <div className="h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium text-sm">Loading chart…</p>
              </div>
            </div>
          ) : !series.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-600 text-sm">No data available</p>
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
            tooltip: { intersect: false },
          },
          scales: {
            x: { ticks: { color: '#6b7280' }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#6b7280', precision: 0 }, grid: { color: 'rgba(17, 24, 39, 0.06)' } },
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
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-sm text-gray-600">{subtitle}</p> : null}
        </div>

        {errorText ? (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{errorText}</div>
        ) : null}

        <div className="h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium text-sm">Loading chart…</p>
              </div>
            </div>
          ) : !labels?.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-600 text-sm">No data available</p>
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
                color: '#111827',
                font: { family: 'ui-sans-serif, system-ui', weight: '600' },
              },
            },
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxTicksLimit: 7 } },
            y: { beginAtZero: true, ticks: { color: '#6b7280', precision: 0 }, grid: { color: 'rgba(17, 24, 39, 0.06)' } },
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
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-sm text-gray-600">{subtitle}</p> : null}
        </div>

        {errorText ? (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{errorText}</div>
        ) : null}

        <div className="h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium text-sm">Loading chart…</p>
              </div>
            </div>
          ) : !labels?.length ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-600 text-sm">No data available</p>
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      </div>
    );
  };

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
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ⚙️ System
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📈 Analytics
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Analytics teaser (moved to Analytics tab) */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                    <p className="text-sm text-gray-600">Open the Analytics tab to view charts.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95"
                  >
                    View Analytics
                  </button>
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

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
                <p className="text-sm text-gray-600">Charts across doctors, chats, reports, symptoms, and weight.</p>
              </div>

              <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
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
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {x.t}
                  </button>
                ))}
              </div>
            </div>

            {analyticsError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">{analyticsError}</div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Doctors with 0 appointments</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{doctorZero}</p>
                <p className="mt-2 text-xs text-gray-500">Based on lifetime appointment history</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Active weight goals</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{weightActiveGoals}</p>
                <p className="mt-2 text-xs text-gray-500">Users currently tracking a goal</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <p className="text-gray-600 text-sm font-medium">Avg check-ins / user / week</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{Number(weightAvgCheckins || 0).toFixed(2)}</p>
                <p className="mt-2 text-xs text-gray-500">Weight entries in selected range</p>
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

            <div className="text-xs text-gray-500">
              Notes: Doctor approval funnel, OCR confidence, processing time, and chat escalation rate require extra fields/logging (not currently stored).
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
