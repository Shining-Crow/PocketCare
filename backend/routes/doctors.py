
import json

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
                      available_days, day_specific_availability, created_at FROM doctors WHERE id=%s""", (id,))
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
            SELECT id, name, email, phone, specialty, specialty_id, specialties, qualification, 
                   experience, rating, consultation_fee, bio, available_slots,
                   available_days, day_specific_availability, created_at
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
        data = request.get_json(silent=True) or {}

        def _normalize_specialty_name(value: str) -> str:
            return (value or "").strip()

        def _resolve_specialties(payload):
            """Resolve multi-specialty payload into (specialties_list, primary_name, primary_id)."""

            specialties_input = payload.get("specialties")
            specialty_ids_input = payload.get("specialty_ids")

            if not (isinstance(specialties_input, list) and specialties_input):
                return None

            cleaned = [_normalize_specialty_name(x) for x in specialties_input if isinstance(x, str)]
            cleaned = [x for x in cleaned if x]
            if not cleaned:
                raise ValueError("Specialties must be a non-empty list of strings")

            resolved_specialties = []

            def _add_resolved(spec_name: str):
                spec_name = _normalize_specialty_name(spec_name)
                if not spec_name:
                    return
                lowered = spec_name.lower()
                if lowered not in {s.lower() for s in resolved_specialties}:
                    resolved_specialties.append(spec_name)

            # Optional ids list (best-effort)
            ids = []
            if isinstance(specialty_ids_input, list):
                for x in specialty_ids_input:
                    try:
                        ids.append(int(x))
                    except (TypeError, ValueError):
                        pass

            # Resolve ids to names first
            if ids:
                placeholders = ",".join(["%s"] * len(ids))
                rows = execute_query(
                    f"SELECT id, name FROM specialties WHERE id IN ({placeholders})",
                    tuple(ids),
                    fetch_all=True,
                ) or []
                by_id = {int(r["id"]): r.get("name") for r in rows if r and r.get("id") is not None}
                for sid in ids:
                    spec_name = by_id.get(int(sid))
                    if spec_name and (spec_name or "").lower() != "other":
                        _add_resolved(spec_name)

            # Resolve names (canonicalize if they match DB)
            for spec in cleaned:
                match = execute_query(
                    "SELECT id, name FROM specialties WHERE LOWER(name) = LOWER(%s) LIMIT 1",
                    (spec,),
                    fetch_one=True,
                )
                if match and (match.get("name") or "").lower() != "other":
                    _add_resolved(match.get("name"))
                else:
                    _add_resolved(spec)

            if not resolved_specialties:
                raise ValueError("Specialties must be a non-empty list of strings")

            primary_name = resolved_specialties[0]
            primary_id = None
            primary_match = execute_query(
                "SELECT id, name FROM specialties WHERE LOWER(name) = LOWER(%s) LIMIT 1",
                (primary_name,),
                fetch_one=True,
            )
            if primary_match and (primary_match.get("name") or "").lower() != "other":
                primary_id = primary_match.get("id")
            else:
                other_row = execute_query(
                    'SELECT id FROM specialties WHERE LOWER(name) = "other" LIMIT 1',
                    fetch_one=True,
                )
                primary_id = other_row.get("id") if other_row else None

            return resolved_specialties, primary_name, primary_id

        resolved = None
        try:
            resolved = _resolve_specialties(data)
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        
        # Fields that can be updated
        allowed_fields = [
            'name',
            'phone',
            'specialty',
            'qualification',
            'experience',
            'consultation_fee',
            'bio',
            'available_slots',
            'available_days',
            'day_specific_availability',
        ]
        update_fields = []
        update_values = []

        # If a multi-specialty payload is provided, it becomes the source of truth.
        if resolved is not None:
            resolved_specialties, primary_name, primary_id = resolved
            update_fields.append("specialty = %s")
            update_values.append(primary_name)
            update_fields.append("specialty_id = %s")
            update_values.append(primary_id)
            update_fields.append("specialties = %s")
            update_values.append(json.dumps(resolved_specialties, ensure_ascii=False))

        for field in allowed_fields:
            if field in data:
                # When multi-specialty is provided, ignore incoming single specialty to avoid conflict.
                if resolved is not None and field == "specialty":
                    continue
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        update_values.append(doctor_id)
        
        query = f"UPDATE doctors SET {', '.join(update_fields)} WHERE id = %s"

        try:
            execute_query(query, tuple(update_values), commit=True)
        except Exception as e:
            # Older DB may not have the specialties column.
            if resolved is not None and 'Unknown column' in str(e) and 'specialties' in str(e):
                # Remove the specialties JSON update and retry.
                filtered = []
                filtered_values = []
                for f, v in zip(update_fields, update_values):
                    if f.strip().lower().startswith('specialties'):
                        continue
                    filtered.append(f)
                    filtered_values.append(v)
                filtered_values.append(doctor_id)
                retry_query = f"UPDATE doctors SET {', '.join(filtered)} WHERE id = %s"
                execute_query(retry_query, tuple(filtered_values), commit=True)
            else:
                raise
        
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
