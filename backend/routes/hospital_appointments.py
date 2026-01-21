from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
import pymysql
from datetime import datetime, date

hospital_appointments_bp = Blueprint('hospital_appointments', __name__)

# Get all appointments for a hospital
@hospital_appointments_bp.route('/hospital-appointments', methods=['GET'])
def get_hospital_appointments():
    """Get all appointments for a specific hospital"""
    try:
        hospital_id = request.args.get('hospital_id')
        
        if not hospital_id:
            return jsonify({'error': 'hospital_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch all hospital appointments with doctor details if available
        cursor.execute("""
            SELECT 
                ha.id,
                ha.hospital_id,
                ha.hospital_doctor_id,
                ha.patient_name,
                ha.patient_phone,
                ha.patient_email,
                ha.appointment_date,
                ha.appointment_time,
                ha.department,
                ha.appointment_type,
                ha.priority,
                ha.status,
                ha.symptoms,
                ha.notes,
                ha.created_at,
                ha.updated_at,
                hd.name as doctor_name,
                hd.specialty as doctor_specialty
            FROM hospital_appointments ha
            LEFT JOIN hospital_doctors hd ON ha.hospital_doctor_id = hd.id
            WHERE ha.hospital_id = %s
            ORDER BY ha.appointment_date DESC, ha.appointment_time DESC
        """, (hospital_id,))
        
        appointments = cursor.fetchall()
        
        # Convert date and time objects to strings
        for apt in appointments:
            if apt.get('appointment_date'):
                apt['appointment_date'] = apt['appointment_date'].isoformat()
            if apt.get('appointment_time'):
                apt['appointment_time'] = str(apt['appointment_time'])
            if apt.get('created_at'):
                apt['created_at'] = apt['created_at'].isoformat()
            if apt.get('updated_at'):
                apt['updated_at'] = apt['updated_at'].isoformat()
        
        # Calculate stats
        total = len(appointments)
        today = date.today().isoformat()
        today_count = sum(1 for apt in appointments if apt.get('appointment_date') == today)
        pending = sum(1 for apt in appointments if apt.get('status') == 'pending')
        confirmed = sum(1 for apt in appointments if apt.get('status') == 'confirmed')
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'appointments': appointments,
            'stats': {
                'total': total,
                'today': today_count,
                'pending': pending,
                'confirmed': confirmed
            }
        }), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch appointments: {str(e)}'}), 500

# Create a new hospital appointment
@hospital_appointments_bp.route('/hospital-appointments', methods=['POST'])
def create_hospital_appointment():
    """Create a new appointment for a hospital"""
    try:
        data = request.get_json(silent=True) or {}
        
        # Required fields
        required_fields = ['hospital_id', 'patient_name', 'appointment_date', 'appointment_time', 'department']
        missing = [field for field in required_fields if not data.get(field)]
        
        if missing:
            return jsonify({'error': 'Missing required fields', 'missing': missing}), 400
        
        hospital_id = data.get('hospital_id')
        hospital_doctor_id = data.get('hospital_doctor_id')
        patient_name = data.get('patient_name')
        patient_phone = data.get('patient_phone')
        patient_email = data.get('patient_email')
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')
        department = data.get('department')
        appointment_type = data.get('appointment_type', 'Consultation')
        priority = data.get('priority', 'normal')
        status = data.get('status', 'pending')
        symptoms = data.get('symptoms')
        notes = data.get('notes')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify hospital exists
        cursor.execute('SELECT id FROM hospitals WHERE id = %s', (hospital_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Hospital not found'}), 404
        
        # Verify hospital doctor if provided
        if hospital_doctor_id:
            cursor.execute(
                'SELECT id, name FROM hospital_doctors WHERE id = %s AND hospital_id = %s',
                (hospital_doctor_id, hospital_id)
            )
            doctor = cursor.fetchone()
            if not doctor:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Hospital doctor not found'}), 404
        
        # Insert appointment
        cursor.execute("""
            INSERT INTO hospital_appointments 
            (hospital_id, hospital_doctor_id, patient_name, patient_phone, patient_email,
             appointment_date, appointment_time, department, appointment_type, 
             priority, status, symptoms, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            hospital_id, hospital_doctor_id, patient_name, patient_phone, patient_email,
            appointment_date, appointment_time, department, appointment_type,
            priority, status, symptoms, notes
        ))
        
        appointment_id = cursor.lastrowid
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Appointment created successfully',
            'appointment_id': appointment_id
        }), 201
        
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to create appointment: {str(e)}'}), 500

# Update hospital appointment
@hospital_appointments_bp.route('/hospital-appointments/<int:appointment_id>', methods=['PUT'])
def update_hospital_appointment(appointment_id):
    """Update an existing hospital appointment"""
    try:
        data = request.get_json(silent=True) or {}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if appointment exists
        cursor.execute('SELECT id, hospital_id FROM hospital_appointments WHERE id = %s', (appointment_id,))
        appointment = cursor.fetchone()
        
        if not appointment:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []
        
        allowed_fields = [
            'hospital_doctor_id', 'patient_name', 'patient_phone', 'patient_email',
            'appointment_date', 'appointment_time', 'department', 'appointment_type',
            'priority', 'status', 'symptoms', 'notes'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Add appointment_id to values
        update_values.append(appointment_id)
        
        # Execute update
        query = f"UPDATE hospital_appointments SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, update_values)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Appointment updated successfully'}), 200
        
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to update appointment: {str(e)}'}), 500

# Update appointment status
@hospital_appointments_bp.route('/hospital-appointments/<int:appointment_id>/status', methods=['PUT'])
def update_appointment_status(appointment_id):
    """Update appointment status"""
    try:
        data = request.get_json(silent=True) or {}
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'status is required'}), 400
        
        valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if appointment exists
        cursor.execute('SELECT id FROM hospital_appointments WHERE id = %s', (appointment_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Update status
        cursor.execute(
            'UPDATE hospital_appointments SET status = %s WHERE id = %s',
            (new_status, appointment_id)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Status updated successfully'}), 200
        
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to update status: {str(e)}'}), 500

# Delete hospital appointment
@hospital_appointments_bp.route('/hospital-appointments/<int:appointment_id>', methods=['DELETE'])
def delete_hospital_appointment(appointment_id):
    """Delete a hospital appointment"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if appointment exists
        cursor.execute('SELECT id FROM hospital_appointments WHERE id = %s', (appointment_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Delete appointment
        cursor.execute('DELETE FROM hospital_appointments WHERE id = %s', (appointment_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Appointment deleted successfully'}), 200
        
    except pymysql.MySQLError as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': f'Failed to delete appointment: {str(e)}'}), 500

# Get hospital doctors for dropdown
@hospital_appointments_bp.route('/hospital-appointments/doctors', methods=['GET'])
def get_hospital_doctors_for_appointments():
    """Get list of doctors for a hospital (for appointment form)"""
    try:
        hospital_id = request.args.get('hospital_id')
        
        if not hospital_id:
            return jsonify({'error': 'hospital_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch available doctors
        cursor.execute("""
            SELECT id, name, specialty as department, is_available
            FROM hospital_doctors
            WHERE hospital_id = %s AND is_available = TRUE
            ORDER BY name
        """, (hospital_id,))
        
        doctors = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({'doctors': doctors}), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch doctors: {str(e)}'}), 500
