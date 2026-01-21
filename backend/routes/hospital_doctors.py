"""
Hospital Doctors Management Routes
Handles CRUD operations for doctors within a hospital's management system
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.database import get_db_connection
import pymysql
from datetime import datetime

hospital_doctors_bp = Blueprint('hospital_doctors', __name__)


@hospital_doctors_bp.route('/hospital-doctors', methods=['GET'])
@jwt_required(optional=True)
def get_hospital_doctors():
    """
    Get all doctors for a specific hospital
    Query params: hospital_id (required)
    Returns: List of doctors with their details
    """
    try:
        hospital_id = request.args.get('hospital_id', type=int)
        
        if not hospital_id:
            return jsonify({'error': 'hospital_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get doctors for the hospital
        query = """
            SELECT 
                hd.id,
                hd.name,
                hd.email,
                hd.phone,
                hd.specialty,
                hd.qualification,
                hd.experience,
                hd.rating,
                hd.hospital_id,
                hd.consultation_fee,
                hd.is_available,
                hd.bio,
                hd.created_at,
                COUNT(DISTINCT a.id) as appointment_count
            FROM hospital_doctors hd
            LEFT JOIN appointments a ON hd.id = a.doctor_id 
                AND DATE(a.appointment_date) = CURDATE()
                AND a.status IN ('pending', 'confirmed')
            WHERE hd.hospital_id = %s
            GROUP BY hd.id, hd.name, hd.email, hd.phone, hd.specialty, hd.qualification, 
                     hd.experience, hd.rating, hd.hospital_id, hd.consultation_fee, 
                     hd.is_available, hd.bio, hd.created_at
            ORDER BY hd.name
        """
        
        cursor.execute(query, (hospital_id,))
        doctors = cursor.fetchall()
        
        # Format the response
        doctors_list = []
        for doctor in doctors:
            doctor_dict = {
                'id': doctor['id'],
                'name': doctor['name'],
                'email': doctor['email'] or 'Not provided',
                'phone': doctor['phone'] or 'Not provided',
                'specialty': doctor['specialty'],
                'qualification': doctor['qualification'] or 'Not specified',
                'experience': doctor['experience'] if doctor['experience'] is not None else 'Not specified',
                'rating': float(doctor['rating']) if doctor['rating'] else 0.0,
                'hospital_id': doctor['hospital_id'],
                'consultation_fee': float(doctor['consultation_fee']) if doctor['consultation_fee'] else 0.0,
                'is_available': bool(doctor['is_available']),
                'bio': doctor['bio'],
                'appointments': doctor['appointment_count'] or 0,
                'status': 'available' if doctor['is_available'] else 'offline',
                'created_at': doctor['created_at'].isoformat() if doctor['created_at'] else None
            }
            doctors_list.append(doctor_dict)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'doctors': doctors_list,
            'total': len(doctors_list)
        }), 200
        
    except pymysql.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@hospital_doctors_bp.route('/hospital-doctors', methods=['POST'])
@jwt_required(optional=True)
def add_hospital_doctor():
    """
    Add a new doctor to the hospital
    Request body: doctor details including name, specialty, email, etc.
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'specialty', 'hospital_id']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Extract hospital_id early for use in checks
        hospital_id = int(data['hospital_id'])
        
        # Check if email already exists (if provided)
        if data.get('email'):
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM hospital_doctors WHERE email = %s AND hospital_id = %s", (data['email'], hospital_id))
            existing = cursor.fetchone()
            if existing:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Email already registered in this hospital'}), 409
            cursor.close()
            conn.close()
        
        # Prepare doctor data
        name = data['name'].strip()
        specialty = data['specialty'].strip()
        email = data.get('email', '').strip() or None
        phone = data.get('phone', '').strip() or None
        qualification = data.get('qualifications', '').strip() or data.get('qualification', '').strip() or None
        
        # Handle experience - could be "10 years" or just "10"
        experience_input = data.get('experience', '')
        experience = None
        if experience_input:
            if isinstance(experience_input, int):
                experience = experience_input
            elif isinstance(experience_input, str):
                # Extract number from string like "10 years"
                import re
                match = re.search(r'\d+', experience_input)
                if match:
                    experience = int(match.group())
        
        bio = data.get('bio', '').strip() or None
        consultation_fee = data.get('consultation_fee') or 0.0
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert new doctor
        insert_query = """
            INSERT INTO hospital_doctors 
            (name, email, phone, specialty, qualification, 
             experience, rating, hospital_id, consultation_fee, is_available, bio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_query, (
            name,
            email,
            phone,
            specialty,
            qualification,
            experience,
            0.0,  # Initial rating
            hospital_id,
            consultation_fee,
            True,  # Available by default
            bio
        ))
        
        conn.commit()
        doctor_id = cursor.lastrowid
        
        # Fetch the newly created doctor
        cursor.execute("""
            SELECT id, name, email, phone, specialty, qualification, 
                   experience, rating, hospital_id, consultation_fee, 
                   is_available, bio, created_at
            FROM hospital_doctors 
            WHERE id = %s
        """, (doctor_id,))
        
        new_doctor = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format response
        doctor_dict = {
            'id': new_doctor['id'],
            'name': new_doctor['name'],
            'email': new_doctor['email'] or 'Not provided',
            'phone': new_doctor['phone'] or 'Not provided',
            'specialty': new_doctor['specialty'],
            'qualification': new_doctor['qualification'] or 'Not specified',
            'experience': new_doctor['experience'] if new_doctor['experience'] is not None else 'Not specified',
            'rating': float(new_doctor['rating']),
            'hospital_id': new_doctor['hospital_id'],
            'consultation_fee': float(new_doctor['consultation_fee']),
            'is_available': bool(new_doctor['is_available']),
            'bio': new_doctor['bio'],
            'appointments': 0,
            'status': 'available',
            'created_at': new_doctor['created_at'].isoformat() if new_doctor['created_at'] else None
        }
        
        return jsonify({
            'success': True,
            'message': 'Doctor added successfully',
            'doctor': doctor_dict
        }), 201
        
    except pymysql.IntegrityError as e:
        return jsonify({'error': f'Database integrity error: {str(e)}'}), 409
    except pymysql.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@hospital_doctors_bp.route('/hospital-doctors/<int:doctor_id>', methods=['PUT'])
@jwt_required(optional=True)
def update_hospital_doctor(doctor_id):
    """
    Update doctor status or details
    """
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if doctor exists
        cursor.execute("SELECT id, hospital_id FROM hospital_doctors WHERE id = %s", (doctor_id,))
        doctor = cursor.fetchone()
        
        if not doctor:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []
        
        allowed_fields = {
            'name': 'name',
            'email': 'email',
            'phone': 'phone',
            'specialty': 'specialty',
            'qualification': 'qualification',
            'qualifications': 'qualification',  # Handle both
            'experience': 'experience',
            'consultation_fee': 'consultation_fee',
            'bio': 'bio',
            'is_available': 'is_available',
            'status': 'is_available'  # Map status to is_available
        }
        
        for key, db_field in allowed_fields.items():
            if key in data:
                value = data[key]
                
                # Handle status mapping
                if key == 'status':
                    if value == 'available':
                        value = True
                    elif value in ['offline', 'in-session']:
                        value = False
                    else:
                        value = bool(value)
                
                # Handle experience extraction
                if db_field == 'experience' and value:
                    if isinstance(value, str):
                        import re
                        match = re.search(r'\d+', value)
                        if match:
                            value = int(match.group())
                        else:
                            value = None
                
                update_fields.append(f"{db_field} = %s")
                update_values.append(value)
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Add doctor_id to values
        update_values.append(doctor_id)
        
        # Execute update
        update_query = f"UPDATE hospital_doctors SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(update_query, tuple(update_values))
        conn.commit()
        
        # Fetch updated doctor
        cursor.execute("""
            SELECT id, name, email, phone, specialty, qualification, 
                   experience, rating, hospital_id, consultation_fee, 
                   is_available, bio, created_at
            FROM hospital_doctors 
            WHERE id = %s
        """, (doctor_id,))
        
        updated_doctor = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format response
        doctor_dict = {
            'id': updated_doctor['id'],
            'name': updated_doctor['name'],
            'email': updated_doctor['email'] or 'Not provided',
            'phone': updated_doctor['phone'] or 'Not provided',
            'specialty': updated_doctor['specialty'],
            'qualification': updated_doctor['qualification'] or 'Not specified',
            'experience': updated_doctor['experience'] if updated_doctor['experience'] is not None else 'Not specified',
            'rating': float(updated_doctor['rating']),
            'hospital_id': updated_doctor['hospital_id'],
            'consultation_fee': float(updated_doctor['consultation_fee']),
            'is_available': bool(updated_doctor['is_available']),
            'bio': updated_doctor['bio'],
            'status': 'available' if updated_doctor['is_available'] else 'offline',
            'created_at': updated_doctor['created_at'].isoformat() if updated_doctor['created_at'] else None
        }
        
        return jsonify({
            'success': True,
            'message': 'Doctor updated successfully',
            'doctor': doctor_dict
        }), 200
        
    except pymysql.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@hospital_doctors_bp.route('/hospital-doctors/<int:doctor_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_hospital_doctor(doctor_id):
    """
    Delete/remove a doctor from the hospital
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if doctor exists
        cursor.execute("SELECT id, name FROM hospital_doctors WHERE id = %s", (doctor_id,))
        doctor = cursor.fetchone()
        
        if not doctor:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Doctor not found'}), 404
        
        doctor_name = doctor['name']
        
        # Check for existing appointments
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE doctor_id = %s 
            AND appointment_date >= CURDATE()
            AND status IN ('pending', 'confirmed')
        """, (doctor_id,))
        
        result = cursor.fetchone()
        pending_appointments = result['count'] if result else 0
        
        if pending_appointments > 0:
            cursor.close()
            conn.close()
            return jsonify({
                'error': f'Cannot delete doctor with {pending_appointments} pending appointments',
                'pending_appointments': pending_appointments
            }), 409
        
        # Delete the doctor
        cursor.execute("DELETE FROM hospital_doctors WHERE id = %s", (doctor_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Doctor {doctor_name} removed successfully'
        }), 200
        
    except pymysql.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@hospital_doctors_bp.route('/hospital-doctors/statistics', methods=['GET'])
@jwt_required(optional=True)
def get_hospital_doctor_statistics():
    """
    Get statistics for hospital doctors
    Query params: hospital_id (required)
    """
    try:
        hospital_id = request.args.get('hospital_id', type=int)
        
        if not hospital_id:
            return jsonify({'error': 'hospital_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get statistics
        stats_query = """
            SELECT 
                COUNT(DISTINCT hd.id) as total_doctors,
                COUNT(DISTINCT CASE WHEN hd.is_available = TRUE THEN hd.id END) as available_doctors,
                COUNT(DISTINCT CASE WHEN hd.is_available = FALSE THEN hd.id END) as offline_doctors,
                COALESCE(AVG(hd.rating), 0.0) as average_rating,
                COUNT(DISTINCT a.id) as today_appointments
            FROM hospital_doctors hd
            LEFT JOIN appointments a ON hd.id = a.doctor_id 
                AND DATE(a.appointment_date) = CURDATE()
                AND a.status IN ('pending', 'confirmed')
            WHERE hd.hospital_id = %s
        """
        
        cursor.execute(stats_query, (hospital_id,))
        stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_doctors': stats['total_doctors'] or 0,
                'active_doctors': stats['available_doctors'] or 0,
                'offline_doctors': stats['offline_doctors'] or 0,
                'average_rating': float(stats['average_rating']) if stats['average_rating'] else 0.0,
                'today_appointments': stats['today_appointments'] or 0
            }
        }), 200
        
    except pymysql.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@hospital_doctors_bp.route('/hospital-doctors/specialties', methods=['GET'])
@jwt_required(optional=True)
def get_available_specialties():
    """
    Get list of all specialties available in the system
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT name 
            FROM specialties 
            WHERE name != 'Other'
            ORDER BY name
        """)
        
        specialties = cursor.fetchall()
        specialty_list = [s['name'] for s in specialties]
        
        # Add common specialties if not in database
        common_specialties = [
            'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics',
            'Oncology', 'Emergency Medicine', 'General Medicine',
            'Surgery', 'Gynecology', 'Dermatology'
        ]
        
        for specialty in common_specialties:
            if specialty not in specialty_list:
                specialty_list.append(specialty)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'specialties': sorted(specialty_list)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
