from flask import Blueprint, request, jsonify
import pymysql
from config import Config

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')

DB_CONFIG = {
    "host": Config.DB_HOST,
    "user": Config.DB_USER,
    "password": Config.DB_PASSWORD,
    "database": Config.DB_NAME,
    "port": int(Config.DB_PORT)
}

# Helper to connect to MySQL
def get_db_connection():
    conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor) 
    return conn

# Get all upcoming appointments for a user
@appointments_bp.route('/user/<int:user_id>', methods=['GET'])
def get_appointments(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE user_id=%s ORDER BY appointment_date, appointment_time", (user_id,))
    appointments = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(appointments)

# Book a new appointment
@appointments_bp.route('/book', methods=['POST'])
def book_appointment():
    data = request.get_json()

    user_id = data.get('user_id')
    doctor_id = data.get('doctor_id')
    appointment_date = data.get('appointment_date')
    appointment_time = data.get('appointment_time')

    if not all([user_id, doctor_id, appointment_date, appointment_time]):
        return jsonify({'message': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for double booking
    cursor.execute("""
        SELECT id FROM appointments
        WHERE doctor_id=%s AND appointment_date=%s AND appointment_time=%s
    """, (doctor_id, appointment_date, appointment_time))
    if cursor.fetchone():
        return jsonify({'message': 'Time slot already booked'}), 400

    cursor.execute("""
        INSERT INTO appointments (user_id, doctor_id, appointment_date, appointment_time, status)
        VALUES (%s, %s, %s, %s, 'pending')
    """, (user_id, doctor_id, appointment_date, appointment_time))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Appointment booked successfully'}), 201

# Cancel appointment
@appointments_bp.route('/cancel/<int:appointment_id>', methods=['DELETE'])
def cancel_appointment(appointment_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE appointments SET status='cancelled' WHERE id=%s", (appointment_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Appointment cancelled'})
