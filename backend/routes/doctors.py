
from flask import Blueprint, jsonify
from utils.database import get_db_connection

doctors_bp = Blueprint('doctors', __name__)

@doctors_bp.route('/doctors/<int:id>', methods=['GET'])
def get_doctor(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM doctors WHERE id=%s", (id,))
    doctor = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(doctor)
