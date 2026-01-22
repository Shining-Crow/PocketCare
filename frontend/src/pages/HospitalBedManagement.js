import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const HospitalBedManagement = () => {
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  // AC/Non-AC toggle state for each ward type
  const [acToggle, setAcToggle] = useState({
    general: 'ac',      // 'ac' or 'non_ac'
    pediatrics: 'ac',
    maternity: 'ac'
  });
  
  // Private room configuration toggle state
  const [privateRoomToggle, setPrivateRoomToggle] = useState('private_1bed_no_bath'); // 'private_1bed_no_bath', 'private_1bed_with_bath', or 'private_2bed_with_bath'
  
  // Edit mode state - tracks which cards are in edit mode
  const [editMode, setEditMode] = useState({});
  
  // Patient info modal state
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedWardInfo, setSelectedWardInfo] = useState(null);
  
  // Toggle edit mode for a specific ward
  const toggleEditMode = async (wardType, currentType) => {
    const isCurrentlyEditing = editMode[wardType];
    
    // If we're closing edit mode (Done button), save the data
    if (isCurrentlyEditing) {
      await saveSingleWard(currentType);
    }
    
    setEditMode(prev => ({
      ...prev,
      [wardType]: !prev[wardType]
    }));
  };
  
  // Dummy patient data for reserved beds
  const dummyPatientData = {
    general_ac: [
      { bedNumber: 'GA-101', patientName: 'John Doe', age: 45, admissionDate: '2026-01-20', admissionTime: '09:30 AM', reservedUntil: '2026-01-25', doctor: 'Dr. Sarah Johnson', condition: 'Post-surgery recovery', contactNumber: '+1-555-0123', emergencyContact: '+1-555-0124' },
      { bedNumber: 'GA-102', patientName: 'Mary Smith', age: 52, admissionDate: '2026-01-21', admissionTime: '02:15 PM', reservedUntil: '2026-01-24', doctor: 'Dr. Michael Chen', condition: 'Observation', contactNumber: '+1-555-0125', emergencyContact: '+1-555-0126' }
    ],
    general_non_ac: [
      { bedNumber: 'GN-201', patientName: 'Robert Wilson', age: 38, admissionDate: '2026-01-19', admissionTime: '11:00 AM', reservedUntil: '2026-01-23', doctor: 'Dr. Emily Brown', condition: 'Minor surgery recovery', contactNumber: '+1-555-0127', emergencyContact: '+1-555-0128' }
    ],
    pediatrics_ac: [
      { bedNumber: 'PA-301', patientName: 'Emma Davis', age: 8, admissionDate: '2026-01-22', admissionTime: '08:00 AM', reservedUntil: '2026-01-24', doctor: 'Dr. Lisa Anderson', condition: 'Fever monitoring', contactNumber: '+1-555-0129', emergencyContact: '+1-555-0130', guardian: 'Jennifer Davis' }
    ],
    pediatrics_non_ac: [
      { bedNumber: 'PN-401', patientName: 'Oliver Martinez', age: 5, admissionDate: '2026-01-21', admissionTime: '03:45 PM', reservedUntil: '2026-01-23', doctor: 'Dr. Lisa Anderson', condition: 'Respiratory infection', contactNumber: '+1-555-0131', emergencyContact: '+1-555-0132', guardian: 'Carlos Martinez' }
    ],
    maternity_ac: [
      { bedNumber: 'MA-501', patientName: 'Jessica Taylor', age: 29, admissionDate: '2026-01-22', admissionTime: '06:30 AM', reservedUntil: '2026-01-27', doctor: 'Dr. Amanda White', condition: 'Delivery - Expected', contactNumber: '+1-555-0133', emergencyContact: '+1-555-0134', dueDate: '2026-01-23' }
    ],
    maternity_non_ac: [
      { bedNumber: 'MN-601', patientName: 'Sophie Garcia', age: 32, admissionDate: '2026-01-20', admissionTime: '04:20 PM', reservedUntil: '2026-01-26', doctor: 'Dr. Amanda White', condition: 'Post-delivery care', contactNumber: '+1-555-0135', emergencyContact: '+1-555-0136', deliveryDate: '2026-01-20' }
    ],
    icu: [
      { bedNumber: 'ICU-701', patientName: 'William Thompson', age: 67, admissionDate: '2026-01-18', admissionTime: '01:00 AM', reservedUntil: '2026-01-30', doctor: 'Dr. Richard Lee', condition: 'Critical - Heart condition', contactNumber: '+1-555-0137', emergencyContact: '+1-555-0138', ventilator: 'Yes' }
    ],
    emergency: [
      { bedNumber: 'ER-801', patientName: 'David Brown', age: 41, admissionDate: '2026-01-22', admissionTime: '11:45 PM', reservedUntil: '2026-01-23', doctor: 'Dr. James Wilson', condition: 'Accident - Stable', contactNumber: '+1-555-0139', emergencyContact: '+1-555-0140', triageLevel: 'Level 2' }
    ],
    private_1bed_no_bath: [
      { bedNumber: 'PVT-A101', patientName: 'Charles Miller', age: 55, admissionDate: '2026-01-21', admissionTime: '10:00 AM', reservedUntil: '2026-01-28', doctor: 'Dr. Patricia Davis', condition: 'Recovery - Elective surgery', contactNumber: '+1-555-0141', emergencyContact: '+1-555-0142', roomRate: '$150/day' }
    ],
    private_1bed_with_bath: [
      { bedNumber: 'PVT-B201', patientName: 'Linda Anderson', age: 48, admissionDate: '2026-01-20', admissionTime: '01:30 PM', reservedUntil: '2026-01-27', doctor: 'Dr. Robert Martinez', condition: 'Post-operative care', contactNumber: '+1-555-0143', emergencyContact: '+1-555-0144', roomRate: '$250/day' }
    ],
    private_2bed_with_bath: [
      { bedNumber: 'PVT-C301', patientName: 'Thomas Wilson', age: 72, admissionDate: '2026-01-19', admissionTime: '09:00 AM', reservedUntil: '2026-01-29', doctor: 'Dr. Susan Clark', condition: 'Extended care', contactNumber: '+1-555-0145', emergencyContact: '+1-555-0146', roomRate: '$400/day' }
    ]
  };
  
  // Handle card click to show patient info
  const handleCardClick = (wardType, wardLabel) => {
    const patients = dummyPatientData[wardType] || [];
    setSelectedWardInfo({
      wardType,
      wardLabel,
      patients
    });
    setShowPatientModal(true);
  };
  
  // Ward bed management - using original structure
  const [bedStatus, setBedStatus] = useState({
    general_ac: { total: 0, available: 0, reserved: 0 },
    general_non_ac: { total: 0, available: 0, reserved: 0 },
    icu: { total: 0, available: 0, reserved: 0 },
    emergency: { total: 0, available: 0, reserved: 0 },
    pediatrics_ac: { total: 0, available: 0, reserved: 0 },
    pediatrics_non_ac: { total: 0, available: 0, reserved: 0 },
    maternity_ac: { total: 0, available: 0, reserved: 0 },
    maternity_non_ac: { total: 0, available: 0, reserved: 0 },
    // Private Rooms
    private_1bed_no_bath: { total: 0, available: 0, reserved: 0 },
    private_1bed_with_bath: { total: 0, available: 0, reserved: 0 },
    private_2bed_with_bath: { total: 0, available: 0, reserved: 0 }
  });
  
  // Get hospital ID from logged-in hospital context
  const getHospitalId = () => {
    try {
      const hospitalInfo = localStorage.getItem('hospitalInfo');
      if (hospitalInfo) {
        const parsed = JSON.parse(hospitalInfo);
        return parsed.id;
      }
    } catch (e) {
      console.error('Failed to get hospital info:', e);
    }
    return null; // Return null if no hospital is logged in
  };
  
  const hospitalId = getHospitalId();

  // Ward configuration with labels - updated for toggle-based wards
  const wardConfig = {
    general_ac: { label: 'General Ward (AC)', wardType: 'general', acType: 'ac' },
    general_non_ac: { label: 'General Ward (Non-AC)', wardType: 'general', acType: 'non_ac' },
    maternity_ac: { label: 'Maternity Ward (AC)', wardType: 'maternity', acType: 'ac' },
    maternity_non_ac: { label: 'Maternity Ward (Non-AC)', wardType: 'maternity', acType: 'non_ac' },
    pediatrics_ac: { label: 'Pediatrics Ward (AC)', wardType: 'pediatrics', acType: 'ac' },
    pediatrics_non_ac: { label: 'Pediatrics Ward (Non-AC)', wardType: 'pediatrics', acType: 'non_ac' },
    icu: { label: 'ICU', wardType: 'icu', acType: 'not_applicable' },
    emergency: { label: 'Emergency', wardType: 'emergency', acType: 'not_applicable' },
    // Private Rooms - treated as wards for consistency
    private_1bed_no_bath: { label: 'Private Room (1 Bed)', wardType: 'private_room', acType: 'not_applicable', roomConfig: '1_bed_no_bath' },
    private_1bed_with_bath: { label: 'Private Room (1 Bed, Attached Bath)', wardType: 'private_room', acType: 'not_applicable', roomConfig: '1_bed_with_bath' },
    private_2bed_with_bath: { label: 'Private Room (2 Beds, Attached Bath)', wardType: 'private_room', acType: 'not_applicable', roomConfig: '2_bed_with_bath' }
  };
  
  // Define which wards should be displayed (consolidated wards with toggle)
  const displayWards = [
    { type: 'general', label: 'General Ward', hasToggle: true, toggleType: 'ac' },
    { type: 'pediatrics', label: 'Pediatrics Ward', hasToggle: true, toggleType: 'ac' },
    { type: 'maternity', label: 'Maternity Ward', hasToggle: true, toggleType: 'ac' },
    { type: 'icu', label: 'ICU', hasToggle: false },
    { type: 'emergency', label: 'Emergency', hasToggle: false },
    { 
      type: 'private_room', 
      label: 'Private Room', 
      hasToggle: true, 
      toggleType: 'private',
      options: [
        { value: 'private_1bed_no_bath', label: '1 Bed' },
        { value: 'private_1bed_with_bath', label: '1 Bed + Bath' },
        { value: 'private_2bed_with_bath', label: '2 Beds + Bath' }
      ]
    }
  ];

  useEffect(() => {
    loadBedData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBedData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bed-management/bed-wards?hospital_id=${hospitalId}`);
      if (response.data.success && response.data.wards.length > 0) {
        const newBedStatus = {
          general_ac: { total: 0, available: 0, reserved: 0 },
          general_non_ac: { total: 0, available: 0, reserved: 0 },
          icu: { total: 0, available: 0, reserved: 0 },
          emergency: { total: 0, available: 0, reserved: 0 },
          pediatrics_ac: { total: 0, available: 0, reserved: 0 },
          pediatrics_non_ac: { total: 0, available: 0, reserved: 0 },
          maternity_ac: { total: 0, available: 0, reserved: 0 },
          maternity_non_ac: { total: 0, available: 0, reserved: 0 },
          private_1bed_no_bath: { total: 0, available: 0, reserved: 0 },
          private_1bed_with_bath: { total: 0, available: 0, reserved: 0 },
          private_2bed_with_bath: { total: 0, available: 0, reserved: 0 }
        };
        response.data.wards.forEach(ward => {
          // Handle regular wards
          if (ward.ward_type !== 'private_room') {
            const key = ward.ac_type === 'not_applicable' 
              ? ward.ward_type 
              : `${ward.ward_type}_${ward.ac_type}`;
            if (newBedStatus[key]) {
              // Recalculate available as total - reserved
              const calculatedAvailable = ward.total_beds - ward.reserved_beds;
              newBedStatus[key] = {
                total: ward.total_beds,
                available: calculatedAvailable,
                reserved: ward.reserved_beds,
                id: ward.id
              };
            }
          } else {
            // Handle private rooms - map by room configuration
            // Convert room_config to match state key format
            // room_config: 1_bed_no_bath -> state key: private_1bed_no_bath (no underscore between 1 and bed)
            let key = `private_${ward.room_config}`;
            
            // Check if key exists, if not try alternative format
            if (!newBedStatus[key]) {
              // Try without underscore between number and bed
              key = key.replace(/_(\d+)_bed/, '_$1bed');
            }
            
            if (newBedStatus[key]) {
              // Recalculate available as total - reserved
              const calculatedAvailable = ward.total_beds - ward.reserved_beds;
              newBedStatus[key] = {
                total: ward.total_beds,
                available: calculatedAvailable,
                reserved: ward.reserved_beds,
                id: ward.id
              };
            } else {
              console.warn(`Private room key not found. Tried: private_${ward.room_config} and ${key}`);
            }
          }
        });
        setBedStatus(newBedStatus);
      }
    } catch (error) {
      console.error('Error loading bed data:', error);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  const updateBedCount = (type, field, value) => {
    // Allow empty string for user to clear the input
    if (value === '') {
      const updatedStatus = {
        ...bedStatus,
        [type]: {
          ...bedStatus[type],
          [field]: ''
        }
      };
      setBedStatus(updatedStatus);
      return;
    }

    const newValue = parseInt(value);
    
    // If not a valid number, ignore
    if (isNaN(newValue)) return;
    
    // Validate input
    if (newValue < 0) return;

    let updatedBedData = {
      ...bedStatus[type],
      [field]: newValue
    };

    // Auto-calculate available beds based on total and reserved
    // Available = Total - Reserved - Occupied
    // For simplicity, we assume Occupied = Total - Available - Reserved
    // So: Available = Total - Reserved (when we only input total and reserved)
    if (field === 'total' || field === 'reserved') {
      const total = field === 'total' ? newValue : bedStatus[type].total;
      const reserved = field === 'reserved' ? newValue : bedStatus[type].reserved;
      
      // Calculate available as total minus reserved (can be negative during editing)
      updatedBedData.available = total - reserved;
    }

    const updatedStatus = {
      ...bedStatus,
      [type]: updatedBedData
    };

    setBedStatus(updatedStatus);
  };

  const saveSingleWard = async (wardType) => {
    try {
      const data = bedStatus[wardType];
      const config = wardConfig[wardType];
      
      // Convert empty strings to 0 before saving
      const total = parseInt(data.total) || 0;
      const available = parseInt(data.available) || 0;
      const reserved = parseInt(data.reserved) || 0;
      
      // Validate reserved doesn't exceed total
      if (reserved > total) {
        setWarningMessage(`Reserved beds (${reserved}) cannot exceed total beds (${total})`);
        setShowWarningModal(true);
        return;
      }
      
      const occupied = total - available - reserved;
      
      const wardData = {
        hospital_id: hospitalId,
        ward_type: config.wardType,
        ac_type: config.acType,
        total_beds: total,
        available_beds: available,
        reserved_beds: reserved,
        occupied_beds: occupied
      };
      
      // Add room configuration for private rooms
      if (config.roomConfig) {
        wardData.room_config = config.roomConfig;
      }
      
      await api.post('/bed-management/bed-wards', wardData);
      
      // Show brief success notification
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 1500);
      
      await loadBedData();
    } catch (error) {
      console.error('Error saving bed data:', error);
      alert('Failed to save bed data');
    }
  };

  // Calculate total available beds
  const totalAvailableBeds = Object.values(bedStatus).reduce((sum, ward) => sum + ward.available, 0);
  const totalCapacity = Object.values(bedStatus).reduce((sum, ward) => sum + ward.total, 0);
  const sosAvailability = totalAvailableBeds > 10 ? 'high' : totalAvailableBeds > 0 ? 'medium' : 'low';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading bed management...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bed Management</h1>
        <p className="text-gray-600">Update real-time bed availability for accurate emergency routing</p>
      </div>

      {/* Status Banner */}
      <div className="mb-8 p-6 rounded-xl border shadow-sm" style={{
        background: sosAvailability === 'high' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' :
          sosAvailability === 'medium' ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' :
            'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        borderColor: sosAvailability === 'high' ? '#10b981' :
          sosAvailability === 'medium' ? '#f59e0b' :
            '#ef4444'
      }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">
              {sosAvailability === 'high' ? '🚨 Ready for Emergencies' :
                sosAvailability === 'medium' ? '⚠️ Limited Capacity' :
                  '🔴 Full Capacity'}
            </h3>
            <p className="text-gray-700">
              {sosAvailability === 'high' ? 'Hospital is optimally prepared for emergency cases' :
                sosAvailability === 'medium' ? 'Emergency cases will be routed only for critical needs' :
                  'No beds available for emergency routing'}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-3xl font-bold text-gray-800">{totalAvailableBeds} / {totalCapacity}</div>
            <p className="text-sm text-gray-600">Available beds / Total capacity</p>
          </div>
        </div>
      </div>

      {/* Bed Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 items-start">
        {displayWards.map((ward, index) => {
          // Determine the current type based on toggle state
          let currentType;
          if (ward.toggleType === 'ac') {
            // For wards with AC/Non-AC toggle
            currentType = `${ward.type}_${acToggle[ward.type]}`;
          } else if (ward.toggleType === 'private') {
            // For private rooms with multiple options
            currentType = privateRoomToggle;
          } else {
            // For wards without toggle
            currentType = ward.type;
          }
          
          // Create unique card ID for edit mode using index and currentType
          const cardId = `${currentType}_${index}`;
          
          const data = bedStatus[currentType];

          return (
            <div 
              key={cardId} 
              className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 rounded-2xl shadow-md p-5 border-2 border-gray-100 hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[320px] cursor-pointer backdrop-blur-sm"
              onClick={() => handleCardClick(currentType, ward.label)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{ward.label}</h3>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEditMode(cardId, currentType);
                        }}
                        className="ml-2 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1"
                      >
                        {editMode[cardId] ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Done
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Edit
                          </>
                        )}
                      </button>
                      
                      {/* Dropdown Edit Menu */}
                      {editMode[cardId] && (
                        <div 
                          className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-2xl border-2 border-blue-200 p-4 z-50 animate-slideDown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-4">
                            {/* Total Beds */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Total Beds
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={data.total}
                                onChange={(e) => updateBedCount(currentType, 'total', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* Reserved Beds */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reserved Beds
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={data.total}
                                value={data.reserved}
                                onChange={(e) => updateBedCount(currentType, 'reserved', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Total Capacity: {data.total} beds</p>
                </div>
                <div className="text-right ml-4">
                  <div className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap inline-block shadow-md ${
                    data.available > 5 
                      ? 'bg-gradient-to-r from-green-400 to-green-500 text-white border-2 border-green-300' 
                      : data.available > 0 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white border-2 border-yellow-300' 
                        : 'bg-gradient-to-r from-red-400 to-red-500 text-white border-2 border-red-300'
                  }`}>
                    {data.available} Available
                  </div>
                </div>
              </div>

              {/* AC/Non-AC Toggle Buttons for General, Pediatrics, and Maternity */}
              {ward.toggleType === 'ac' && (
                <div className="mb-3 flex gap-2 justify-start">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAcToggle({ ...acToggle, [ward.type]: 'ac' });
                    }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      acToggle[ward.type] === 'ac'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    AC
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAcToggle({ ...acToggle, [ward.type]: 'non_ac' });
                    }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      acToggle[ward.type] === 'non_ac'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    Non-AC
                  </button>
                </div>
              )}

              {/* Private Room Configuration Toggle */}
              {ward.toggleType === 'private' && ward.options && (
                <div className="mb-3 flex gap-2 justify-start flex-wrap">
                  {ward.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrivateRoomToggle(option.value);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap shadow-sm ${
                        privateRoomToggle === option.value
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Info Section for cards without toggles */}
              {!ward.hasToggle && (
                <div className="mb-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="font-medium">
                      {ward.type === 'icu' ? 'Critical care unit with advanced monitoring' : 
                       ward.type === 'emergency' ? 'Immediate medical attention and triage' : 
                       'Specialized medical care facility'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t-2 border-gray-200 mt-auto">
                <div className="p-2.5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl shadow-sm border border-gray-200">
                  <div className="font-bold text-2xl text-gray-900">{data.total}</div>
                  <div className="text-xs text-gray-600 mt-0.5 font-semibold">Total Beds</div>
                </div>
                <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl shadow-sm border border-blue-200">
                  <div className="font-bold text-2xl text-blue-700">{data.available}</div>
                  <div className="text-xs text-blue-600 mt-0.5 font-semibold">Available</div>
                </div>
                <div className="p-2.5 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl shadow-sm border border-yellow-200">
                  <div className="font-bold text-2xl text-yellow-700">{data.reserved}</div>
                  <div className="text-xs text-yellow-600 mt-0.5 font-semibold">Reserved</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Info Modal */}
      {showPatientModal && selectedWardInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowPatientModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden transform animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedWardInfo.wardLabel}</h3>
                <p className="text-blue-100 text-sm mt-1">Reserved Bed Information</p>
              </div>
              <button
                onClick={() => setShowPatientModal(false)}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              {selectedWardInfo.patients.length > 0 ? (
                <div className="space-y-6">
                  {selectedWardInfo.patients.map((patient, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                      {/* Patient Header */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-5 pb-4 border-b-2 border-blue-100">
                        <div className="mb-3 md:mb-0">
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">{patient.patientName}</h4>
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            <span className="text-lg">{patient.age} years old</span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-full font-bold text-lg shadow-md">
                          {patient.bedNumber}
                        </div>
                      </div>
                      
                      {/* Patient Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Admission Info */}
                        <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-green-100 p-2 rounded-lg">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Admission</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.admissionDate}</p>
                          <p className="text-gray-600 text-sm mt-1">{patient.admissionTime}</p>
                        </div>
                        
                        {/* Reserved Until */}
                        <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-orange-100 p-2 rounded-lg">
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Reserved Until</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.reservedUntil}</p>
                          <p className="text-gray-600 text-sm mt-1">Expected discharge</p>
                        </div>
                        
                        {/* Doctor Info */}
                        <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Doctor</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.doctor}</p>
                          <p className="text-gray-600 text-sm mt-1">Attending physician</p>
                        </div>
                        
                        {/* Condition */}
                        <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-red-100 p-2 rounded-lg">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Condition</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.condition}</p>
                        </div>
                        
                        {/* Contact Number */}
                        <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Contact</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.contactNumber}</p>
                        </div>
                        
                        {/* Emergency Contact */}
                        <div className="bg-white p-4 rounded-lg border-l-4 border-red-600 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-red-100 p-2 rounded-lg">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Emergency</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.emergencyContact}</p>
                        </div>
                        
                        {/* Additional Info based on ward type */}
                        {patient.guardian && (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-indigo-100 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Guardian</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.guardian}</p>
                          </div>
                        )}
                        
                        {patient.dueDate && (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-pink-100 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Due Date</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.dueDate}</p>
                          </div>
                        )}
                        
                        {patient.deliveryDate && (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-pink-100 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Delivery Date</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.deliveryDate}</p>
                          </div>
                        )}
                        
                        {patient.ventilator && (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-red-100 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Ventilator</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.ventilator}</p>
                          </div>
                        )}
                        
                        {patient.triageLevel && (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-yellow-100 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Triage Level</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.triageLevel}</p>
                          </div>
                        )}
                        
                        {patient.roomRate && (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-green-100 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Room Rate</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.roomRate}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full p-6 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                    <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-700 mb-3">No Reserved Beds</h4>
                  <p className="text-gray-500 text-lg">There are currently no patients with reserved beds in this ward.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-slideUp">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600">Bed status has been updated successfully</p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition duration-200 transform hover:scale-105"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-slideUp">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            </div>
            
            {/* Warning Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Validation Error</h3>
              <p className="text-gray-600">{warningMessage}</p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200 transform hover:scale-105"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HospitalBedManagement;
