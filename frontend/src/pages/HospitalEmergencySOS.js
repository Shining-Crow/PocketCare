import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const TAB = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  RESOLVED: 'resolved',
};

const toNumberOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const toDateOrNull = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatTimeAgo = (iso) => {
  const d = toDateOrNull(iso);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hour ago';
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const HospitalEmergencySOS = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);
  const [assigned, setAssigned] = useState([]);

  const [radiusKm, setRadiusKm] = useState(10);
  const [activeTab, setActiveTab] = useState(TAB.PENDING);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [search, setSearch] = useState('');

  const hospitalInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('hospitalInfo');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/hospital/emergency/requests', {
        params: { radius_km: radiusKm, include_assigned: 1 },
      });
      setPending(Array.isArray(res.data?.pending) ? res.data.pending : []);
      setAssigned(Array.isArray(res.data?.assigned) ? res.data.assigned : []);
      setLastUpdatedAt(new Date());
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to fetch emergency requests';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [radiusKm]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);

  const acceptRequest = async (id) => {
    try {
      setBusyId(id);
      await api.post(`/hospital/emergency/requests/${id}/accept`);
      await refresh();
      setActiveTab(TAB.ASSIGNED);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to accept request';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const resolveRequest = async (id) => {
    try {
      setBusyId(id);
      await api.post(`/hospital/emergency/requests/${id}/resolve`);
      await refresh();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to resolve request';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const openMap = (lat, lng) => {
    if (lat == null || lng == null) return;
    const url = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const assignedActive = useMemo(() => assigned.filter((r) => r.status !== 'resolved'), [assigned]);
  const resolvedToday = useMemo(
    () => {
      const today = new Date();
      return assigned.filter((r) => isSameDay(toDateOrNull(r.resolved_at), today));
    },
    [assigned]
  );

  const avgResponseMinutesToday = useMemo(() => {
    const today = new Date();
    const samples = assigned
      .map((r) => {
        const a = toDateOrNull(r.acknowledged_at);
        const c = toDateOrNull(r.created_at);
        if (!a || !c) return null;
        if (!isSameDay(a, today)) return null;
        const mins = (a.getTime() - c.getTime()) / 60000;
        return mins >= 0 && Number.isFinite(mins) ? mins : null;
      })
      .filter((v) => v != null);
    if (samples.length === 0) return null;
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    return Math.round(avg * 10) / 10;
  }, [assigned]);

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((r) => {
      const name = (r.user_name || '').toLowerCase();
      const phone = (r.user_phone || '').toLowerCase();
      const type = (r.emergency_type || '').toLowerCase();
      const note = (r.note || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || type.includes(q) || note.includes(q);
    });
  }, [pending, search]);

  const filteredAssigned = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = assignedActive;
    if (!q) return base;
    return base.filter((r) => {
      const name = (r.user_name || '').toLowerCase();
      const phone = (r.user_phone || '').toLowerCase();
      const type = (r.emergency_type || '').toLowerCase();
      const note = (r.note || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || type.includes(q) || note.includes(q);
    });
  }, [assignedActive, search]);

  const filteredResolved = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = assigned.filter((r) => r.status === 'resolved');
    if (!q) return base;
    return base.filter((r) => {
      const name = (r.user_name || '').toLowerCase();
      const phone = (r.user_phone || '').toLowerCase();
      const type = (r.emergency_type || '').toLowerCase();
      const note = (r.note || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || type.includes(q) || note.includes(q);
    });
  }, [assigned, search]);

  const list = useMemo(() => {
    if (activeTab === TAB.ASSIGNED) return filteredAssigned;
    if (activeTab === TAB.RESOLVED) return filteredResolved;
    return filteredPending;
  }, [activeTab, filteredAssigned, filteredPending, filteredResolved]);

  const StatusPill = ({ status }) => {
    if (status === 'resolved') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Resolved</span>;
    }
    if (status === 'acknowledged') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Assigned</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Pending</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Emergency SOS</h2>
          <p className="text-gray-600 mt-1">
            Nearby SOS alerts are shown in real time (auto-refresh every 5 seconds).
          </p>
          {hospitalInfo?.name ? (
            <p className="text-xs text-gray-500 mt-1">Signed in as: {hospitalInfo.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
            title={error || 'Connected'}
          >
            {error ? '● Attention' : '● Connected'}
          </span>

          <button
            onClick={refresh}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending nearby</p>
              <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700 font-bold">
              !
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Within {radiusKm} km radius</p>
        </div>

        <div className="p-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assigned (active)</p>
              <p className="text-2xl font-bold text-gray-900">{assignedActive.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              A
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Accepted by your hospital</p>
        </div>

        <div className="p-5 rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved today</p>
              <p className="text-2xl font-bold text-gray-900">{resolvedToday.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold">
              ✓
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Completed by your team</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg response (today)</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgResponseMinutesToday == null ? '—' : `${avgResponseMinutesToday} min`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
              ⏱
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {lastUpdatedAt ? `Updated ${formatTimeAgo(lastUpdatedAt.toISOString())}` : 'Not updated yet'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Radius (km)</span>
          <input
            type="number"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Math.min(100, Math.max(1, Number(e.target.value) || 10)))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, type, or note…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto refresh
        </label>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab(TAB.PENDING)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            activeTab === TAB.PENDING
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab(TAB.ASSIGNED)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            activeTab === TAB.ASSIGNED
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Assigned ({assignedActive.length})
        </button>
        <button
          onClick={() => setActiveTab(TAB.RESOLVED)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            activeTab === TAB.RESOLVED
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Resolved ({assigned.filter((r) => r.status === 'resolved').length})
        </button>
      </div>

      {error ? (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <div className="text-xs text-red-600 mt-1">
            If this persists, confirm you are logged in as a hospital and the backend is running.
          </div>
        </div>
      ) : null}

      {/* List */}
      {loading ? (
        <div className="p-6 text-gray-600">Loading SOS alerts…</div>
      ) : list.length === 0 ? (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
          No SOS requests found for this view.
          {activeTab === TAB.PENDING ? (
            <div className="text-xs text-gray-500 mt-2">Try increasing radius or keep auto-refresh enabled.</div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((r) => {
            const lat = toNumberOrNull(r.latitude);
            const lng = toNumberOrNull(r.longitude);
            const distanceKm = typeof r.distance_km === 'number' ? r.distance_km : toNumberOrNull(r.distance_km);
            const isBusy = busyId === r.id;

            return (
              <div
                key={r.id}
                className="border border-gray-200 rounded-xl bg-white p-5 hover:shadow-sm transition"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {r.user_name || 'Unknown user'}
                      </p>
                      <StatusPill status={r.status} />
                      {r.blood_group ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                          {r.blood_group}
                        </span>
                      ) : null}
                      <span className="text-xs text-gray-500">#{r.id}</span>
                    </div>

                    <div className="mt-1 text-sm text-gray-700">
                      <span className="font-medium">Type:</span> {r.emergency_type || 'Emergency'}
                    </div>
                    {r.note ? <div className="mt-1 text-sm text-gray-600">{r.note}</div> : null}

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="text-xs text-gray-500">Created</div>
                        <div className="text-sm font-medium text-gray-900">{formatTimeAgo(r.created_at)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="text-xs text-gray-500">Distance</div>
                        <div className="text-sm font-medium text-gray-900">
                          {distanceKm == null ? '—' : `${distanceKm.toFixed(1)} km`}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="text-xs text-gray-500">Contact</div>
                        <div className="text-sm font-medium text-gray-900">{r.user_phone || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {r.status === 'pending' ? (
                      <button
                        disabled={isBusy}
                        onClick={() => acceptRequest(r.id)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition text-sm font-medium disabled:opacity-70"
                      >
                        {isBusy ? 'Accepting…' : 'Accept'}
                      </button>
                    ) : null}

                    {r.status === 'acknowledged' ? (
                      <button
                        disabled={isBusy}
                        onClick={() => resolveRequest(r.id)}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-medium disabled:opacity-70"
                      >
                        {isBusy ? 'Resolving…' : 'Mark Resolved'}
                      </button>
                    ) : null}

                    <button
                      onClick={() => r.user_phone && (window.location.href = `tel:${r.user_phone}`)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                      disabled={!r.user_phone}
                      title={!r.user_phone ? 'No phone number available' : 'Call'}
                    >
                      Call
                    </button>

                    <button
                      onClick={() => openMap(lat, lng)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                      disabled={lat == null || lng == null}
                      title={lat == null || lng == null ? 'No location available' : 'Open in Maps'}
                    >
                      Map
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Location: {lat == null || lng == null ? '—' : `${lat}, ${lng}`}
                  {r.acknowledged_at ? ` • Accepted ${formatTimeAgo(r.acknowledged_at)}` : ''}
                  {r.resolved_at ? ` • Resolved ${formatTimeAgo(r.resolved_at)}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HospitalEmergencySOS;
