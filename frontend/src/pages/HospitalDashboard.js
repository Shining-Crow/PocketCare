import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts';
import {
  Activity,
  Bed,
  Building2,
  CalendarCheck2,
  ClipboardList,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Users,
} from 'lucide-react';
import HospitalBedManagement from './HospitalBedManagement';
import HospitalDoctorsManagement from './HospitalDoctorsManagement';
import HospitalAppointments from './HospitalAppointments';
import HospitalEmergencySOS from './HospitalEmergencySOS';
import Footer from '../components/Footer';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [stats, setStats] = useState({
    bedAvailability: { total: 0, occupied: 0, available: 0 },
    appointments: { today: 0, upcoming: 0, completed: 0 },
    finances: { revenue: 0, pending: 0 },
    doctors: { total: 0, available: 0, specialties: 0 },
    privateRooms: { total: 0, available: 0, occupied: 0, reserved: 0 },
    patients: { today: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [patientsToday, setPatientsToday] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [sosSummary, setSosSummary] = useState({ pending: 0, assigned: 0 });

  const [occupancyData, setOccupancyData] = useState([]);

  const [departmentData, setDepartmentData] = useState([]);

  const [bedAvailability, setBedAvailability] = useState([]);

  const formatCompactNumber = (value) => {
    const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(safe);
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const fetchHospitalData = useCallback(async (hospitalId) => {
    try {
      setLoading(true);
      const hospitalToken = localStorage.getItem('hospitalToken');
      const authHeaders = hospitalToken ? { Authorization: `Bearer ${hospitalToken}` } : undefined;

      const allReq = fetch(`http://localhost:5000/api/hospital-dashboard/all?hospital_id=${hospitalId}`);
      const statsReq = fetch(`http://localhost:5000/api/hospital-dashboard/stats?hospital_id=${hospitalId}`);
      const recentReq = fetch(`http://localhost:5000/api/hospital-dashboard/recent-appointments?hospital_id=${hospitalId}&limit=6`);
      const sosReq = hospitalToken
        ? fetch(`http://localhost:5000/api/hospital/emergency/requests?include_assigned=1`, { headers: authHeaders })
        : null;

      const [allRes, statsRes, recentRes, sosRes] = await Promise.allSettled([
        allReq,
        statsReq,
        recentReq,
        sosReq,
      ]);

      const safeJson = async (res) => {
        if (!res || !res.ok) return null;
        try {
          return await res.json();
        } catch {
          return null;
        }
      };

      const allData = allRes.status === 'fulfilled' ? await safeJson(allRes.value) : null;
      const statsData = statsRes.status === 'fulfilled' ? await safeJson(statsRes.value) : null;
      const recentData = recentRes.status === 'fulfilled' ? await safeJson(recentRes.value) : null;
      const sosData = sosRes && sosRes.status === 'fulfilled' ? await safeJson(sosRes.value) : null;

      const mergedHospital = {
        ...(allData?.hospital || {}),
        ...(statsData?.hospital || {}),
      };
      if (Object.keys(mergedHospital).length) {
        setHospital((prev) => ({
          ...(prev || {}),
          ...mergedHospital,
        }));
      }

      if (allData?.stats || statsData?.stats) {
        setStats((prev) => ({
          ...prev,
          ...(allData?.stats || {}),
          ...(statsData?.stats || {}),
        }));
      }

      if (allData?.occupancyData?.length) setOccupancyData(allData.occupancyData);

      if (allData?.departmentData?.length) {
        setDepartmentData(allData.departmentData);
      } else if (statsData?.departmentDistribution?.length) {
        setDepartmentData(
          statsData.departmentDistribution.map((row) => ({
            name: row?.department || row?.name || 'Department',
            patients: row?.count ?? row?.patients ?? 0,
          }))
        );
      }

      if (allData?.bedAvailability?.length) setBedAvailability(allData.bedAvailability);

      const patientsTodayValue =
        statsData?.stats?.patients?.today ??
        allData?.patientsToday ??
        0;
      setPatientsToday(patientsTodayValue);

      if (recentData?.success && Array.isArray(recentData?.appointments)) {
        setRecentAppointments(recentData.appointments);
      } else {
        setRecentAppointments([]);
      }

      if (sosData && (Array.isArray(sosData.pending) || Array.isArray(sosData.assigned))) {
        setSosSummary({
          pending: Array.isArray(sosData.pending) ? sosData.pending.length : 0,
          assigned: Array.isArray(sosData.assigned) ? sosData.assigned.length : 0,
        });
      } else {
        setSosSummary({ pending: 0, assigned: 0 });
      }

      setLastUpdatedAt(new Date());
      setLoading(false);
    } catch (error) {
      console.warn('Error fetching hospital data, using default mock data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hospitalToken = localStorage.getItem('hospitalToken');
    const hospitalInfo = localStorage.getItem('hospitalInfo');

    if (!hospitalToken || !hospitalInfo) {
      navigate('/hospital/login');
      return;
    }

    const parsedHospital = JSON.parse(hospitalInfo);
    setHospital(parsedHospital);
    fetchHospitalData(parsedHospital.id);
  }, [navigate, fetchHospitalData]);

  // Refetch data when switching back to overview tab
  useEffect(() => {
    if (activeTab === 'overview' && hospital?.id) {
      fetchHospitalData(hospital.id);
    }
  }, [activeTab, hospital?.id, fetchHospitalData]);

  const handleLogout = () => {
    localStorage.removeItem('hospitalToken');
    localStorage.removeItem('hospitalInfo');
    navigate('/');
  };

  const KpiCard = ({ title, value, subtitle, icon: Icon, tone = 'blue' }) => {
    const tones = {
      blue: 'from-blue-500 to-indigo-600',
      emerald: 'from-emerald-500 to-teal-600',
      amber: 'from-amber-500 to-orange-600',
      rose: 'from-rose-500 to-red-600',
      violet: 'from-violet-500 to-purple-600',
      slate: 'from-slate-600 to-slate-800',
    };

    const gradient = tones[tone] || tones.blue;

    return (
      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br opacity-10 blur-2xl" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</div>
            <div className="mt-2 text-3xl font-extrabold text-gray-900 truncate">{value}</div>
            {subtitle ? <div className="mt-1 text-sm text-gray-600">{subtitle}</div> : null}
          </div>
          <div className={`shrink-0 rounded-2xl bg-gradient-to-br ${gradient} p-3 shadow-sm`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    );
  };

  const StatusBadge = ({ value }) => {
    const key = String(value || '').toLowerCase();
    const styles =
      key === 'completed'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : key === 'confirmed'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : key === 'pending'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : key === 'cancelled'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-gray-50 text-gray-700 border-gray-200';

    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>
        {String(value || 'unknown').toUpperCase()}
      </span>
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
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-3">
              {/* Left: Brand */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-sm">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-gray-900 truncate">PocketCare Hospital</div>
                  <div className="text-xs text-gray-500 truncate">{hospital?.name || 'Hospital workspace'}</div>
                </div>
              </div>

              {/* Center: Tabs */}
              <div className="hidden md:flex flex-1 justify-center">
                <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeTab === 'overview'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('appointments')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeTab === 'appointments'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CalendarCheck2 className="h-4 w-4" />
                    Appointments
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('beds')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeTab === 'beds'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bed className="h-4 w-4" />
                    Beds
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('doctors')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeTab === 'doctors'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Stethoscope className="h-4 w-4" />
                    Doctors
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('emergency')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeTab === 'emergency'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    SOS
                  </button>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                  <div className="h-9 w-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-bold">H</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[180px]">
                      {hospital?.name || 'Hospital'}
                    </div>
                    <div className="text-xs text-gray-500 leading-tight">Administrator</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile tabs */}
            <div className="md:hidden pb-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'appointments', label: 'Appointments' },
                  { id: 'beds', label: 'Beds' },
                  { id: 'doctors', label: 'Doctors' },
                  { id: 'emergency', label: 'SOS' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      activeTab === t.id
                        ? t.id === 'emergency'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-gray-200 bg-white text-gray-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Overview header */}
              <div className="mb-8">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hospital dashboard</div>
                      <div className="mt-1 text-2xl font-extrabold text-gray-900 truncate">
                        {hospital?.name || 'Hospital Overview'}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Overview & operations
                        </span>
                        {lastUpdatedAt ? (
                          <span className="text-gray-500">Last updated {formatDateTime(lastUpdatedAt)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => hospital?.id && fetchHospitalData(hospital.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('emergency')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Emergency
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI grid + snapshot */}
              {(() => {
                const totalBeds = stats?.bedAvailability?.total ?? 0;
                const occupiedBedsRaw = Number(stats?.bedAvailability?.occupied ?? 0);
                const reservedBedsRaw = Number(stats?.bedAvailability?.reserved ?? 0);

                // Business rule: reserved counts as occupied (blocked inventory).
                const occupiedBeds = Math.max(0, occupiedBedsRaw + reservedBedsRaw);
                const availableBeds = Math.max(0, Number(totalBeds) - occupiedBeds);
                const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / Number(totalBeds)) * 100) : 0;

                const appt = stats?.appointments || {};
                const rooms = stats?.privateRooms || {};

                const totalRooms = Number(rooms.total ?? 0);
                const occupiedRooms = Math.max(0, Number(rooms.occupied ?? 0) + Number(rooms.reserved ?? 0));
                const availableRooms = Math.max(0, totalRooms - occupiedRooms);

                const occupancyDonut = [
                  { name: 'Occupied', value: Math.max(0, occupiedBeds) },
                  { name: 'Available', value: Math.max(0, availableBeds) },
                ].filter((d) => d.value > 0);

                const occupancyColors = ['#ef4444', '#10b981'];

                const deptTop = Array.isArray(departmentData)
                  ? [...departmentData]
                      .map((d) => ({
                        name: d?.name || 'Department',
                        patients: d?.patients ?? 0,
                      }))
                      .sort((a, b) => (b.patients || 0) - (a.patients || 0))
                      .slice(0, 6)
                  : [];

                const hasDeptData = deptTop.some((d) => Number(d?.patients || 0) > 0);
                const hasOccupancyTrend = Array.isArray(occupancyData)
                  && occupancyData.length > 0
                  && occupancyData.some((row) =>
                    Object.keys(row || {}).some((key) => key !== 'name' && Number(row?.[key] || 0) > 0)
                  );

                return (
                  <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start mb-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <KpiCard
                            title="Patients today"
                            value={formatCompactNumber(stats?.patients?.today ?? patientsToday)}
                            subtitle="Based on today’s appointments"
                            icon={Users}
                            tone="blue"
                          />
                          <KpiCard
                            title="Appointments today"
                            value={formatCompactNumber(appt.today ?? 0)}
                            subtitle={`${formatCompactNumber(appt.upcoming ?? 0)} upcoming`}
                            icon={CalendarCheck2}
                            tone="violet"
                          />
                          <KpiCard
                            title="Bed occupancy"
                            value={`${occupancyPct}%`}
                            subtitle={`${formatCompactNumber(availableBeds)} beds available`}
                            icon={Bed}
                            tone="emerald"
                          />
                          <KpiCard
                            title="SOS queue"
                            value={formatCompactNumber((sosSummary?.pending ?? 0) + (sosSummary?.assigned ?? 0))}
                            subtitle={`${formatCompactNumber(sosSummary?.pending ?? 0)} pending • ${formatCompactNumber(sosSummary?.assigned ?? 0)} assigned`}
                            icon={ShieldAlert}
                            tone="rose"
                          />
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-gray-900">Occupancy trend</div>
                              <div className="mt-1 text-xs text-gray-500">Last 7 days • Ward utilization (%)</div>
                            </div>
                            <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                              <Activity className="h-4 w-4" />
                              Utilization
                            </div>
                          </div>

                          <div className="mt-4">
                            {hasOccupancyTrend ? (
                              <ResponsiveContainer width="100%" height={240} minHeight={240}>
                                <LineChart data={occupancyData || []}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis domain={[0, 10]} />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="general" stroke="#3B82F6" strokeWidth={2} dot={false} />
                                  <Line type="monotone" dataKey="icu" stroke="#10B981" strokeWidth={2} dot={false} />
                                  <Line type="monotone" dataKey="emergency" stroke="#EF4444" strokeWidth={2} dot={false} />
                                  <Line type="monotone" dataKey="pediatrics" stroke="#F59E0B" strokeWidth={2} dot={false} />
                                  <Line type="monotone" dataKey="maternity" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                                No occupancy trend data yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-gray-900">Operational snapshot</div>
                          <div className="text-xs text-gray-500">Live</div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="text-xs font-semibold text-gray-600">Beds</div>
                            <div className="mt-1 text-xl font-extrabold text-gray-900">{formatCompactNumber(totalBeds)}</div>
                            <div className="mt-3 space-y-2">
                              <div className="flex justify-between text-xs text-gray-600"><span>Available</span><span className="font-semibold text-gray-800">{formatCompactNumber(availableBeds)}</span></div>
                              <div className="flex justify-between text-xs text-gray-600"><span>Occupied</span><span className="font-semibold text-gray-800">{formatCompactNumber(occupiedBeds)}</span></div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="text-xs font-semibold text-gray-600">Private rooms</div>
                            <div className="mt-1 text-xl font-extrabold text-gray-900">{formatCompactNumber(totalRooms)}</div>
                            <div className="mt-3 space-y-2">
                              <div className="flex justify-between text-xs text-gray-600"><span>Available</span><span className="font-semibold text-gray-800">{formatCompactNumber(availableRooms)}</span></div>
                              <div className="flex justify-between text-xs text-gray-600"><span>Occupied</span><span className="font-semibold text-gray-800">{formatCompactNumber(occupiedRooms)}</span></div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-700">Bed allocation</div>
                            <div className="text-xs text-gray-500">{occupancyPct}% occupied</div>
                          </div>
                          <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                              style={{ width: `${Math.max(0, Math.min(100, occupancyPct))}%` }}
                            />
                          </div>
                          <div className="mt-4">
                            <ResponsiveContainer width="100%" height={150} minHeight={150}>
                              <PieChart>
                                <Pie
                                  data={occupancyDonut.length ? occupancyDonut : [{ name: 'No data', value: 1 }]}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={42}
                                  outerRadius={64}
                                  paddingAngle={2}
                                >
                                  {(occupancyDonut.length ? occupancyDonut : [{ name: 'No data', value: 1 }]).map((_, i) => (
                                    <Cell key={i} fill={occupancyDonut.length ? occupancyColors[i % occupancyColors.length] : '#e5e7eb'} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Appointments - Full Width */}
                    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-gray-900">Recent appointments</div>
                          <div className="mt-1 text-xs text-gray-500">Latest patient bookings and statuses</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('appointments')}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View all
                        </button>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          <div className="col-span-4">Patient</div>
                          <div className="col-span-3">Department</div>
                          <div className="col-span-2">Date</div>
                          <div className="col-span-2">Time</div>
                          <div className="col-span-1 text-right">Status</div>
                        </div>
                        <div className="divide-y divide-gray-200 bg-white">
                          {(recentAppointments || []).slice(0, 8).map((apptRow) => (
                            <div key={apptRow.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                              <div className="col-span-4 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{apptRow.patient_name || 'Patient'}</div>
                                <div className="mt-0.5 text-xs text-gray-500 truncate">{apptRow.doctor_name ? `Dr. ${apptRow.doctor_name}` : 'Doctor not assigned'}</div>
                              </div>
                              <div className="col-span-3 text-sm text-gray-700 truncate">{apptRow.department || '—'}</div>
                              <div className="col-span-2 text-sm text-gray-700 truncate">
                                {apptRow.appointment_date ? new Date(apptRow.appointment_date).toLocaleDateString() : '—'}
                              </div>
                              <div className="col-span-2 text-sm text-gray-700 truncate">
                                {apptRow.appointment_time || '—'}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <StatusBadge value={apptRow.status} />
                              </div>
                            </div>
                          ))}
                          {(!recentAppointments || recentAppointments.length === 0) && (
                            <div className="px-4 py-12 text-center text-sm text-gray-500">
                              No recent appointments found.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Two-column layout: Departments + Ward Availability */}
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Top Departments */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="text-sm font-bold text-gray-900">Top departments</div>
                          <div className="mt-1 text-xs text-gray-500">By activity (last 30 days)</div>
                          <div className="mt-4">
                            {hasDeptData ? (
                              <ResponsiveContainer width="100%" height={200} minHeight={200}>
                                <BarChart data={deptTop} layout="vertical" margin={{ left: 8 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis type="number" tick={{ fontSize: 11 }} />
                                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                                  <Tooltip />
                                  <Bar dataKey="patients" fill="url(#deptGradient)" radius={[0, 6, 6, 0]} />
                                  <defs>
                                    <linearGradient id="deptGradient" x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#6366F1" />
                                      <stop offset="100%" stopColor="#8B5CF6" />
                                    </linearGradient>
                                  </defs>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                No department activity yet.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ward Availability */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="text-sm font-bold text-gray-900">Ward availability</div>
                          <div className="mt-1 text-xs text-gray-500">By ward / room type</div>
                          <div className="mt-4 space-y-3">
                            {(bedAvailability || []).slice(0, 5).map((bed) => {
                              const total = Number(bed?.total ?? 0);
                              const available = Number(
                                bed?.available ?? Math.max(0, total - Number(bed?.occupied ?? 0))
                              );
                              const pct = total > 0 ? Math.round((available / total) * 100) : 0;
                              const barColor =
                                pct < 20 ? 'from-rose-500 to-red-500' :
                                pct < 50 ? 'from-amber-500 to-orange-500' :
                                'from-emerald-500 to-teal-500';

                              return (
                                <div
                                  key={bed?.type || `${total}:${available}`}
                                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {bed?.type || 'Ward'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {formatCompactNumber(available)} / {formatCompactNumber(total)} available
                                      </div>
                                    </div>
                                    <div className={`text-xs font-bold ${pct < 20 ? 'text-rose-600' : pct < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}%</div>
                                  </div>
                                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                                      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}

                            {(!bedAvailability || bedAvailability.length === 0) && (
                              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                No bed availability data yet.
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                  </>
                );
              })()}
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HospitalDashboard;
