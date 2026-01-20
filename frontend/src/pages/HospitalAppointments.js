import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

// Configurations
const CONFIG = {
  departments: [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 
    'Oncology', 'General Medicine', 'Surgery'
  ],
  priorities: ['low', 'normal', 'high', 'urgent'],
  statuses: ['pending', 'confirmed', 'completed', 'cancelled'],
  appointmentTypes: ['Consultation', 'Follow-up', 'Emergency', 'Check-up']
};

const HospitalAppointments = () => {
  // State Management
  const [state, setState] = useState({
    appointments: [],
    doctors: [],
    loading: true,
    showForm: false,
    formData: null,
    filters: {
      search: '',
      status: 'all',
      doctor: 'all',
      department: 'all'
    },
    stats: {
      total: 0,
      today: 0,
      pending: 0,
      confirmed: 0
    }
  });

  // Initialize data
  useEffect(() => {
    initializeData();
  }, []);

  // Generate initial mock data
  const initializeData = async () => {
    // Generate doctors
    const doctors = CONFIG.departments.map((dept, i) => ({
      id: i + 1,
      name: `Dr. ${['John', 'Sarah', 'Mike'][i % 3]} ${['Smith', 'Johnson', 'Williams'][i % 3]}`,
      department: dept,
      available: true
    }));

    // Generate appointments
    const appointments = Array.from({ length: 20 }, (_, i) => {
      const doc = doctors[Math.floor(Math.random() * doctors.length)];
      const date = moment().add(Math.floor(Math.random() * 10), 'days');
      
      return {
        id: i + 1,
        patientName: `Patient ${i + 1}`,
        patientPhone: `+8801${Math.random().toString().slice(2, 11)}`,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department,
        date: date.format('YYYY-MM-DD'),
        time: `${9 + Math.floor(Math.random() * 8)}:${['00', '30'][Math.floor(Math.random() * 2)]}`,
        type: CONFIG.appointmentTypes[Math.floor(Math.random() * 4)],
        status: CONFIG.statuses[Math.floor(Math.random() * 4)],
        priority: CONFIG.priorities[Math.floor(Math.random() * 4)],
        notes: ''
      };
    });

    setState(prev => ({
      ...prev,
      appointments,
      doctors,
      loading: false
    }));
  };

  // Dynamic calculations
  const calculateStats = useCallback((appointments) => {
    const today = moment().format('YYYY-MM-DD');
    const todayApps = appointments.filter(a => a.date === today);
    
    return {
      total: appointments.length,
      today: todayApps.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length
    };
  }, []);

  // Update stats whenever appointments change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      stats: calculateStats(prev.appointments)
    }));
  }, [state.appointments, calculateStats]);

  // Filter appointments based on current filters
  const filteredAppointments = state.appointments.filter(apt => {
    const matchesSearch = !state.filters.search || 
      apt.patientName.toLowerCase().includes(state.filters.search.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(state.filters.search.toLowerCase());
    
    const matchesStatus = state.filters.status === 'all' || 
      apt.status === state.filters.status;
    
    const matchesDoctor = state.filters.doctor === 'all' || 
      apt.doctorId.toString() === state.filters.doctor;
    
    const matchesDepartment = state.filters.department === 'all' || 
      apt.department === state.filters.department;
    
    return matchesSearch && matchesStatus && matchesDoctor && matchesDepartment;
  });

  // Event Handlers
  const handleFilterChange = (key, value) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }));
  };

  const handleFormSubmit = async (formData) => {
    const selectedDoctor = state.doctors.find(d => d.id.toString() === formData.doctorId);
    const newAppointment = {
      ...formData,
      id: state.appointments.length + 1,
      doctorName: selectedDoctor?.name || 'Unknown',
      department: selectedDoctor?.department || 'General',
      status: 'pending',
      priority: 'normal',
      type: 'Consultation',
      createdAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      appointments: [...prev.appointments, newAppointment],
      showForm: false,
      formData: null
    }));
    
    alert('Appointment scheduled successfully!');
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.map(apt =>
        apt.id === id ? { ...apt, status: newStatus } : apt
      )
    }));
    
    alert('Status updated successfully!');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    
    setState(prev => ({
      ...prev,
      appointments: prev.appointments.filter(apt => apt.id !== id)
    }));
    
    alert('Appointment cancelled!');
  };

  // UI Helper Functions
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Chart Data
  const chartData = CONFIG.statuses.map(status => ({
    name: status,
    value: state.appointments.filter(a => a.status === status).length
  }));

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Appointments Management</h1>
        <p className="text-gray-600">Manage patient appointments efficiently</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{state.stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Today</p>
          <p className="text-2xl font-bold">{state.stats.today}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold">{state.stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold">{state.stats.confirmed}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search..."
            className="border rounded px-3 py-2 flex-1 min-w-[200px]"
            value={state.filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          
          <select
            className="border rounded px-3 py-2"
            value={state.filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All Status</option>
            {CONFIG.statuses.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setState(prev => ({ ...prev, showForm: true }))}
          >
            + New Appointment
          </button>
        </div>
      </div>

      {/* Main Content - List View */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Doctor</th>
              <th className="px-4 py-3 text-left">Date & Time</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map(apt => (
              <tr key={apt.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{apt.patientName}</p>
                  <p className="text-sm text-gray-600">{apt.patientPhone}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{apt.doctorName}</p>
                  <p className="text-sm text-gray-600">{apt.department}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{moment(apt.date).format('MMM D, YYYY')}</p>
                  <p className="text-sm text-gray-600">
                    {moment(apt.time, 'HH:mm').format('h:mm A')}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={apt.status}
                    onChange={(e) => handleStatusUpdate(apt.id, e.target.value)}
                    className={`px-2 py-1 rounded text-sm ${getStatusColor(apt.status)}`}
                  >
                    {CONFIG.statuses.map(s => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        formData: apt, 
                        showForm: true 
                      }))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(apt.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 border rounded hover:bg-gray-50">
              📋 Generate Daily Report
            </button>
            <button className="w-full text-left p-3 border rounded hover:bg-gray-50">
              🔔 Send Reminders
            </button>
            <button className="w-full text-left p-3 border rounded hover:bg-gray-50">
              📊 View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Form Modal */}
      {state.showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {state.formData ? 'Edit Appointment' : 'New Appointment'}
                </h3>
                <button
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    showForm: false,
                    formData: null 
                  }))}
                  className="text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                handleFormSubmit(data);
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">Patient Name</label>
                    <input
                      name="patientName"
                      defaultValue={state.formData?.patientName || ''}
                      className="border rounded w-full p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Phone</label>
                    <input
                      name="patientPhone"
                      type="tel"
                      defaultValue={state.formData?.patientPhone || ''}
                      className="border rounded w-full p-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Doctor</label>
                    <select
                      name="doctorId"
                      defaultValue={state.formData?.doctorId || ''}
                      className="border rounded w-full p-2"
                      required
                    >
                      <option value="">Select Doctor</option>
                      {state.doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} - {d.department}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Date</label>
                    <input
                      name="date"
                      type="date"
                      defaultValue={state.formData?.date || moment().format('YYYY-MM-DD')}
                      className="border rounded w-full p-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Time</label>
                    <input
                      name="time"
                      type="time"
                      defaultValue={state.formData?.time || '09:00'}
                      className="border rounded w-full p-2"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      showForm: false,
                      formData: null 
                    }))}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {state.formData ? 'Update' : 'Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAppointments;
