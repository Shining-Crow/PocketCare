import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';

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

  // Notification modal state
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // 'success' or 'error'
  });

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Initialize data
  useEffect(() => {
    initializeData();
  }, []);

  // Fetch appointments and doctors from API
  const initializeData = async () => {
    try {
      const hospitalId = localStorage.getItem('hospital_id') || '1';
      
      // Fetch appointments
      const appointmentsResponse = await fetch(`http://localhost:5000/api/hospital-appointments?hospital_id=${hospitalId}`);
      const appointmentsData = await appointmentsResponse.json();
      
      // Fetch doctors
      const doctorsResponse = await fetch(`http://localhost:5000/api/hospital-appointments/doctors?hospital_id=${hospitalId}`);
      const doctorsData = await doctorsResponse.json();
      
      setState(prev => ({
        ...prev,
        appointments: appointmentsData.appointments || [],
        doctors: doctorsData.doctors || [],
        stats: appointmentsData.stats || { total: 0, today: 0, pending: 0, confirmed: 0 },
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({ ...prev, loading: false }));
      showNotification('Failed to load appointments. Please check the server connection.', 'error');
    }
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
      apt.patient_name?.toLowerCase().includes(state.filters.search.toLowerCase()) ||
      apt.doctor_name?.toLowerCase().includes(state.filters.search.toLowerCase());
    
    const matchesStatus = state.filters.status === 'all' || 
      apt.status === state.filters.status;
    
    const matchesDoctor = state.filters.doctor === 'all' || 
      apt.hospital_doctor_id?.toString() === state.filters.doctor;
    
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
    try {
      const hospitalId = localStorage.getItem('hospital_id') || '1';
      const selectedDoctor = state.doctors.find(d => d.id.toString() === formData.doctorId);
      
      const payload = {
        hospital_id: parseInt(hospitalId),
        hospital_doctor_id: formData.doctorId ? parseInt(formData.doctorId) : null,
        patient_name: formData.patientName,
        patient_phone: formData.patientPhone,
        patient_email: formData.patientEmail || '',
        appointment_date: formData.date,
        appointment_time: formData.time,
        department: selectedDoctor?.department || 'General',
        appointment_type: formData.type || 'Consultation',
        priority: formData.priority || 'normal',
        status: 'pending',
        symptoms: formData.symptoms || '',
        notes: formData.notes || ''
      };

      if (state.formData?.id) {
        // Update existing appointment
        const response = await fetch(`http://localhost:5000/api/hospital-appointments/${state.formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to update appointment');
        
        showNotification('Appointment updated successfully!', 'success');
      } else {
        // Create new appointment
        const response = await fetch('http://localhost:5000/api/hospital-appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to create appointment');
        
        showNotification('Appointment scheduled successfully!', 'success');
      }

      setState(prev => ({
        ...prev,
        showForm: false,
        formData: null
      }));
      
      // Refresh data
      await initializeData();
    } catch (error) {
      console.error('Error saving appointment:', error);
      showNotification('Failed to save appointment. Please try again.', 'error');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/hospital-appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      showNotification('Status updated successfully!', 'success');
      
      // Refresh data
      await initializeData();
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('Failed to update status. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/hospital-appointments/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete appointment');
      
      showNotification('Appointment cancelled successfully!', 'success');
      
      // Refresh data
      await initializeData();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showNotification('Failed to cancel appointment. Please try again.', 'error');
    }
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
                  <p className="font-medium">{apt.patient_name}</p>
                  <p className="text-sm text-gray-600">{apt.patient_phone}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{apt.doctor_name || 'Not Assigned'}</p>
                  <p className="text-sm text-gray-600">{apt.department}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{moment(apt.appointment_date).format('MMM D, YYYY')}</p>
                  <p className="text-sm text-gray-600">
                    {moment(apt.appointment_time, 'HH:mm:ss').format('h:mm A')}
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
                      defaultValue={state.formData?.patient_name || ''}
                      className="border rounded w-full p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Phone</label>
                    <input
                      name="patientPhone"
                      type="tel"
                      defaultValue={state.formData?.patient_phone || ''}
                      className="border rounded w-full p-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Email (Optional)</label>
                    <input
                      name="patientEmail"
                      type="email"
                      defaultValue={state.formData?.patient_email || ''}
                      className="border rounded w-full p-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Doctor</label>
                    <select
                      name="doctorId"
                      defaultValue={state.formData?.hospital_doctor_id || ''}
                      className="border rounded w-full p-2"
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
                      defaultValue={state.formData?.appointment_date || moment().format('YYYY-MM-DD')}
                      className="border rounded w-full p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Time</label>
                    <input
                      name="time"
                      type="time"
                      defaultValue={state.formData?.appointment_time ? state.formData.appointment_time.substring(0, 5) : '09:00'}
                      className="border rounded w-full p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Type</label>
                    <select
                      name="type"
                      defaultValue={state.formData?.appointment_type || 'Consultation'}
                      className="border rounded w-full p-2"
                    >
                      {CONFIG.appointmentTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Priority</label>
                    <select
                      name="priority"
                      defaultValue={state.formData?.priority || 'normal'}
                      className="border rounded w-full p-2"
                    >
                      {CONFIG.priorities.map(p => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1">Symptoms</label>
                    <textarea
                      name="symptoms"
                      defaultValue={state.formData?.symptoms || ''}
                      className="border rounded w-full p-2"
                      rows="2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1">Notes</label>
                    <textarea
                      name="notes"
                      defaultValue={state.formData?.notes || ''}
                      className="border rounded w-full p-2"
                      rows="2"
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

      {/* Stylish Notification Modal */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-2xl p-4 min-w-[300px] max-w-md transform transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-green-600' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                className="flex-shrink-0 text-white hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAppointments;
