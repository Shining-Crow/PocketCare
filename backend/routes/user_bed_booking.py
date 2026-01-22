from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.database import get_db_connection
import pymysql

user_bed_booking_bp = Blueprint('user_bed_booking', __name__)


def clean_value(val):
    """Convert empty strings to None for database fields"""
    if val == '' or val is None:
        return None
    return val


def get_hospital_id_from_jwt():
    """Extract hospital ID from JWT identity (handles 'hospital_X' format)"""
    jwt_identity = get_jwt_identity()
    if isinstance(jwt_identity, str) and jwt_identity.startswith('hospital_'):
        return int(jwt_identity.replace('hospital_', ''))
    return int(jwt_identity)


def get_user_id_from_jwt():
    """Extract user ID from JWT identity (handles 'user_X' format if applicable)"""
    jwt_identity = get_jwt_identity()
    if isinstance(jwt_identity, str) and jwt_identity.startswith('user_'):
        return int(jwt_identity.replace('user_', ''))
    return int(jwt_identity)


# DEBUG endpoint - remove in production
@user_bed_booking_bp.route('/debug/all-bookings', methods=['GET'])
def debug_all_bookings():
    """Debug endpoint to see all bookings in the database"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, user_id, hospital_id, ward_type, ac_type, patient_name, status, created_at
            FROM user_bed_bookings
            ORDER BY id DESC
            LIMIT 20
        """)
        bookings = cursor.fetchall()
        
        # Convert datetime objects to strings
        result = []
        for b in bookings:
            result.append({
                'id': b['id'],
                'user_id': b['user_id'],
                'hospital_id': b['hospital_id'],
                'ward_type': b['ward_type'],
                'ac_type': b['ac_type'],
                'patient_name': b['patient_name'],
                'status': b['status'],
                'created_at': str(b['created_at']) if b['created_at'] else None
            })
        
        return jsonify({'bookings': result, 'count': len(result)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@user_bed_booking_bp.route('/user/bed-bookings', methods=['POST'])
@jwt_required()
def create_bed_booking():
    """Create a new bed booking request from a user"""
    conn = None
    cursor = None
    try:
        user_id = get_user_id_from_jwt()
        data = request.get_json()
        
        # Required fields
        hospital_id = data.get('hospital_id')
        ward_type = data.get('ward_type')
        patient_name = data.get('patient_name')
        patient_phone = data.get('patient_phone')
        admission_date = data.get('admission_date')  # Maps to preferred_date in DB
        
        if not all([hospital_id, ward_type, patient_name, patient_phone, admission_date]):
            return jsonify({'error': 'Missing required fields: hospital_id, ward_type, patient_name, patient_phone, admission_date'}), 400
        
        # Optional fields - clean empty strings
        ac_type = clean_value(data.get('ac_type')) or 'not_applicable'
        room_config = clean_value(data.get('room_config'))
        patient_age = clean_value(data.get('patient_age'))
        patient_gender = clean_value(data.get('patient_gender'))
        patient_email = clean_value(data.get('patient_email'))
        emergency_contact = clean_value(data.get('emergency_contact'))
        medical_condition = clean_value(data.get('medical_condition'))  # Maps to admission_reason in DB
        expected_discharge_date = clean_value(data.get('expected_discharge_date'))
        doctor_name = clean_value(data.get('doctor_name'))
        special_requirements = clean_value(data.get('special_requirements'))
        notes = clean_value(data.get('notes'))
        
        conn = get_db_connection()
        cursor = conn.cursor()

        # Default patient_email to the logged-in user's email when not explicitly provided.
        if not patient_email:
            try:
                cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
                user_row = cursor.fetchone()
                if user_row and user_row.get('email'):
                    patient_email = user_row['email']
            except Exception:
                # Non-fatal: booking can proceed without patient_email.
                pass
        
        # Verify hospital exists
        cursor.execute("SELECT id, name FROM hospitals WHERE id = %s", (hospital_id,))
        hospital = cursor.fetchone()
        if not hospital:
            return jsonify({'error': 'Hospital not found'}), 404
        
        # Ensure private room bookings don't accidentally carry AC/Non-AC selection.
        if ward_type == 'private_room':
            ac_type = 'not_applicable'

        # Check bed availability before booking
        if ward_type == 'private_room' and room_config:
            cursor.execute("""
                SELECT available_beds FROM bed_wards 
                WHERE hospital_id = %s AND ward_type = %s AND room_config = %s
            """, (hospital_id, ward_type, room_config))
        elif ward_type in ['icu', 'emergency']:
            cursor.execute("""
                SELECT available_beds FROM bed_wards 
                WHERE hospital_id = %s AND ward_type = %s
            """, (hospital_id, ward_type))
        else:
            cursor.execute("""
                SELECT available_beds FROM bed_wards 
                WHERE hospital_id = %s AND ward_type = %s AND ac_type = %s
            """, (hospital_id, ward_type, ac_type))
        
        bed_availability = cursor.fetchone()
        if not bed_availability or bed_availability['available_beds'] <= 0:
            return jsonify({'error': 'No beds available for the selected ward type. Please choose a different option.'}), 400
        
        # Insert booking (using actual DB column names) - Status is 'confirmed' immediately
        cursor.execute("""
            INSERT INTO user_bed_bookings (
                user_id, hospital_id, ward_type, ac_type, room_config,
                patient_name, patient_age, patient_gender, patient_phone,
                patient_email, emergency_contact, preferred_date,
                expected_discharge_date, admission_reason, doctor_name,
                special_requirements, notes, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'confirmed')
        """, (
            user_id, hospital_id, ward_type, ac_type, room_config,
            patient_name, patient_age, patient_gender, patient_phone,
            patient_email, emergency_contact, admission_date,
            expected_discharge_date, medical_condition, doctor_name,
            special_requirements, notes
        ))
        
        # Update bed_wards table: decrease available_beds and increase reserved_beds
        if ward_type == 'private_room' and room_config:
            cursor.execute("""
                UPDATE bed_wards 
                SET available_beds = available_beds - 1, reserved_beds = reserved_beds + 1
                WHERE hospital_id = %s AND ward_type = %s AND room_config = %s AND available_beds > 0
            """, (hospital_id, ward_type, room_config))
        elif ward_type in ['icu', 'emergency']:
            cursor.execute("""
                UPDATE bed_wards 
                SET available_beds = available_beds - 1, reserved_beds = reserved_beds + 1
                WHERE hospital_id = %s AND ward_type = %s AND available_beds > 0
            """, (hospital_id, ward_type))
        else:
            cursor.execute("""
                UPDATE bed_wards 
                SET available_beds = available_beds - 1, reserved_beds = reserved_beds + 1
                WHERE hospital_id = %s AND ward_type = %s AND ac_type = %s AND available_beds > 0
            """, (hospital_id, ward_type, ac_type))
        
        conn.commit()
        booking_id = cursor.lastrowid
        
        return jsonify({
            'message': 'Bed booked successfully! Your reservation is confirmed.',
            'booking_id': booking_id,
            'hospital_name': hospital['name'],
            'status': 'confirmed'
        }), 201
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to create booking: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@user_bed_booking_bp.route('/user/bed-bookings', methods=['GET'])
@jwt_required()
def get_user_bookings():
    """Get all bed bookings for the current user"""
    conn = None
    cursor = None
    try:
        user_id = get_user_id_from_jwt()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                ubb.*,
                h.name as hospital_name,
                h.address as hospital_address,
                h.phone as hospital_phone
            FROM user_bed_bookings ubb
            JOIN hospitals h ON ubb.hospital_id = h.id
            WHERE ubb.user_id = %s
            ORDER BY ubb.created_at DESC
        """, (user_id,))
        
        bookings = cursor.fetchall()
        
        # Convert dates to strings for JSON serialization
        result = []
        for booking in bookings:
            booking_dict = dict(booking)
            # Map DB column names to frontend expected names
            if booking_dict.get('preferred_date'):
                booking_dict['admission_date'] = str(booking_dict['preferred_date'])
                booking_dict['preferred_date'] = str(booking_dict['preferred_date'])
            if booking_dict.get('expected_discharge_date'):
                booking_dict['expected_discharge_date'] = str(booking_dict['expected_discharge_date'])
            if booking_dict.get('admission_reason'):
                booking_dict['medical_notes'] = booking_dict['admission_reason']
                booking_dict['medical_condition'] = booking_dict['admission_reason']
            if booking_dict.get('created_at'):
                booking_dict['created_at'] = str(booking_dict['created_at'])
            if booking_dict.get('updated_at'):
                booking_dict['updated_at'] = str(booking_dict['updated_at'])
            result.append(booking_dict)
        
        return jsonify({'bookings': result}), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch bookings: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@user_bed_booking_bp.route('/user/bed-bookings/<int:booking_id>', methods=['DELETE'])
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a bed booking"""
    conn = None
    cursor = None
    try:
        user_id = get_user_id_from_jwt()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify booking belongs to user and get booking details
        cursor.execute("""
            SELECT id, status, hospital_id, ward_type, ac_type, room_config 
            FROM user_bed_bookings 
            WHERE id = %s AND user_id = %s
        """, (booking_id, user_id))
        
        booking = cursor.fetchone()
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking['status'] in ['cancelled', 'completed']:
            return jsonify({'error': f'Cannot cancel a {booking["status"]} booking'}), 400
        
        # Update booking status to cancelled
        cursor.execute("""
            UPDATE user_bed_bookings 
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = %s
        """, (booking_id,))
        
        # Restore bed availability: increase available_beds and decrease reserved_beds
        ward_type = booking['ward_type']
        hospital_id = booking['hospital_id']
        ac_type = booking['ac_type']
        room_config = booking['room_config']
        
        if ward_type == 'private_room' and room_config:
            cursor.execute("""
                UPDATE bed_wards 
                SET available_beds = available_beds + 1, reserved_beds = GREATEST(reserved_beds - 1, 0)
                WHERE hospital_id = %s AND ward_type = %s AND room_config = %s
            """, (hospital_id, ward_type, room_config))
        elif ward_type in ['icu', 'emergency']:
            cursor.execute("""
                UPDATE bed_wards 
                SET available_beds = available_beds + 1, reserved_beds = GREATEST(reserved_beds - 1, 0)
                WHERE hospital_id = %s AND ward_type = %s
            """, (hospital_id, ward_type))
        else:
            cursor.execute("""
                UPDATE bed_wards 
                SET available_beds = available_beds + 1, reserved_beds = GREATEST(reserved_beds - 1, 0)
                WHERE hospital_id = %s AND ward_type = %s AND ac_type = %s
            """, (hospital_id, ward_type, ac_type))
        
        conn.commit()
        
        return jsonify({'message': 'Booking cancelled successfully'}), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to cancel booking: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ============================================================================
# Hospital-side endpoints to view and manage bookings
# ============================================================================

@user_bed_booking_bp.route('/hospital/bed-bookings', methods=['GET'])
@jwt_required()
def get_hospital_bookings():
    """Get all bed bookings for the hospital (hospital admin view)"""
    conn = None
    cursor = None
    try:
        hospital_id = get_hospital_id_from_jwt()
        status_filter = request.args.get('status')
        ward_filter = request.args.get('ward_type')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                ubb.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone_registered
            FROM user_bed_bookings ubb
            JOIN users u ON ubb.user_id = u.id
            WHERE ubb.hospital_id = %s
        """
        params = [hospital_id]
        
        if status_filter:
            query += " AND ubb.status = %s"
            params.append(status_filter)
        
        if ward_filter:
            query += " AND ubb.ward_type = %s"
            params.append(ward_filter)
        
        query += " ORDER BY ubb.created_at DESC"
        
        cursor.execute(query, params)
        bookings = cursor.fetchall()
        
        # Convert dates to strings
        result = []
        for booking in bookings:
            booking_dict = dict(booking)
            # Map DB column names to frontend expected names
            if booking_dict.get('preferred_date'):
                booking_dict['admission_date'] = str(booking_dict['preferred_date'])
                booking_dict['preferred_date'] = str(booking_dict['preferred_date'])
            if booking_dict.get('expected_discharge_date'):
                booking_dict['expected_discharge_date'] = str(booking_dict['expected_discharge_date'])
            if booking_dict.get('admission_reason'):
                booking_dict['medical_notes'] = booking_dict['admission_reason']
                booking_dict['medical_condition'] = booking_dict['admission_reason']
            if booking_dict.get('created_at'):
                booking_dict['created_at'] = str(booking_dict['created_at'])
            if booking_dict.get('updated_at'):
                booking_dict['updated_at'] = str(booking_dict['updated_at'])
            result.append(booking_dict)
        
        return jsonify({'bookings': result}), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch bookings: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@user_bed_booking_bp.route('/hospital/bed-bookings/by-ward', methods=['GET'])
@jwt_required()
def get_bookings_by_ward():
    """Get bookings grouped by ward type for the hospital bed management view"""
    conn = None
    cursor = None
    try:
        hospital_id = get_hospital_id_from_jwt()
        print(f"[DEBUG] Fetching bookings for hospital_id: {hospital_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get confirmed bookings (active reservations) - no pending since we auto-confirm now
        cursor.execute("""
            SELECT 
                ubb.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone
            FROM user_bed_bookings ubb
            JOIN users u ON ubb.user_id = u.id
            WHERE ubb.hospital_id = %s
            AND ubb.status = 'confirmed'
            ORDER BY ubb.ward_type, ubb.ac_type, ubb.preferred_date DESC
        """, (hospital_id,))
        
        bookings = cursor.fetchall()
        print(f"[DEBUG] Found {len(bookings)} bookings for hospital {hospital_id}")
        
        # Group by ward_type and ac_type
        grouped = {}
        for booking in bookings:
            ward_key = booking['ward_type']
            # Private rooms must be grouped by room_config (regardless of any stored ac_type).
            if booking['ward_type'] == 'private_room' and booking['room_config']:
                # Map room_config to match frontend keys
                room_map = {
                    '1_bed_no_bath': 'private_1bed_no_bath',
                    '1_bed_with_bath': 'private_1bed_with_bath', 
                    '2_bed_with_bath': 'private_2bed_with_bath'
                }
                ward_key = room_map.get(booking['room_config'], booking['room_config'])
            elif booking['ac_type'] and booking['ac_type'] != 'not_applicable':
                ward_key = f"{booking['ward_type']}_{booking['ac_type']}"
            
            if ward_key not in grouped:
                grouped[ward_key] = []
            
            booking_dict = {
                'id': booking['id'],
                'booking_id': f"BK-{booking['id']:04d}",
                'bed_number': f"BED-{booking['id']:04d}",
                'patient_name': booking['patient_name'],
                'patient_age': booking['patient_age'],
                'patient_gender': booking['patient_gender'],
                'patient_phone': booking['patient_phone'],
                'patient_email': booking['patient_email'],
                'emergency_contact': booking['emergency_contact'],
                'admission_date': str(booking['preferred_date']) if booking['preferred_date'] else None,
                'admission_reason': booking['admission_reason'] or 'Not specified',
                'ward_type': booking['ward_type'],
                'ac_type': booking['ac_type'],
                'room_config': booking['room_config'],
                'status': booking['status'],
                'booked_by': {
                    'user_id': booking['user_id'],
                    'name': booking['user_name'],
                    'email': booking['user_email'],
                    'phone': booking['user_phone']
                },
                'created_at': str(booking['created_at']) if booking['created_at'] else None,
                'updated_at': str(booking['updated_at']) if booking['updated_at'] else None
            }
            
            grouped[ward_key].append(booking_dict)
        
        return jsonify({'success': True, 'bookings_by_ward': grouped}), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch bookings: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@user_bed_booking_bp.route('/hospital/bed-bookings/<int:booking_id>/status', methods=['PUT'])
@jwt_required()
def update_booking_status(booking_id):
    """Update booking status (confirm, reject, complete)"""
    conn = None
    cursor = None
    try:
        hospital_id = get_hospital_id_from_jwt()
        data = request.get_json()
        new_status = data.get('status')
        notes = data.get('notes')
        
        if new_status not in ['confirmed', 'rejected', 'completed', 'cancelled']:
            return jsonify({'error': 'Invalid status'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify booking belongs to this hospital
        cursor.execute("""
            SELECT id, status FROM user_bed_bookings 
            WHERE id = %s AND hospital_id = %s
        """, (booking_id, hospital_id))
        
        booking = cursor.fetchone()
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # Get full booking details for bed availability update
        cursor.execute("""
            SELECT id, status, ward_type, ac_type, room_config 
            FROM user_bed_bookings WHERE id = %s
        """, (booking_id,))
        booking_details = cursor.fetchone()
        old_status = booking_details['status']
        
        update_query = "UPDATE user_bed_bookings SET status = %s, updated_at = NOW()"
        params = [new_status]
        
        if notes:
            update_query += ", notes = %s"
            params.append(notes)
        
        update_query += " WHERE id = %s"
        params.append(booking_id)
        
        cursor.execute(update_query, params)
        
        # Handle bed availability based on status change
        ward_type = booking_details['ward_type']
        ac_type = booking_details['ac_type']
        room_config = booking_details['room_config']
        
        # If changing from confirmed to cancelled/rejected/completed - restore bed
        if old_status == 'confirmed' and new_status in ['cancelled', 'rejected', 'completed']:
            if ward_type == 'private_room' and room_config:
                cursor.execute("""
                    UPDATE bed_wards 
                    SET available_beds = available_beds + 1, reserved_beds = GREATEST(reserved_beds - 1, 0)
                    WHERE hospital_id = %s AND ward_type = %s AND room_config = %s
                """, (hospital_id, ward_type, room_config))
            elif ward_type in ['icu', 'emergency']:
                cursor.execute("""
                    UPDATE bed_wards 
                    SET available_beds = available_beds + 1, reserved_beds = GREATEST(reserved_beds - 1, 0)
                    WHERE hospital_id = %s AND ward_type = %s
                """, (hospital_id, ward_type))
            else:
                cursor.execute("""
                    UPDATE bed_wards 
                    SET available_beds = available_beds + 1, reserved_beds = GREATEST(reserved_beds - 1, 0)
                    WHERE hospital_id = %s AND ward_type = %s AND ac_type = %s
                """, (hospital_id, ward_type, ac_type))
        
        conn.commit()
        
        return jsonify({
            'message': f'Booking status updated to {new_status}',
            'booking_id': booking_id,
            'status': new_status
        }), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to update booking: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
