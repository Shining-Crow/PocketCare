
from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
from flask_jwt_extended import get_jwt_identity

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

    query = "SELECT id, name, specialty, qualification, experience, rating, consultation_fee, bio FROM doctors WHERE 1=1"
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

@appointments_bp.route('/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    data = request.json
    user_id = get_jwt_identity()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments 
        (user_id, doctor_id, appointment_date, appointment_time, symptoms)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        user_id,
        data['doctor_id'],
        data['appointment_date'],
        data['appointment_time'],
        data.get('symptoms')
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Appointment booked"}), 201