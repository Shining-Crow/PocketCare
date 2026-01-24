
from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
from flask_jwt_extended import get_jwt_identity, jwt_required
import re
import pymysql
from datetime import datetime

appointments_bp = Blueprint('appointments', __name__)

# Get user appointments
@appointments_bp.route('/user/appointments', methods=['GET'])
@jwt_required()
def get_user_appointments():
    """Get appointments for logged-in user (patient)"""
    try:
        raw_identity = get_jwt_identity()
        user_id = int(raw_identity)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch user's appointments with doctor details
        cursor.execute("""
            SELECT a.id, a.appointment_date, a.appointment_time, a.symptoms, 
                   a.status, a.notes, a.created_at,
                   d.name as doctor_name, d.specialty, d.phone as doctor_phone,
                   d.consultation_fee
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.user_id = %s
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """, (user_id,))
        
        appointments = cursor.fetchall()
        
        # Convert datetime objects to strings
        for apt in appointments:
            if apt.get('appointment_date'):
                apt['appointment_date'] = apt['appointment_date'].isoformat()
            if apt.get('appointment_time'):
                apt['appointment_time'] = str(apt['appointment_time'])
            if apt.get('created_at'):
                apt['created_at'] = apt['created_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return jsonify({'appointments': appointments}), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid user ID'}), 400
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch appointments: {str(e)}'}), 500

# GET all doctors
@appointments_bp.route('/doctors', methods=['GET', 'OPTIONS'])
def get_doctors():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        name = request.args.get('name')
        specialty = request.args.get('specialty')
        min_fee = request.args.get('min_fee')
        max_fee = request.args.get('max_fee')

        # Only select non-sensitive columns. Some deployments may have an older
        # doctors table missing optional columns, so detect which ones exist.
        desired_columns = [
            'id',
            'name',
            'specialty',
            'qualification',
            'experience',
            'rating',
            'consultation_fee',
            'bio',
            'available_slots',
            'available_days',
            'is_available',
        ]

        cursor.execute('SELECT DATABASE() AS db')
        row = cursor.fetchone() or {}
        db_name = row.get('db')

        existing_columns = set()
        if db_name:
            cursor.execute(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'doctors'
                """,
                (db_name,),
            )
            existing_columns = {r.get('COLUMN_NAME') for r in (cursor.fetchall() or []) if r.get('COLUMN_NAME')}

        selected_columns = [c for c in desired_columns if (not existing_columns) or (c in existing_columns)]
        # Safety: always include minimal identifiers
        if 'id' not in selected_columns:
            selected_columns.insert(0, 'id')
        if 'name' not in selected_columns:
            selected_columns.insert(1, 'name')
        if 'specialty' not in selected_columns:
            selected_columns.insert(2, 'specialty')

        query = f"SELECT {', '.join(selected_columns)} FROM doctors WHERE 1=1"
        params = []

        if name:
            query += " AND name LIKE %s"
            params.append(f"%{name}%")

        if specialty:
            query += " AND specialty=%s"
            params.append(specialty)

        if min_fee is not None and max_fee is not None:
            try:
                min_v = float(min_fee)
                max_v = float(max_fee)
            except (TypeError, ValueError):
                return jsonify({'error': 'min_fee and max_fee must be numbers'}), 400
            query += " AND consultation_fee BETWEEN %s AND %s"
            params.extend([min_v, max_v])

        cursor.execute(query, params)
        doctors = cursor.fetchall()
        return jsonify(doctors), 200
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch doctors: {str(e)}'}), 500
    finally:
        try:
            if cursor:
                cursor.close()
        finally:
            if conn:
                conn.close()

from flask_jwt_extended import jwt_required


@appointments_bp.route('/appointments', methods=['OPTIONS'])
def appointments_preflight():
    return ('', 204)

@appointments_bp.route('/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    data = request.get_json(silent=True) or {}

    missing = [k for k in ('doctor_id', 'appointment_date', 'appointment_time') if k not in data]
    if missing:
        return jsonify({'error': 'Missing required fields', 'missing': missing}), 400

    raw_identity = get_jwt_identity()
    try:
        user_id = int(raw_identity)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid authentication identity'}), 401
    doctor_id = data.get('doctor_id')

    appointment_date = data.get('appointment_date')
    appointment_time = data.get('appointment_time')
    is_emergency = data.get('is_emergency', False)

    # Store original time slot for duration calculation
    original_time_slot = appointment_time
    
    if isinstance(appointment_time, str) and '-' in appointment_time:
        appointment_time = appointment_time.split('-', 1)[0].strip()

    if isinstance(appointment_time, str) and re.fullmatch(r"\d{2}:\d{2}", appointment_time):
        appointment_time = f"{appointment_time}:00"

    if not (isinstance(appointment_time, str) and re.fullmatch(r"\d{2}:\d{2}:\d{2}", appointment_time)):
        return jsonify({'error': 'Invalid appointment_time format', 'expected': 'HH:MM or HH:MM:SS or HH:MM-HH:MM'}), 400

    # Validate that the appointment is not in the past
    try:
        # Parse the appointment date and time
        appointment_datetime_str = f"{appointment_date} {appointment_time}"
        appointment_datetime = datetime.strptime(appointment_datetime_str, "%Y-%m-%d %H:%M:%S")
        
        # Get current datetime
        now = datetime.now()
        
        # Check if appointment is in the past
        if appointment_datetime < now:
            return jsonify({
                'error': 'Cannot book appointments in the past',
                'message': 'Please select a future date and time'
            }), 400
    except ValueError as e:
        return jsonify({'error': f'Invalid date/time format: {str(e)}'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure the caller is a real user (not a doctor/admin token)
        cursor.execute('SELECT id FROM users WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Only users can book appointments with this endpoint'}), 403

        # Ensure doctor exists and is available
        cursor.execute('SELECT id, is_available FROM doctors WHERE id = %s', (int(doctor_id),))
        doctor = cursor.fetchone()
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Check if doctor is available for booking
        if not doctor.get('is_available', True):
            return jsonify({
                'error': 'Doctor is currently unavailable',
                'message': 'This doctor is currently not accepting new appointments. Please try another doctor or check back later.'
            }), 400

        # Calculate max appointments based on time slot duration (5 users per hour)
        max_appointments = 5  # Default for 1 hour or unknown duration
        
        if isinstance(original_time_slot, str) and '-' in original_time_slot:
            try:
                # Parse time slot range like "09:00-11:00"
                start_time_str, end_time_str = original_time_slot.split('-')
                start_parts = start_time_str.strip().split(':')
                end_parts = end_time_str.strip().split(':')
                
                start_hour = int(start_parts[0])
                start_min = int(start_parts[1]) if len(start_parts) > 1 else 0
                end_hour = int(end_parts[0])
                end_min = int(end_parts[1]) if len(end_parts) > 1 else 0
                
                # Calculate duration in hours
                duration_hours = (end_hour - start_hour) + (end_min - start_min) / 60.0
                
                # 5 appointments per hour
                max_appointments = int(duration_hours * 5)
                
                # Ensure at least 5 appointments for any valid slot
                if max_appointments < 5:
                    max_appointments = 5
                    
            except (ValueError, IndexError):
                # If parsing fails, use default of 5
                pass

        # Check timeslot capacity (max appointments based on duration)
        # Only check for non-emergency appointments
        if not is_emergency:
            cursor.execute(
                """
                SELECT COUNT(*) as count 
                FROM appointments 
                WHERE doctor_id = %s 
                AND appointment_date = %s 
                AND appointment_time = %s 
                AND status IN ('pending', 'confirmed')
                """,
                (int(doctor_id), appointment_date, appointment_time)
            )
            result = cursor.fetchone()
            slot_count = result['count'] if result else 0
            
            if slot_count >= max_appointments:
                return jsonify({
                    'error': 'Timeslot is full',
                    'message': f'This timeslot already has {max_appointments} appointments. If this is an emergency, please select the emergency option.',
                    'slot_full': True,
                    'max_appointments': max_appointments,
                    'current_count': slot_count
                }), 400

        # For emergency appointments, always require doctor approval (pending status)
        # For normal appointments, auto-confirm if slot is available
        status = 'pending' if is_emergency else 'confirmed'

        cursor.execute(
            """
            INSERT INTO appointments 
            (user_id, doctor_id, appointment_date, appointment_time, symptoms, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                int(doctor_id),
                appointment_date,
                appointment_time,
                data.get('symptoms'),
                status,
            ),
        )
        conn.commit()
        
        message = "Emergency appointment request sent to doctor" if is_emergency else "Appointment confirmed automatically"
        return jsonify({
            "message": message,
            "status": status,
            "is_emergency": is_emergency
        }), 201
    except (ValueError, TypeError):
        return jsonify({'error': 'doctor_id must be an integer'}), 400
    except pymysql.MySQLError as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({'error': f'Database error while booking appointment: {str(e)}'}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# Cancel appointment endpoint
@appointments_bp.route('/appointments/<int:appointment_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_appointment(appointment_id):
    """Cancel an appointment - can be done by patient or doctor"""
    try:
        raw_identity = get_jwt_identity()
        user_id = int(raw_identity)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get appointment details first to verify ownership
        cursor.execute("""
            SELECT a.user_id, a.doctor_id, a.status, u.name as patient_name, d.name as doctor_name
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = %s
        """, (appointment_id,))
        
        appointment = cursor.fetchone()
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Check if user is authorized to cancel this appointment
        # Either the patient who booked it or the doctor
        is_patient = appointment['user_id'] == user_id
        is_doctor = appointment['doctor_id'] == user_id
        
        if not (is_patient or is_doctor):
            return jsonify({'error': 'You are not authorized to cancel this appointment'}), 403
        
        # Check if appointment is already cancelled or completed
        if appointment['status'] in ['cancelled', 'completed']:
            return jsonify({'error': f'Cannot cancel appointment that is already {appointment["status"]}'}), 400
        
        # Update appointment status to cancelled
        cursor.execute("""
            UPDATE appointments 
            SET status = 'cancelled'
            WHERE id = %s
        """, (appointment_id,))
        
        conn.commit()
        
        canceller_type = "doctor" if is_doctor else "patient"
        return jsonify({
            'message': f'Appointment cancelled successfully by {canceller_type}',
            'appointment_id': appointment_id,
            'cancelled_by': canceller_type
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid user ID'}), 400
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to cancel appointment: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Accept/Confirm appointment endpoint (doctors only)
@appointments_bp.route('/appointments/<int:appointment_id>/confirm', methods=['PUT'])
@jwt_required()
def confirm_appointment(appointment_id):
    """Confirm/Accept an appointment - can only be done by doctor"""
    conn = None
    cursor = None
    try:
        raw_identity = get_jwt_identity()
        doctor_id = int(raw_identity)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify the doctor exists
        cursor.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        doctor = cursor.fetchone()
        
        if not doctor:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Only doctors can confirm appointments'}), 403
        
        # Get appointment details
        cursor.execute("""
            SELECT id, doctor_id, status
            FROM appointments
            WHERE id = %s
        """, (appointment_id,))
        
        appointment = cursor.fetchone()
        
        if not appointment:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Check if the doctor owns this appointment
        if doctor_id != appointment['doctor_id']:
            cursor.close()
            conn.close()
            return jsonify({'error': 'You are not authorized to confirm this appointment'}), 403
        
        # Check current status
        if appointment['status'].lower() == 'cancelled':
            cursor.close()
            conn.close()
            return jsonify({'error': 'Cannot confirm a cancelled appointment'}), 400
        
        if appointment['status'].lower() == 'confirmed':
            cursor.close()
            conn.close()
            return jsonify({'message': 'Appointment is already confirmed'}), 200
        
        # Update appointment status to confirmed
        cursor.execute(
            "UPDATE appointments SET status = 'confirmed' WHERE id = %s",
            (appointment_id,)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Appointment confirmed successfully'}), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid appointment ID'}), 400
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to accept appointment: {str(e)}'}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# Delete appointment endpoint (only for cancelled appointments)
@appointments_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(appointment_id):
    """Delete a cancelled appointment - can be done by patient or doctor"""
    try:
        raw_identity = get_jwt_identity()
        current_user_id = int(raw_identity)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get appointment details
        cursor.execute("""
            SELECT a.id, a.user_id, a.doctor_id, a.status
            FROM appointments a
            WHERE a.id = %s
        """, (appointment_id,))
        
        appointment = cursor.fetchone()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Check if the current user is authorized to delete this appointment
        is_authorized = False
        
        # Check if current user is the patient
        if current_user_id == appointment['user_id']:
            is_authorized = True
        else:
            # Check if current user is the doctor
            cursor.execute("SELECT id FROM doctors WHERE id = %s", (current_user_id,))
            doctor = cursor.fetchone()
            if doctor and current_user_id == appointment['doctor_id']:
                is_authorized = True
        
        if not is_authorized:
            return jsonify({'error': 'You are not authorized to delete this appointment'}), 403
        
        # Only allow deletion of cancelled appointments
        if appointment['status'].lower() != 'cancelled':
            return jsonify({'error': 'Only cancelled appointments can be deleted'}), 400
        
        # Delete the appointment
        cursor.execute("DELETE FROM appointments WHERE id = %s", (appointment_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Appointment deleted successfully'}), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid user ID or appointment ID'}), 400
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to delete appointment: {str(e)}'}), 500

# Check slot availability endpoint
@appointments_bp.route('/appointments/check-availability', methods=['POST'])
@jwt_required()
def check_slot_availability():
    """Check available slots for a specific doctor, date, and time"""
    try:
        data = request.get_json(silent=True) or {}
        
        doctor_id = data.get('doctor_id')
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')
        
        if not all([doctor_id, appointment_date, appointment_time]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Store original time slot for duration calculation
        original_time_slot = appointment_time
        
        # Parse the time slot
        if isinstance(appointment_time, str) and '-' in appointment_time:
            appointment_time = appointment_time.split('-', 1)[0].strip()
        
        if isinstance(appointment_time, str) and re.fullmatch(r"\d{2}:\d{2}", appointment_time):
            appointment_time = f"{appointment_time}:00"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate max appointments based on time slot duration (5 users per hour)
        max_appointments = 5  # Default for 1 hour or unknown duration
        duration_hours = 1.0
        
        if isinstance(original_time_slot, str) and '-' in original_time_slot:
            try:
                # Parse time slot range like "09:00-11:00"
                start_time_str, end_time_str = original_time_slot.split('-')
                start_parts = start_time_str.strip().split(':')
                end_parts = end_time_str.strip().split(':')
                
                start_hour = int(start_parts[0])
                start_min = int(start_parts[1]) if len(start_parts) > 1 else 0
                end_hour = int(end_parts[0])
                end_min = int(end_parts[1]) if len(end_parts) > 1 else 0
                
                # Calculate duration in hours
                duration_hours = (end_hour - start_hour) + (end_min - start_min) / 60.0
                
                # 5 appointments per hour
                max_appointments = int(duration_hours * 5)
                
                # Ensure at least 5 appointments for any valid slot
                if max_appointments < 5:
                    max_appointments = 5
                    
            except (ValueError, IndexError):
                # If parsing fails, use default of 5
                pass
        
        # Get current appointment count for this slot
        cursor.execute(
            """
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE doctor_id = %s 
            AND appointment_date = %s 
            AND appointment_time = %s 
            AND status IN ('pending', 'confirmed')
            """,
            (int(doctor_id), appointment_date, appointment_time)
        )
        result = cursor.fetchone()
        current_count = result['count'] if result else 0
        
        cursor.close()
        conn.close()
        
        available_slots = max_appointments - current_count
        is_available = available_slots > 0
        
        return jsonify({
            'is_available': is_available,
            'max_appointments': max_appointments,
            'current_count': current_count,
            'available_slots': available_slots,
            'duration_hours': duration_hours
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to check availability: {str(e)}'}), 500
