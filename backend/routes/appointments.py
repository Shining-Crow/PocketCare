
from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
from flask_jwt_extended import get_jwt_identity
import re
import pymysql

appointments_bp = Blueprint('appointments', __name__)

# GET all doctors
@appointments_bp.route('/doctors', methods=['GET', 'OPTIONS'])
def get_doctors():
    conn = get_db_connection()
    cursor = conn.cursor()

    name = request.args.get('name')
    specialty = request.args.get('specialty')
    min_fee = request.args.get('min_fee')
    max_fee = request.args.get('max_fee')

    query = "SELECT id, name, specialty, qualification, experience, rating, consultation_fee, bio, available_slots, available_days FROM doctors WHERE 1=1"
    params = []

    if name:
        query += " AND name LIKE %s"
        params.append(f"%{name}%")

    if specialty:
        query += " AND specialty=%s"
        params.append(specialty)

    if min_fee and max_fee:
        query += " AND consultation_fee BETWEEN %s AND %s"
        params.extend([min_fee, max_fee])

    cursor.execute(query, params)
    doctors = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(doctors)

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

    if isinstance(appointment_time, str) and '-' in appointment_time:
        appointment_time = appointment_time.split('-', 1)[0].strip()

    if isinstance(appointment_time, str) and re.fullmatch(r"\d{2}:\d{2}", appointment_time):
        appointment_time = f"{appointment_time}:00"

    if not (isinstance(appointment_time, str) and re.fullmatch(r"\d{2}:\d{2}:\d{2}", appointment_time)):
        return jsonify({'error': 'Invalid appointment_time format', 'expected': 'HH:MM or HH:MM:SS or HH:MM-HH:MM'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure the caller is a real user (not a doctor/admin token)
        cursor.execute('SELECT id FROM users WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Only users can book appointments with this endpoint'}), 403

        # Ensure doctor exists
        cursor.execute('SELECT id FROM doctors WHERE id = %s', (int(doctor_id),))
        if not cursor.fetchone():
            return jsonify({'error': 'Doctor not found'}), 404

        cursor.execute(
            """
            INSERT INTO appointments 
            (user_id, doctor_id, appointment_date, appointment_time, symptoms)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user_id,
                int(doctor_id),
                appointment_date,
                appointment_time,
                data.get('symptoms'),
            ),
        )
        conn.commit()
        return jsonify({"message": "Appointment booked"}), 201
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