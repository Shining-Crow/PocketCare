import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Bed,
  Building2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  RefreshCw
} from 'lucide-react';
import Footer from '../components/Footer';
import BackToDashboardButton from '../components/BackToDashboardButton';

function MyBedBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/user/bed-bookings');
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setCancellingId(bookingId);
      await api.delete(`/user/bed-bookings/${bookingId}`);
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: Clock, text: 'Pending' },
      confirmed: { color: 'green', icon: CheckCircle, text: 'Confirmed' },
      rejected: { color: 'red', icon: XCircle, text: 'Rejected' },
      cancelled: { color: 'gray', icon: XCircle, text: 'Cancelled' },
      completed: { color: 'blue', icon: CheckCircle, text: 'Completed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-${config.color}-100 text-${config.color}-700`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
  };

  const getWardLabel = (wardType, acType, roomConfig) => {
    const wardLabels = {
      general: 'General Ward',
      pediatrics: 'Pediatrics Ward',
      maternity: 'Maternity Ward',
      icu: 'ICU',
      emergency: 'Emergency',
      private_room: 'Private Room'
    };

    let label = wardLabels[wardType] || wardType;
    
    if (acType === 'ac') label += ' (AC)';
    else if (acType === 'non_ac') label += ' (Non-AC)';
    
    if (roomConfig) {
      const configLabels = {
        '1_bed_no_bath': '1 Bed',
        '1_bed_with_bath': '1 Bed + Bath',
        '2_bed_with_bath': '2 Beds + Bath'
      };
      label += ` - ${configLabels[roomConfig] || roomConfig}`;
    }

    return label;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BackToDashboardButton />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Bed Bookings</h1>
                  <p className="text-sm text-gray-500">View and manage your hospital bed booking requests</p>
                </div>
              </div>
              <button
                onClick={fetchBookings}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bed className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Yet</h2>
              <p className="text-gray-600 mb-6">You haven't made any bed booking requests yet.</p>
              <button
                onClick={() => navigate('/hospitals')}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Find a Hospital
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Hospital & Ward Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{booking.hospital_name}</h3>
                          <p className="text-sm text-gray-600">{booking.hospital_address}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                          <Bed className="w-4 h-4" />
                          {getWardLabel(booking.ward_type, booking.ac_type, booking.room_config)}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Patient:</span>
                          <span className="ml-2 text-gray-900 font-medium">{booking.patient_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Age:</span>
                          <span className="ml-2 text-gray-900">{booking.patient_age || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Admission:</span>
                          <span className="ml-1 text-gray-900">{booking.admission_date}</span>
                        </div>
                        {booking.expected_discharge_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500">Discharge:</span>
                            <span className="ml-1 text-gray-900">{booking.expected_discharge_date}</span>
                          </div>
                        )}
                      </div>

                      {booking.medical_condition && (
                        <p className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Condition:</span> {booking.medical_condition}
                        </p>
                      )}

                      {booking.notes && booking.status !== 'pending' && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                          Hospital note: {booking.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2">
                      {booking.hospital_phone && (
                        <a
                          href={`tel:${booking.hospital_phone}`}
                          className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Phone className="w-4 h-4" />
                          Call Hospital
                        </a>
                      )}
                      {['pending', 'confirmed'].includes(booking.status) && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                    Booked on: {new Date(booking.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default MyBedBookings;
