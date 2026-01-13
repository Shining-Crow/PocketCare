
from flask import Blueprint, jsonify, request
from utils.database import get_db_connection, execute_query
from utils.auth_utils import jwt_required_custom
from flask_jwt_extended import get_jwt_identity

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('/doctors/<int:id>', methods=['GET'])
def get_doctor(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""SELECT id, name, email, phone, specialty, qualification, 
                      experience, rating, consultation_fee, bio, available_slots, 
                      available_days, created_at FROM doctors WHERE id=%s""", (id,))
    doctor = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(doctor)


# Get doctor profile (for logged-in doctor)
@doctors_bp.route('/doctor/profile', methods=['GET'])
@jwt_required_custom
def get_doctor_profile():
    """Get logged-in doctor's profile"""
    try:
        doctor_id = get_jwt_identity()
        
        query = """
            SELECT id, name, email, phone, specialty, qualification, 
                   experience, rating, consultation_fee, bio, available_slots,
                   available_days, created_at
            FROM doctors 
            WHERE id = %s
        """
        doctor = execute_query(query, (doctor_id,), fetch_one=True)
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Convert datetime to string
        if doctor.get('created_at'):
            doctor['created_at'] = doctor['created_at'].isoformat()
        
        return jsonify({'doctor': doctor}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500


# Update doctor profile
@doctors_bp.route('/doctor/profile', methods=['PUT'])
@jwt_required_custom
def update_doctor_profile():
    """Update logged-in doctor's profile"""
    try:
        doctor_id = get_jwt_identity()
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = ['name', 'phone', 'specialty', 'qualification', 
                         'experience', 'consultation_fee', 'bio', 'available_slots', 'available_days']
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        update_values.append(doctor_id)
        
        query = f"UPDATE doctors SET {', '.join(update_fields)} WHERE id = %s"
        execute_query(query, tuple(update_values), commit=True)
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500


# Get doctor statistics
@doctors_bp.route('/doctor/stats', methods=['GET'])
@jwt_required_custom
def get_doctor_stats():
    """Get statistics for logged-in doctor"""
    try:
        doctor_id = get_jwt_identity()
        
        # Get total appointments
        total_query = """
            SELECT COUNT(*) as total 
            FROM appointments 
            WHERE doctor_id = %s
        """
        total_result = execute_query(total_query, (doctor_id,), fetch_one=True)
        total_appointments = total_result['total'] if total_result else 0
        
        # Get completed appointments
        completed_query = """
            SELECT COUNT(*) as completed 
            FROM appointments 
            WHERE doctor_id = %s AND status = 'completed'
        """
        completed_result = execute_query(completed_query, (doctor_id,), fetch_one=True)
        completed_appointments = completed_result['completed'] if completed_result else 0
        
        # Get unique patients count
        patients_query = """
            SELECT COUNT(DISTINCT user_id) as patients 
            FROM appointments 
            WHERE doctor_id = %s
        """
        patients_result = execute_query(patients_query, (doctor_id,), fetch_one=True)
        total_patients = patients_result['patients'] if patients_result else 0
        
        # Get today's appointments count
        today_query = """
            SELECT COUNT(*) as today 
            FROM appointments 
            WHERE doctor_id = %s AND appointment_date = CURDATE()
        """
        today_result = execute_query(today_query, (doctor_id,), fetch_one=True)
        today_appointments = today_result['today'] if today_result else 0
        
        return jsonify({
            'total_appointments': total_appointments,
            'completed_appointments': completed_appointments,
            'total_patients': total_patients,
            'today_appointments': today_appointments
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch stats: {str(e)}'}), 500


# Get doctor's appointments
@doctors_bp.route('/doctor/appointments', methods=['GET'])
@jwt_required_custom
def get_doctor_appointments():
    """Get appointments for logged-in doctor, optionally filtered by date"""
    try:
        doctor_id = get_jwt_identity()
        date_filter = request.args.get('date')  # Optional date filter
        
        if date_filter:
            # Get appointments for specific date
            query = """
                SELECT a.id, a.appointment_date, a.appointment_time, a.symptoms, 
                       a.status, a.notes, a.created_at,
                       u.name as patient_name, u.phone as patient_phone
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                WHERE a.doctor_id = %s AND a.appointment_date = %s
                ORDER BY a.appointment_time
            """
            appointments = execute_query(query, (doctor_id, date_filter), fetch_all=True)
        else:
            # Get all appointments
            query = """
                SELECT a.id, a.appointment_date, a.appointment_time, a.symptoms, 
                       a.status, a.notes, a.created_at,
                       u.name as patient_name, u.phone as patient_phone
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                WHERE a.doctor_id = %s
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT 50
            """
            appointments = execute_query(query, (doctor_id,), fetch_all=True)
        
        # Convert datetime objects to strings
        for apt in appointments:
            if apt.get('appointment_date'):
                apt['appointment_date'] = apt['appointment_date'].isoformat()
            if apt.get('appointment_time'):
                # Convert time to string
                apt['appointment_time'] = str(apt['appointment_time'])
            if apt.get('created_at'):
                apt['created_at'] = apt['created_at'].isoformat()
        
        return jsonify({'appointments': appointments}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch appointments: {str(e)}'}), 500
