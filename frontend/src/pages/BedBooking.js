import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Bed,
  Building2,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Heart,
  Baby,
  Activity,
  Home,
  Snowflake,
  Sun
} from 'lucide-react';
import Footer from '../components/Footer';

function BedBooking() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  
  const [hospital, setHospital] = useState(null);
  const [bedWards, setBedWards] = useState([]);
  const [wardAvailability, setWardAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    ward_type: '',
    ac_type: '',
    room_config: '',
    patient_name: '',
    patient_age: '',
    patient_gender: '',
    patient_phone: '',
    emergency_contact: '',
    admission_date: '',
    expected_discharge_date: '',
    medical_condition: '',
    doctor_name: '',
    special_requirements: '',
    notes: ''
  });

  const wardTypes = [
    { value: 'general', label: 'General Ward', icon: Bed, color: 'blue', description: 'Standard care for common conditions' },
    { value: 'pediatrics', label: 'Pediatrics Ward', icon: Baby, color: 'pink', description: 'Specialized care for children' },
    { value: 'maternity', label: 'Maternity Ward', icon: Heart, color: 'purple', description: 'Pre and post-natal care' },
    { value: 'icu', label: 'ICU', icon: Activity, color: 'red', description: 'Intensive care unit for critical patients' },
    { value: 'emergency', label: 'Emergency', icon: AlertCircle, color: 'orange', description: 'Emergency admissions' },
    { value: 'private_room', label: 'Private Room', icon: Home, color: 'indigo', description: 'Private rooms with premium facilities' }
  ];

  const acTypes = [
    { value: 'ac', label: 'AC', icon: Snowflake },
    { value: 'non_ac', label: 'Non-AC', icon: Sun }
  ];

  const privateRoomConfigs = [
    { value: '1_bed_no_bath', label: '1 Bed (No Attached Bath)', price: 'Standard' },
    { value: '1_bed_with_bath', label: '1 Bed (Attached Bath)', price: 'Premium' },
    { value: '2_bed_with_bath', label: '2 Beds (Attached Bath)', price: 'Deluxe' }
  ];

  // Helper function to get available beds for a specific ward configuration
  const getAvailableBeds = (wardType, acType = null, roomConfig = null) => {
    const ward = bedWards.find(w => {
      if (wardType === 'private_room' && roomConfig) {
        return w.ward_type === wardType && w.room_config === roomConfig;
      }
      if (acType) {
        return w.ward_type === wardType && w.ac_type === acType;
      }
      // For ICU and Emergency, ac_type is 'not_applicable'
      return w.ward_type === wardType && w.ac_type === 'not_applicable';
    });
    return ward ? ward.available_beds : 0;
  };

  // Helper function to get total beds for display
  const getTotalBeds = (wardType, acType = null, roomConfig = null) => {
    const ward = bedWards.find(w => {
      if (wardType === 'private_room' && roomConfig) {
        return w.ward_type === wardType && w.room_config === roomConfig;
      }
      if (acType) {
        return w.ward_type === wardType && w.ac_type === acType;
      }
      return w.ward_type === wardType && w.ac_type === 'not_applicable';
    });
    return ward ? ward.total_beds : 0;
  };

  // Check if any bed is available for a ward type (considering all AC types)
  const hasAnyAvailableBed = (wardType) => {
    if (wardType === 'icu' || wardType === 'emergency') {
      return getAvailableBeds(wardType) > 0;
    }
    if (wardType === 'private_room') {
      return privateRoomConfigs.some(config => getAvailableBeds(wardType, null, config.value) > 0);
    }
    // For general, pediatrics, maternity - check both AC and Non-AC
    return getAvailableBeds(wardType, 'ac') > 0 || getAvailableBeds(wardType, 'non_ac') > 0;
  };

  // Calculate total available for a ward type
  const getTotalAvailable = (wardType) => {
    if (wardType === 'icu' || wardType === 'emergency') {
      return getAvailableBeds(wardType);
    }
    if (wardType === 'private_room') {
      return privateRoomConfigs.reduce((sum, config) => sum + getAvailableBeds(wardType, null, config.value), 0);
    }
    return getAvailableBeds(wardType, 'ac') + getAvailableBeds(wardType, 'non_ac');
  };

  const fetchHospitalDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hospitals/${hospitalId}`);
      setHospital(response.data);
      
      // Fetch bed ward availability
      try {
        const wardsResponse = await api.get(`/bed-management/bed-wards?hospital_id=${hospitalId}`);
        const wards = wardsResponse.data.wards || [];
        setBedWards(wards);
        
        // Build availability map
        const availability = {};
        wards.forEach(ward => {
          const key = ward.room_config 
            ? `${ward.ward_type}_${ward.room_config}`
            : ward.ac_type !== 'not_applicable'
              ? `${ward.ward_type}_${ward.ac_type}`
              : ward.ward_type;
          availability[key] = {
            total: ward.total_beds,
            available: ward.available_beds,
            reserved: ward.reserved_beds
          };
        });
        setWardAvailability(availability);
      } catch (wardErr) {
        console.log('No ward data available');
      }
    } catch (err) {
      setError('Failed to load hospital details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWardSelect = (wardType) => {
    setFormData(prev => ({
      ...prev,
      ward_type: wardType,
      ac_type: wardType === 'icu' || wardType === 'emergency' ? 'not_applicable' : prev.ac_type,
      room_config: wardType !== 'private_room' ? '' : prev.room_config
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ward_type || !formData.patient_name || !formData.patient_phone || !formData.admission_date) {
      setError('Please fill in all required fields');
      return;
    }

    // Check bed availability before submitting
    const availableBeds = getAvailableBeds(
      formData.ward_type,
      formData.ward_type !== 'icu' && formData.ward_type !== 'emergency' ? formData.ac_type : null,
      formData.ward_type === 'private_room' ? formData.room_config : null
    );

    if (availableBeds <= 0) {
      setError('Sorry, no beds are available for the selected ward type. Please choose a different option.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const bookingData = {
        hospital_id: parseInt(hospitalId),
        ...formData,
        patient_age: formData.patient_age ? parseInt(formData.patient_age) : null
      };
      
      await api.post('/user/bed-bookings', bookingData);
      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/my-bed-bookings');
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit booking request');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchHospitalDetails();
  }, [fetchHospitalDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bed Booked Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your bed has been reserved and confirmed. A bed has been allocated for you at the hospital.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Hospital
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Book a Bed</h1>
                <p className="text-gray-600">{hospital?.name}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ward Type Selection */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bed className="w-5 h-5 text-blue-600" />
                Select Ward Type *
              </h2>
              {bedWards.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <p className="text-yellow-700 text-sm">
                    No bed information available for this hospital. Please contact the hospital directly.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {wardTypes.map((ward) => {
                  const Icon = ward.icon;
                  const isSelected = formData.ward_type === ward.value;
                  const availableBeds = getTotalAvailable(ward.value);
                  const isUnavailable = availableBeds === 0;
                  
                  return (
                    <button
                      key={ward.value}
                      type="button"
                      onClick={() => !isUnavailable && handleWardSelect(ward.value)}
                      disabled={isUnavailable}
                      className={`p-4 rounded-xl border-2 transition-all text-left relative ${
                        isUnavailable
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                          : isSelected
                            ? `border-${ward.color}-500 bg-${ward.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isUnavailable && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          No Beds
                        </div>
                      )}
                      <Icon className={`w-6 h-6 mb-2 ${
                        isUnavailable ? 'text-gray-400' :
                        isSelected ? `text-${ward.color}-600` : 'text-gray-400'
                      }`} />
                      <h3 className={`font-semibold ${
                        isUnavailable ? 'text-gray-500' :
                        isSelected ? `text-${ward.color}-700` : 'text-gray-900'
                      }`}>
                        {ward.label}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{ward.description}</p>
                      {!isUnavailable && (
                        <p className={`text-xs mt-2 font-medium ${
                          availableBeds > 5 ? 'text-green-600' : 
                          availableBeds > 0 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {availableBeds} bed{availableBeds !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AC Type Selection (for applicable wards) */}
            {formData.ward_type && !['icu', 'emergency'].includes(formData.ward_type) && formData.ward_type !== 'private_room' && (
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-blue-600" />
                  Room Type
                </h2>
                <div className="flex gap-4">
                  {acTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.ac_type === type.value;
                    const availableBeds = getAvailableBeds(formData.ward_type, type.value);
                    const isUnavailable = availableBeds === 0;
                    
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => !isUnavailable && setFormData(prev => ({ ...prev, ac_type: type.value }))}
                        disabled={isUnavailable}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                          isUnavailable
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-6 h-6 ${isUnavailable ? 'text-gray-400' : isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className={`font-semibold ${isUnavailable ? 'text-gray-500' : isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                            {type.label}
                          </span>
                        </div>
                        <span className={`text-xs ${
                          isUnavailable ? 'text-red-500' :
                          availableBeds > 5 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {isUnavailable ? 'No beds available' : `${availableBeds} bed${availableBeds !== 1 ? 's' : ''} available`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Private Room Configuration */}
            {formData.ward_type === 'private_room' && (
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-indigo-600" />
                  Room Configuration
                </h2>
                <div className="space-y-3">
                  {privateRoomConfigs.map((config) => {
                    const isSelected = formData.room_config === config.value;
                    const availableBeds = getAvailableBeds('private_room', null, config.value);
                    const isUnavailable = availableBeds === 0;
                    
                    return (
                      <button
                        key={config.value}
                        type="button"
                        onClick={() => !isUnavailable && setFormData(prev => ({ ...prev, room_config: config.value, ac_type: 'ac' }))}
                        disabled={isUnavailable}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex justify-between items-center ${
                          isUnavailable
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <span className={`font-medium ${isUnavailable ? 'text-gray-500' : isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {config.label}
                          </span>
                          <p className={`text-xs mt-1 ${
                            isUnavailable ? 'text-red-500' :
                            availableBeds > 3 ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {isUnavailable ? 'No rooms available' : `${availableBeds} room${availableBeds !== 1 ? 's' : ''} available`}
                          </p>
                        </div>
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          isUnavailable ? 'bg-gray-200 text-gray-500' :
                          isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {config.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patient Information */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Patient Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    name="patient_name"
                    value={formData.patient_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter patient name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    name="patient_age"
                    value={formData.patient_age}
                    onChange={handleInputChange}
                    min="0"
                    max="150"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter age"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="patient_gender"
                    value={formData.patient_gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Phone *
                  </label>
                  <input
                    type="tel"
                    name="patient_phone"
                    value={formData.patient_phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+880 1XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+880 1XXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Admission Details */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Admission Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    name="admission_date"
                    value={formData.admission_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Discharge Date
                  </label>
                  <input
                    type="date"
                    name="expected_discharge_date"
                    value={formData.expected_discharge_date}
                    onChange={handleInputChange}
                    min={formData.admission_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Condition / Reason for Admission
                  </label>
                  <textarea
                    name="medical_condition"
                    value={formData.medical_condition}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the medical condition or reason for admission..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Doctor (if any)
                  </label>
                  <input
                    type="text"
                    name="doctor_name"
                    value={formData.doctor_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Doctor's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requirements
                  </label>
                  <input
                    type="text"
                    name="special_requirements"
                    value={formData.special_requirements}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any special needs or requirements"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Anything else you want the hospital to know"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.ward_type}
                className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Booking Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default BedBooking;
