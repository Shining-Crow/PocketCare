import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const HospitalBedManagement = () => {
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  // Real patient booking data from API
  const [bookingsByWard, setBookingsByWard] = useState({});
  // AC/Non-AC toggle state for each ward type
  const [acToggle, setAcToggle] = useState({
    general: 'ac',      // 'ac' or 'non_ac'
    pediatrics: 'ac',
    maternity: 'ac'
  });
  
  // Private room configuration toggle state
  const [privateRoomToggle, setPrivateRoomToggle] = useState('private_1bed_no_bath'); // 'private_1bed_no_bath', 'private_1bed_with_bath', or 'private_2bed_with_bath'

  // Inline editor state (more professional + less buggy than dropdown editing)
  const [activeEditorKey, setActiveEditorKey] = useState(null); // e.g. 'general_ac', 'icu', 'private_1bed_no_bath'
  const [editorDraft, setEditorDraft] = useState({ total: '', reserved: '' });
  const [savingWardKey, setSavingWardKey] = useState(null);
  
  // Patient info modal state
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedWardInfo, setSelectedWardInfo] = useState(null);
  
  const closeEditor = () => {
    setActiveEditorKey(null);
    setEditorDraft({ total: '', reserved: '' });
  };

  const openEditor = (wardKey) => {
    const current = bedStatus[wardKey] || { total: 0, reserved: 0 };
    setActiveEditorKey(wardKey);
    setEditorDraft({
      total: String(current.total ?? 0),
      reserved: String(current.reserved ?? 0)
    });
  };

  const parseNonNegativeInt = (value) => {
    if (value === '') return { ok: true, value: 0 };
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return { ok: false, value: 0 };
    return { ok: true, value: parsed };
  };

  const saveEditor = async (wardKey) => {
    const totalParsed = parseNonNegativeInt(editorDraft.total);
    const reservedParsed = parseNonNegativeInt(editorDraft.reserved);

    if (!totalParsed.ok || !reservedParsed.ok) {
      setWarningMessage('Please enter valid non-negative numbers.');
      setShowWarningModal(true);
      return;
    }

    const total = totalParsed.value;
    const reserved = reservedParsed.value;

    if (reserved > total) {
      setWarningMessage(`Reserved beds (${reserved}) cannot exceed total beds (${total})`);
      setShowWarningModal(true);
      return;
    }

    const available = total - reserved;

    setSavingWardKey(wardKey);
    try {
      await saveSingleWard(wardKey, { total, reserved, available });
      closeEditor();
    } finally {
      setSavingWardKey(null);
    }
  };
  
  // Handle card click to show patient info - using real booking data from API
  // Handle card click to show patient info - using real booking data from API
  const handleCardClick = (currentType, wardLabel) => {
    // currentType is already the correct key (e.g., 'general_ac', 'icu', 'private_1bed_no_bath')
    // Just use it directly to get bookings
    const bookings = bookingsByWard[currentType] || [];
    
    console.log('handleCardClick:', { currentType, wardLabel, bookings, allBookings: bookingsByWard });
    
    setSelectedWardInfo({
      wardType: currentType,
      wardLabel,
      bookingKey: currentType,
      patients: bookings
    });
    setShowPatientModal(true);
  };
  
  // Fetch real booking data from API
  const fetchBookings = useCallback(async () => {
    try {
      console.log('Fetching bookings...');
      const response = await api.get('/hospital/bed-bookings/by-ward');
      console.log('Bookings response:', response.data);
      if (response.data.success) {
        const raw = response.data.bookings_by_ward || {};
        const normalized = {};
        for (const [keyRaw, bookings] of Object.entries(raw)) {
          let key = keyRaw;
          // Normalize private room keys to match frontend state keys.
          // Examples: private_1_bed_no_bath -> private_1bed_no_bath
          key = key.replace(/^private_(\d+)_bed/, 'private_$1bed');

          if (!normalized[key]) normalized[key] = [];
          if (Array.isArray(bookings)) normalized[key].push(...bookings);
        }

        setBookingsByWard(normalized);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  }, []);
  
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
        console.log('[DEBUG] Logged in as hospital:', parsed.id, parsed.name);
        return parsed.id;
      }
    } catch (e) {
      console.error('Failed to get hospital info:', e);
    }
    return null; // Return null if no hospital is logged in
  };
  
  const hospitalId = getHospitalId();
  console.log('[DEBUG] hospitalId for bed management:', hospitalId);

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
    fetchBookings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBedData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bed-management/bed-wards?hospital_id=${hospitalId}`);
      console.log('[DEBUG] Loaded bed data for hospital:', hospitalId, response.data);
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

  const saveSingleWard = async (wardType, override) => {
    try {
      const data = override || bedStatus[wardType];
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
  const totalReservedBeds = Object.values(bedStatus).reduce((sum, ward) => sum + ward.reserved, 0);
  const sosAvailability = totalAvailableBeds > 10 ? 'high' : totalAvailableBeds > 0 ? 'medium' : 'low';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading bed management...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Bed Management</h1>
          <p className="text-gray-600">Keep bed availability accurate for emergency routing and bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadBedData();
              fetchBookings();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0011.95 3.95M19 9A7 7 0 006.05 5.05" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={
          `mb-8 rounded-xl border border-gray-200 bg-white shadow-sm p-6 border-l-4 ` +
          (sosAvailability === 'high'
            ? 'border-l-emerald-500'
            : sosAvailability === 'medium'
              ? 'border-l-amber-500'
              : 'border-l-red-500')
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={
                  `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ` +
                  (sosAvailability === 'high'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : sosAvailability === 'medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200')
                }
              >
                {sosAvailability === 'high'
                  ? 'Ready'
                  : sosAvailability === 'medium'
                    ? 'Limited'
                    : 'Full'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900">Emergency routing status</h3>
            </div>
            <p className="text-sm text-gray-600">
              {sosAvailability === 'high'
                ? 'You have healthy capacity for incoming emergency cases.'
                : sosAvailability === 'medium'
                  ? 'Capacity is limited. Keep counts updated to avoid overbooking.'
                  : 'No availability reported. Patients may be routed elsewhere.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-500">Capacity</div>
              <div className="text-xl font-bold text-gray-900">{totalCapacity}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-700">Available</div>
              <div className="text-xl font-bold text-blue-800">{totalAvailableBeds}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-xs text-amber-700">Reserved</div>
              <div className="text-xl font-bold text-amber-800">{totalReservedBeds}</div>
            </div>
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
          const data = bedStatus[currentType];
          const isEditing = activeEditorKey === currentType;
          const isSaving = savingWardKey === currentType;

          const totalDraft = isEditing ? parseNonNegativeInt(editorDraft.total) : { ok: true, value: data.total };
          const reservedDraft = isEditing ? parseNonNegativeInt(editorDraft.reserved) : { ok: true, value: data.reserved };
          const previewTotal = totalDraft.value;
          const previewReserved = reservedDraft.value;
          const previewAvailable = previewTotal - previewReserved;
          const hasDraftError = isEditing && (!totalDraft.ok || !reservedDraft.ok || previewReserved > previewTotal);

          const availableForBadge = isEditing ? Math.max(0, previewAvailable) : data.available;

          return (
            <div 
              key={ward.type || index} 
              className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow flex flex-col min-h-[320px]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{ward.label}</h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditing) {
                          closeEditor();
                        } else {
                          openEditor(currentType);
                        }
                      }}
                      disabled={isSaving}
                      className="ml-2 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEditing ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Close
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
                  </div>
                  <p className="text-sm text-gray-600">Total capacity: {isEditing ? previewTotal : data.total} beds</p>
                </div>
                <div className="text-right ml-4">
                  <div
                    className={
                      `px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap inline-flex items-center border ` +
                      (availableForBadge > 5
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : availableForBadge > 0
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200')
                    }
                  >
                    {availableForBadge} available
                  </div>
                </div>
              </div>

              {/* AC/Non-AC Toggle Buttons for General, Pediatrics, and Maternity */}
              {ward.toggleType === 'ac' && (
                <div className="mb-3">
                  <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeEditorKey && activeEditorKey.startsWith(`${ward.type}_`)) closeEditor();
                        setAcToggle({ ...acToggle, [ward.type]: 'ac' });
                      }}
                      className={
                        `px-3 py-1.5 rounded-md text-sm font-semibold transition ` +
                        (acToggle[ward.type] === 'ac'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900')
                      }
                    >
                      AC
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeEditorKey && activeEditorKey.startsWith(`${ward.type}_`)) closeEditor();
                        setAcToggle({ ...acToggle, [ward.type]: 'non_ac' });
                      }}
                      className={
                        `px-3 py-1.5 rounded-md text-sm font-semibold transition ` +
                        (acToggle[ward.type] === 'non_ac'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900')
                      }
                    >
                      Non-AC
                    </button>
                  </div>
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
                        if (activeEditorKey && activeEditorKey.startsWith('private_')) closeEditor();
                        setPrivateRoomToggle(option.value);
                      }}
                      className={
                        `px-3 py-1.5 rounded-lg font-semibold text-xs transition whitespace-nowrap border ` +
                        (privateRoomToggle === option.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300')
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Inline Editor */}
              {isEditing && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Total beds</label>
                      <input
                        type="number"
                        min="0"
                        value={editorDraft.total}
                        onChange={(e) => setEditorDraft((prev) => ({ ...prev, total: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Reserved beds</label>
                      <input
                        type="number"
                        min="0"
                        value={editorDraft.reserved}
                        onChange={(e) => setEditorDraft((prev) => ({ ...prev, reserved: e.target.value }))}
                        className={
                          `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium ` +
                          (hasDraftError ? 'border-red-300' : 'border-gray-300')
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className={`text-xs ${hasDraftError ? 'text-red-600' : 'text-gray-500'}`}>
                      Available will be: {Math.max(0, previewAvailable)}
                    </p>
                    {hasDraftError && (
                      <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                        Reserved cannot exceed total
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeEditor}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditor(currentType)}
                      disabled={isSaving || hasDraftError}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Info Section for cards without toggles */}
              {!ward.hasToggle && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-bold text-2xl text-gray-900">{data.total}</div>
                  <div className="text-xs text-gray-600 mt-0.5 font-semibold">Total</div>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-bold text-2xl text-blue-800">{data.available}</div>
                  <div className="text-xs text-blue-700 mt-0.5 font-semibold">Available</div>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  {/* Show actual booking count if available, otherwise show reserved_beds */}
                  <div className="font-bold text-2xl text-amber-800">
                    {(bookingsByWard[currentType] || []).length || data.reserved}
                  </div>
                  <div className="text-xs text-amber-700 mt-0.5 font-semibold">Reserved</div>
                </div>
              </div>

              {/* View Patients Button - only show if there are actual bookings */}
              {(() => {
                const currentBookings = bookingsByWard[currentType] || [];

                let bookingKeyForModal = currentType;
                let totalBookingsCount = currentBookings.length;

                // Private rooms have multiple sub-types; show the button if any option has bookings.
                if (ward.toggleType === 'private' && ward.options) {
                  const privateKeys = ward.options.map((o) => o.value);
                  const total = privateKeys.reduce(
                    (sum, key) => sum + ((bookingsByWard[key] || []).length || 0),
                    0
                  );
                  totalBookingsCount = total;

                  // If current selection has no bookings, default the modal to the first option that does.
                  if (currentBookings.length === 0) {
                    const firstWithBookings = privateKeys.find((k) => (bookingsByWard[k] || []).length > 0);
                    if (firstWithBookings) bookingKeyForModal = firstWithBookings;
                  }
                }

                const hasBookings = totalBookingsCount > 0;

                if (hasBookings) {
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(bookingKeyForModal, ward.label);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        View {totalBookingsCount} Patient{totalBookingsCount !== 1 ? 's' : ''}
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          );
        })}
      </div>

      {/* Patient Info Modal */}
      {showPatientModal && selectedWardInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowPatientModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden transform animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 bg-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedWardInfo.wardLabel}</h3>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                    {selectedWardInfo.patients.length} reserved
                  </span>
                </div>
                <p className="text-gray-600 text-sm">Patient reservations for this ward</p>
              </div>
              <button
                onClick={() => setShowPatientModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {selectedWardInfo.patients.length > 0 ? (
                <div className="space-y-6">
                  {selectedWardInfo.patients.map((patient, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      {/* Patient Header */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-5 pb-4 border-b border-gray-200">
                        <div className="mb-3 md:mb-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {patient.patient_name?.charAt(0)?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-gray-900">{patient.patient_name}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                {patient.patient_age && <span>{patient.patient_age} years</span>}
                                {patient.patient_gender && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    patient.patient_gender === 'male' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    patient.patient_gender === 'female' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                                    'bg-gray-50 text-gray-700 border border-gray-200'
                                  }`}>
                                    {patient.patient_gender.charAt(0).toUpperCase() + patient.patient_gender.slice(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-sm">
                            {patient.bed_number}
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Confirmed
                          </span>
                        </div>
                      </div>
                      
                      {/* Patient Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Admission Date */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Admission Date</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.admission_date || 'Not specified'}</p>
                        </div>
                        
                        {/* Admission Reason */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Reason</span>
                          </div>
                          <p className="text-gray-900 font-medium text-sm">{patient.admission_reason}</p>
                        </div>
                        
                        {/* Contact Number */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Phone</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.patient_phone}</p>
                        </div>
                        
                        {/* Emergency Contact */}
                        {patient.emergency_contact && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-white p-2 rounded-lg border border-gray-200">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Emergency</span>
                            </div>
                            <p className="text-gray-900 font-medium">{patient.emergency_contact}</p>
                          </div>
                        )}
                        
                        {/* Patient Email */}
                        {patient.patient_email && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-white p-2 rounded-lg border border-gray-200">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-700">Email</span>
                            </div>
                            <p className="text-gray-900 font-medium text-sm">{patient.patient_email}</p>
                          </div>
                        )}
                        
                        {/* Booking Info */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-700">Booking ID</span>
                          </div>
                          <p className="text-gray-900 font-medium">{patient.booking_id}</p>
                          <p className="text-gray-500 text-xs mt-1">Booked: {patient.created_at}</p>
                        </div>
                      </div>
                      
                      {/* Booked By Section */}
                      {patient.booked_by && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-2">
                            <span className="font-medium">Booked by:</span> {patient.booked_by.name} 
                            {patient.booked_by.email && <span className="ml-1">({patient.booked_by.email})</span>}
                            {patient.booked_by.phone && <span className="ml-2">• {patient.booked_by.phone}</span>}
                          </p>
                        </div>
                      )}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-slideUp overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Update saved</h3>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-gray-700">Bed status has been updated successfully.</p>
                  <p className="text-sm text-gray-500 mt-1">Emergency routing will use the latest availability.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-slideUp overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Validation error</h3>
              <button
                onClick={() => setShowWarningModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-gray-700">{warningMessage}</p>
                  <p className="text-sm text-gray-500 mt-1">Please correct the values and try again.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
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
      `}</style>
    </div>
  );
};

export default HospitalBedManagement;
