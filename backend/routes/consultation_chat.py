from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from utils.auth_utils import jwt_required_custom
from utils.database import execute_query
import pymysql

consultation_chat_bp = Blueprint('consultation_chat', __name__)


def _coerce_int_identity():
    raw = get_jwt_identity()
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _require_user_id():
    user_id = _coerce_int_identity()
    if not user_id:
        return None, (jsonify({'error': 'Invalid authentication identity'}), 401)

    user = execute_query('SELECT id FROM users WHERE id=%s', (user_id,), fetch_one=True)
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)

    return user_id, None


def _require_doctor_id():
    doctor_id = _coerce_int_identity()
    if not doctor_id:
        return None, (jsonify({'error': 'Invalid authentication identity'}), 401)

    doctor = execute_query('SELECT id FROM doctors WHERE id=%s', (doctor_id,), fetch_one=True)
    if not doctor:
        return None, (jsonify({'error': 'Doctor not found'}), 404)

    return doctor_id, None


def _ensure_thread_for_appointment(appointment_id: int):
    try:
        appointment = execute_query(
            'SELECT id, user_id, doctor_id, status FROM appointments WHERE id=%s',
            (appointment_id,),
            fetch_one=True,
        )
    except pymysql.MySQLError as e:
        return None, None, (jsonify({'error': 'Database error', 'message': str(e)}), 500)
    if not appointment:
        return None, None, (jsonify({'error': 'Appointment not found'}), 404)

    if appointment.get('status') == 'cancelled':
        return None, None, (jsonify({'error': 'Chat not available for cancelled appointments'}), 400)

    try:
        execute_query(
            """
            INSERT INTO consultation_threads (appointment_id, user_id, doctor_id)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
            """,
            (appointment_id, appointment['user_id'], appointment['doctor_id']),
            commit=True,
        )
    except pymysql.err.ProgrammingError as e:
        # Likely missing tables if schema.sql wasn't applied
        if getattr(e, 'args', None) and len(e.args) > 0 and int(e.args[0]) == 1146:
            return None, None, (
                jsonify({
                    'error': 'Chat tables missing',
                    'message': 'Run database/schema.sql to create consultation_threads and consultation_messages',
                }),
                500,
            )
        return None, None, (jsonify({'error': 'Database error', 'message': str(e)}), 500)
    except pymysql.MySQLError as e:
        return None, None, (jsonify({'error': 'Database error', 'message': str(e)}), 500)

    try:
        thread = execute_query(
            'SELECT id, appointment_id, user_id, doctor_id, created_at, updated_at FROM consultation_threads WHERE appointment_id=%s',
            (appointment_id,),
            fetch_one=True,
        )
    except pymysql.MySQLError as e:
        return None, None, (jsonify({'error': 'Database error', 'message': str(e)}), 500)

    return thread, appointment, None


def _serialize_datetime(value):
    if value is None:
        return None
    try:
        return value.isoformat()
    except Exception:
        return str(value)


@consultation_chat_bp.route('/user/doctor-chats', methods=['GET'])
@jwt_required_custom
def user_list_doctor_chats():
    user_id, err = _require_user_id()
    if err:
        return err

    try:
        threads = execute_query(
            """
            SELECT
                a.id AS appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                d.id AS doctor_id,
                d.name AS doctor_name,
                d.specialty AS doctor_specialty,
                t.id AS thread_id,
                (
                    SELECT m.message
                    FROM consultation_messages m
                    WHERE m.thread_id = t.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message,
                (
                    SELECT m.created_at
                    FROM consultation_messages m
                    WHERE m.thread_id = t.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message_at
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor_id
            LEFT JOIN consultation_threads t ON t.appointment_id = a.id
            WHERE a.user_id = %s AND a.status <> 'cancelled'
            ORDER BY COALESCE(last_message_at, a.created_at) DESC
            LIMIT 50
            """,
            (user_id,),
            fetch_all=True,
        )
    except pymysql.err.ProgrammingError as e:
        if getattr(e, 'args', None) and len(e.args) > 0 and int(e.args[0]) == 1146:
            return (
                jsonify({
                    'error': 'Chat tables missing',
                    'message': 'Run database/schema.sql to create consultation_threads and consultation_messages',
                }),
                500,
            )
        return jsonify({'error': 'Database error', 'message': str(e)}), 500
    except pymysql.MySQLError as e:
        return jsonify({'error': 'Database error', 'message': str(e)}), 500

    for row in threads:
        row['appointment_date'] = _serialize_datetime(row.get('appointment_date'))
        row['appointment_time'] = _serialize_datetime(row.get('appointment_time'))
        row['last_message_at'] = _serialize_datetime(row.get('last_message_at'))

    return jsonify({'threads': threads}), 200


@consultation_chat_bp.route('/doctor/patient-chats', methods=['GET'])
@jwt_required_custom
def doctor_list_patient_chats():
    doctor_id, err = _require_doctor_id()
    if err:
        return err

    try:
        threads = execute_query(
            """
            SELECT
                a.id AS appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                u.id AS user_id,
                u.name AS patient_name,
                u.phone AS patient_phone,
                t.id AS thread_id,
                (
                    SELECT m.message
                    FROM consultation_messages m
                    WHERE m.thread_id = t.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message,
                (
                    SELECT m.created_at
                    FROM consultation_messages m
                    WHERE m.thread_id = t.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message_at
            FROM appointments a
            JOIN users u ON u.id = a.user_id
            LEFT JOIN consultation_threads t ON t.appointment_id = a.id
            WHERE a.doctor_id = %s AND a.status <> 'cancelled'
            ORDER BY COALESCE(last_message_at, a.created_at) DESC
            LIMIT 50
            """,
            (doctor_id,),
            fetch_all=True,
        )
    except pymysql.err.ProgrammingError as e:
        if getattr(e, 'args', None) and len(e.args) > 0 and int(e.args[0]) == 1146:
            return (
                jsonify({
                    'error': 'Chat tables missing',
                    'message': 'Run database/schema.sql to create consultation_threads and consultation_messages',
                }),
                500,
            )
        return jsonify({'error': 'Database error', 'message': str(e)}), 500
    except pymysql.MySQLError as e:
        return jsonify({'error': 'Database error', 'message': str(e)}), 500

    for row in threads:
        row['appointment_date'] = _serialize_datetime(row.get('appointment_date'))
        row['appointment_time'] = _serialize_datetime(row.get('appointment_time'))
        row['last_message_at'] = _serialize_datetime(row.get('last_message_at'))

    return jsonify({'threads': threads}), 200


@consultation_chat_bp.route('/user/doctor-chats/<int:appointment_id>/messages', methods=['GET'])
@jwt_required_custom
def user_get_messages(appointment_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    thread, appointment, err = _ensure_thread_for_appointment(appointment_id)
    if err:
        return err

    if int(appointment['user_id']) != int(user_id):
        return jsonify({'error': 'Forbidden'}), 403

    messages = execute_query(
        """
        SELECT id, sender_role, sender_id, message, created_at
        FROM consultation_messages
        WHERE thread_id=%s
        ORDER BY created_at ASC
        """,
        (thread['id'],),
        fetch_all=True,
    )

    for msg in messages:
        msg['created_at'] = _serialize_datetime(msg.get('created_at'))

    return jsonify({'thread': {'id': thread['id'], 'appointment_id': appointment_id}, 'messages': messages}), 200


@consultation_chat_bp.route('/doctor/patient-chats/<int:appointment_id>/messages', methods=['GET'])
@jwt_required_custom
def doctor_get_messages(appointment_id: int):
    doctor_id, err = _require_doctor_id()
    if err:
        return err

    thread, appointment, err = _ensure_thread_for_appointment(appointment_id)
    if err:
        return err

    if int(appointment['doctor_id']) != int(doctor_id):
        return jsonify({'error': 'Forbidden'}), 403

    messages = execute_query(
        """
        SELECT id, sender_role, sender_id, message, created_at
        FROM consultation_messages
        WHERE thread_id=%s
        ORDER BY created_at ASC
        """,
        (thread['id'],),
        fetch_all=True,
    )

    for msg in messages:
        msg['created_at'] = _serialize_datetime(msg.get('created_at'))

    return jsonify({'thread': {'id': thread['id'], 'appointment_id': appointment_id}, 'messages': messages}), 200


@consultation_chat_bp.route('/user/doctor-chats/<int:appointment_id>/messages', methods=['POST'])
@jwt_required_custom
def user_send_message(appointment_id: int):
    user_id, err = _require_user_id()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'Message is required'}), 400

    thread, appointment, err = _ensure_thread_for_appointment(appointment_id)
    if err:
        return err

    if int(appointment['user_id']) != int(user_id):
        return jsonify({'error': 'Forbidden'}), 403

    msg_id = execute_query(
        """
        INSERT INTO consultation_messages (thread_id, sender_role, sender_id, message)
        VALUES (%s, 'user', %s, %s)
        """,
        (thread['id'], user_id, message),
        commit=True,
    )

    return jsonify({'message_id': msg_id}), 201


@consultation_chat_bp.route('/doctor/patient-chats/<int:appointment_id>/messages', methods=['POST'])
@jwt_required_custom
def doctor_send_message(appointment_id: int):
    doctor_id, err = _require_doctor_id()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'Message is required'}), 400

    thread, appointment, err = _ensure_thread_for_appointment(appointment_id)
    if err:
        return err

    if int(appointment['doctor_id']) != int(doctor_id):
        return jsonify({'error': 'Forbidden'}), 403

    msg_id = execute_query(
        """
        INSERT INTO consultation_messages (thread_id, sender_role, sender_id, message)
        VALUES (%s, 'doctor', %s, %s)
        """,
        (thread['id'], doctor_id, message),
        commit=True,
    )

    return jsonify({'message_id': msg_id}), 201
