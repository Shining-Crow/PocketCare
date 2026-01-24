import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SuccessModal from '../components/SuccessModal';

const HospitalDoctorsManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [error, setError] = useState(null);
  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    email: '',
    phone: '',
    experience: '',
    qualifications: ''
  });

  const API_BASE_URL = 'http://localhost:5000/api';
  const HOSPITAL_ID = 1; // Hardcoded for now

  // Fetch doctors from backend
  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching doctors from:', `${API_BASE_URL}/hospital-doctors?hospital_id=${HOSPITAL_ID}`);
      const response = await axios.get(`${API_BASE_URL}/hospital-doctors`, {
        params: { hospital_id: HOSPITAL_ID }
      });
      
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        console.log('Setting doctors:', response.data.doctors);
        setDoctors(response.data.doctors);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to load doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch specialties
  const fetchSpecialties = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hospital-doctors/specialties`);
      
      if (response.data.success) {
        setAvailableSpecialties(response.data.specialties);
      }
    } catch (err) {
      console.error('Error fetching specialties:', err);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    console.log('Component mounted, fetching data...');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('HOSPITAL_ID:', HOSPITAL_ID);
    fetchDoctors();
    fetchSpecialties();
  }, [fetchDoctors, fetchSpecialties]);

  // Save doctors to localStorage whenever they change (for backward compatibility)
  useEffect(() => {
    console.log('Doctors state updated:', doctors.length, 'doctors');
    localStorage.setItem('hospitalDoctors', JSON.stringify(doctors));
  }, [doctors]);

  // Get unique specialties for filter
  const specialties = ['all', ...new Set(doctors.map(doc => doc.specialty))];

  // Filter doctors based on search and filters
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doctor.email && doctor.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSpecialty = filterSpecialty === 'all' || doctor.specialty === filterSpecialty;
    const matchesStatus = filterStatus === 'all' || doctor.status === filterStatus;
    
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  console.log('Filtered doctors:', filteredDoctors.length, 'of', doctors.length);

  const handleAddDoctor = async () => {
    if (!newDoctor.name.trim() || !newDoctor.specialty.trim()) {
      alert('Name and specialty are required');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/hospital-doctors`, {
        ...newDoctor,
        hospital_id: HOSPITAL_ID
      });

      if (response.data.success) {
        // Refresh doctors list
        await fetchDoctors();
        
        setNewDoctor({ name: '', specialty: '', email: '', phone: '', experience: '', qualifications: '' });
        setShowAddForm(false);
        setSuccessModal({
          show: true,
          title: 'Doctor Added!',
          message: `${newDoctor.name} has been successfully added to the hospital.`
        });
      }
    } catch (err) {
      console.error('Error adding doctor:', err);
      alert(err.response?.data?.error || 'Failed to add doctor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (window.confirm('Are you sure you want to remove this doctor?')) {
      try {
        setLoading(true);
        const response = await axios.delete(`${API_BASE_URL}/hospital-doctors/${id}`);
        
        if (response.data.success) {
          // Refresh doctors list
          await fetchDoctors();
          setSuccessModal({
            show: true,
            title: 'Doctor Removed!',
            message: 'The doctor has been successfully removed from the hospital.'
          });
        }
      } catch (err) {
        console.error('Error deleting doctor:', err);
        const errorMsg = err.response?.data?.error || 'Failed to remove doctor. Please try again.';
        alert(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/hospital-doctors/${id}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        // Update local state
        setDoctors(doctors.map(doctor => 
          doctor.id === id ? { ...doctor, status: newStatus, is_available: newStatus === 'available' } : doctor
        ));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update doctor status. Please try again.');
    }
  };

  // Calculate statistics from local data
  const activeDoctors = doctors.filter(d => d.status === 'available' || d.status === 'in-session').length;
  const totalAppointments = doctors.reduce((sum, doctor) => sum + (doctor.appointments || 0), 0);

  console.log('Render state - doctors:', doctors.length, 'loading:', loading, 'filteredDoctors:', filteredDoctors.length);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-600 mr-3 text-xl">⚠️</span>
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Doctors Management</h1>
          <p className="text-gray-600">Manage doctors, availability, and schedules</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center font-medium"
        >
          <span className="mr-2 text-xl">+</span> Add New Doctor
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">👨‍⚕️ Active Doctors</h3>
            <span className="text-2xl font-bold text-green-600">{activeDoctors}</span>
          </div>
          <p className="text-sm text-gray-600">Currently available for appointments</p>
          <div className="mt-4 flex items-center text-xs text-gray-500">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">Available: {doctors.filter(d => d.status === 'available').length}</span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">In Session: {doctors.filter(d => d.status === 'in-session').length}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">📅 Today's Appointments</h3>
            <span className="text-2xl font-bold text-blue-600">{totalAppointments}</span>
          </div>
          <p className="text-sm text-gray-600">Total scheduled appointments today</p>
          <div className="mt-4 text-xs text-gray-500">
            Avg. per doctor: {doctors.length > 0 ? (totalAppointments / doctors.length).toFixed(1) : '0.0'}
          </div>
        </div>
      </div>

      {/* Add Doctor Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Add New Doctor</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="Dr. Full Name"
                value={newDoctor.name}
                onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty *</label>
              <select
                value={newDoctor.specialty}
                onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Specialty</option>
                {availableSpecialties.length > 0 ? (
                  availableSpecialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))
                ) : (
                  <>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="Dermatology">Dermatology</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="doctor@hospital.com"
                value={newDoctor.email}
                onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                placeholder="+880 1XXXXXXXXX"
                value={newDoctor.phone}
                onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
              <input
                type="text"
                placeholder="e.g., 10 years"
                value={newDoctor.experience}
                onChange={(e) => setNewDoctor({ ...newDoctor, experience: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
              <input
                type="text"
                placeholder="e.g., MBBS, MD"
                value={newDoctor.qualifications}
                onChange={(e) => setNewDoctor({ ...newDoctor, qualifications: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              disabled={loading}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDoctor}
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && <span className="mr-2">⏳</span>}
              Add Doctor
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, specialty, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Specialties</option>
              {specialties.filter(s => s !== 'all').map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="in-session">In Session</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredDoctors.length} of {doctors.length} doctors
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact & Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && doctors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-500">Loading doctors...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No doctors found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                          <span className="text-blue-600 font-bold text-lg">
                            {doctor.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{doctor.name}</div>
                          <div className="text-sm text-gray-600">
                            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              {doctor.specialty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 flex items-center">
                          <span className="mr-2">📧</span>
                          {doctor.email || 'Not provided'}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <span className="mr-2">📞</span>
                          {doctor.phone}
                        </div>
                        <div className="text-xs text-gray-500">
                          Exp: {doctor.experience}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doctor.status === 'available' ? 'bg-green-100 text-green-800' :
                          doctor.status === 'in-session' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doctor.status === 'in-session' ? 'In Session' : 
                           doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1)}
                        </span>
                        <select
                          value={doctor.status}
                          onChange={(e) => handleStatusChange(doctor.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="available">Available</option>
                          <option value="in-session">In Session</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{doctor.appointments}</div>
                        <div className="text-xs text-gray-500">today</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium transition"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.show}
        onClose={() => setSuccessModal({ show: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>
  );
};

export default HospitalDoctorsManagement;
