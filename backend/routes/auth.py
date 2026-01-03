from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from utils.database import execute_query
from utils.auth_utils import hash_password, verify_password, jwt_required_custom
from utils.validators import validate_email_format, validate_password_strength, validate_required_fields
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# User Registration
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password', 'name'])
        if not is_valid:
            return jsonify({'error': error}), 400
        
        email = data.get('email').lower().strip()
        password = data.get('password')
        name = data.get('name').strip()
        phone = data.get('phone', '').strip()
        
        # Validate email format
        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        # Validate password strength
        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        # Check if user already exists
        query = "SELECT id FROM users WHERE email = %s"
        existing_user = execute_query(query, (email,), fetch_one=True)
        
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Insert new user
        insert_query = """
            INSERT INTO users (email, password_hash, name, phone, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        user_id = execute_query(
            insert_query,
            (email, hashed_password, name, phone, datetime.now()),
            commit=True
        )
        
        # Create access token
        access_token = create_access_token(identity=str(user_id))
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'email': email,
                'name': name,
                'role': 'user'
            },
            'access_token': access_token
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

# Doctor Registration
@auth_bp.route('/doctor/register', methods=['POST'])
def register_doctor():
    try:
        data = request.get_json()

        # Required fields
        required = ['name', 'email', 'password', 'specialty']
        is_valid, error = validate_required_fields(data, required)
        if not is_valid:
            return jsonify({'error': error}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')
        name = data.get('name').strip()
        specialty = data.get('specialty').strip()
        qualification = data.get('qualification', '').strip()
        experience = int(data.get('experience') or 0)
        hospital_id = int(data.get('hospital_id') or 0)
        consultation_fee = float(data.get('consultation_fee') or 0.0)
        phone = data.get('phone', '').strip()
        bio = data.get('bio', '').strip()

        # Validate email and password
        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400

        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Check if doctor exists
        query = "SELECT id FROM doctors WHERE email=%s"
        existing = execute_query(query, (email,), fetch_one=True)
        if existing:
            return jsonify({'error': 'Email already registered'}), 409 

        # Hash password
        hashed_password = hash_password(password)

        # Insert into DB
        insert_query = """
        INSERT INTO doctors (name, email, password_hash, phone, specialty, qualification, experience, hospital_id, consultation_fee, bio, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        doctor_id = execute_query(
            insert_query,
            (name, email, hashed_password, phone, specialty, qualification, experience, hospital_id, consultation_fee, bio, datetime.now()),
            commit=True
        )

        # JWT token
        access_token = create_access_token(identity=str(doctor_id))

        return jsonify({
            'message': 'Doctor registered successfully',
            'user': {
                'id': doctor_id,
                'email': email,
                'name': name,
                'specialty': specialty,
                'role': 'doctor'
            },
            'access_token': access_token
        }), 201

    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

# Login
@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user or doctor"""
    try:
        data = request.get_json()
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password'])
        if not is_valid:
            return jsonify({'error': error}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')
        role = data.get('role', 'user')  # default to user

        if role == 'doctor':
            query = "SELECT id, email, password_hash, name, phone, specialty FROM doctors WHERE email = %s"
            user = execute_query(query, (email,), fetch_one=True)
        else:
            query = "SELECT id, email, password_hash, name, phone FROM users WHERE email = %s"
            user = execute_query(query, (email,), fetch_one=True)

        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not verify_password(password, user['password_hash']):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=str(user['id']))

        user_data = {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'phone': user['phone'],
            'role': role
        }
        if role == 'doctor' and 'specialty' in user:
            user_data['specialty'] = user['specialty']

        return jsonify({
            'message': 'Login successful',
            'user': user_data,
            'access_token': access_token
        }), 200

    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required_custom
def get_profile():
    """Get user profile"""
    try:
        user_id = get_jwt_identity()
        
        query = """
            SELECT id, email, name, phone, date_of_birth, gender, 
                blood_group, address, created_at
            FROM users 
            WHERE id = %s
        """
        user = execute_query(query, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Convert datetime to string
        if user['created_at']:
            user['created_at'] = user['created_at'].isoformat()
        if user['date_of_birth']:
            user['date_of_birth'] = user['date_of_birth'].isoformat()
        
        return jsonify({'user': user}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required_custom
def update_profile():
    """Update user profile"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = ['name', 'phone', 'date_of_birth', 'gender', 'blood_group', 'address']
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        update_values.append(user_id)
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        execute_query(query, tuple(update_values), commit=True)
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

# Admin Login
@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password'])
        if not is_valid:
            return jsonify({'error': error}), 400
        
        email = data.get('email').lower().strip()
        password = data.get('password')
        
        # Get admin from database
        query = "SELECT id, email, password_hash, name, role, is_active FROM admins WHERE email = %s"
        admin = execute_query(query, (email,), fetch_one=True)
        
        if not admin:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not admin['is_active']:
            return jsonify({'error': 'Admin account is inactive'}), 403
        
        # Verify password
        if not verify_password(password, admin['password_hash']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Update last login
        update_query = "UPDATE admins SET last_login = %s WHERE id = %s"
        execute_query(update_query, (datetime.now(), admin['id']), commit=True)
        
        # Create access token
        access_token = create_access_token(identity=f"admin_{admin['id']}")
        
        return jsonify({
            'message': 'Admin login successful',
            'admin': {
                'id': admin['id'],
                'email': admin['email'],
                'name': admin['name'],
                'role': admin['role']
            },
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Admin login failed: {str(e)}'}), 500


# Get Dashboard Statistics
@auth_bp.route('/admin/dashboard-stats', methods=['GET'])
@jwt_required_custom
def get_dashboard_stats():
    """Get dashboard statistics for admin"""
    try:
        # Total users
        users_query = "SELECT COUNT(*) as count FROM users"
        users_count = execute_query(users_query, fetch_one=True)
        
        # Total doctors
        doctors_query = "SELECT COUNT(*) as count FROM doctors"
        doctors_count = execute_query(doctors_query, fetch_one=True)
        
        # Pending appointments
        appointments_query = "SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'"
        pending_appointments = execute_query(appointments_query, fetch_one=True)
        
        # Active SOS alerts
        sos_query = "SELECT COUNT(*) as count FROM emergency_requests WHERE status = 'pending'"
        active_sos = execute_query(sos_query, fetch_one=True)
        
        # Medical reports reviewed
        reports_query = "SELECT COUNT(*) as count FROM medical_reports"
        total_reports = execute_query(reports_query, fetch_one=True)
        
        # Chat messages today
        chats_query = "SELECT COUNT(*) as count FROM chat_messages WHERE DATE(created_at) = CURDATE()"
        chats_today = execute_query(chats_query, fetch_one=True)
        
        return jsonify({
            'total_users': users_count['count'],
            'total_doctors': doctors_count['count'],
            'pending_appointments': pending_appointments['count'],
            'active_sos_alerts': active_sos['count'],
            'total_reports': total_reports['count'],
            'chats_today': chats_today['count']
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch statistics: {str(e)}'}), 500