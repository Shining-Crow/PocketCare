from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from utils.database import get_db_connection


emergency_sos_bp = Blueprint('emergency_sos', __name__)


def _parse_user_id(identity: Any) -> Optional[int]:
    if identity is None:
        return None
    s = str(identity)
    if not s.isdigit():
        return None
    try:
        return int(s)
    except Exception:
        return None


def _parse_hospital_id(identity: Any) -> Optional[int]:
    if identity is None:
        return None
    s = str(identity)
    if not s.startswith('hospital_'):
        return None
    raw = s.split('_', 1)[1]
    if not raw.isdigit():
        return None
    try:
        return int(raw)
    except Exception:
        return None


def _as_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None


@emergency_sos_bp.route('/emergency/sos', methods=['POST', 'OPTIONS'])
def create_emergency_sos():
    # Allow CORS preflight without auth.
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    user_id = _parse_user_id(get_jwt_identity())
    if user_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json(silent=True) or {}
    latitude = _as_float(data.get('latitude'))
    longitude = _as_float(data.get('longitude'))

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    emergency_type = data.get('emergency_type')
    note = data.get('note')

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO emergency_requests (user_id, latitude, longitude, emergency_type, note, status, created_at)
                VALUES (%s, %s, %s, %s, %s, 'pending', %s)
                """,
                (user_id, latitude, longitude, emergency_type, note, datetime.now()),
            )
            connection.commit()
            request_id = cursor.lastrowid

        return jsonify({'success': True, 'request_id': request_id, 'status': 'pending'}), 201
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()


@emergency_sos_bp.route('/emergency/sos/latest', methods=['GET', 'OPTIONS'])
def get_latest_emergency_sos():
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    user_id = _parse_user_id(get_jwt_identity())
    if user_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  er.id,
                  er.status,
                  er.latitude,
                  er.longitude,
                  er.emergency_type,
                  er.note,
                  er.created_at,
                  er.acknowledged_at,
                  er.resolved_at,
                  er.hospital_id,
                  h.name AS hospital_name,
                  h.phone AS hospital_phone
                FROM emergency_requests er
                LEFT JOIN hospitals h ON h.id = er.hospital_id
                WHERE er.user_id = %s
                ORDER BY er.created_at DESC
                LIMIT 1
                """,
                (user_id,),
            )
            row = cursor.fetchone()

        return jsonify({'success': True, 'request': row}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()


@emergency_sos_bp.route('/emergency/sos/history', methods=['GET', 'OPTIONS'])
def get_emergency_sos_history():
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    user_id = _parse_user_id(get_jwt_identity())
    if user_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        limit = int(request.args.get('limit', 20))
    except Exception:
        limit = 20
    limit = max(1, min(limit, 200))

    try:
        offset = int(request.args.get('offset', 0))
    except Exception:
        offset = 0
    offset = max(0, offset)

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  er.id,
                  er.status,
                  er.latitude,
                  er.longitude,
                  er.emergency_type,
                  er.note,
                  er.created_at,
                  er.acknowledged_at,
                  er.resolved_at,
                  er.hospital_id,
                  h.name AS hospital_name,
                  h.phone AS hospital_phone
                FROM emergency_requests er
                LEFT JOIN hospitals h ON h.id = er.hospital_id
                WHERE er.user_id = %s
                ORDER BY er.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, limit, offset),
            )
            rows = cursor.fetchall() or []

        has_more = len(rows) == limit
        next_offset = offset + len(rows)

        return (
            jsonify(
                {
                    'success': True,
                    'requests': rows,
                    'limit': limit,
                    'offset': offset,
                    'next_offset': next_offset,
                    'has_more': has_more,
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()


@emergency_sos_bp.route('/hospital/emergency/requests', methods=['GET', 'OPTIONS'])
def hospital_list_emergency_requests():
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    hospital_id = _parse_hospital_id(get_jwt_identity())
    if hospital_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    radius_km = _as_float(request.args.get('radius_km')) or 10.0
    include_assigned = str(request.args.get('include_assigned', '1')).lower() in ('1', 'true', 'yes', 'y', 'on')

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT latitude, longitude FROM hospitals WHERE id=%s",
                (hospital_id,),
            )
            hospital = cursor.fetchone()
            if not hospital or hospital.get('latitude') is None or hospital.get('longitude') is None:
                return jsonify({'error': 'Hospital location (latitude/longitude) is not set'}), 400

            hlat = float(hospital['latitude'])
            hlng = float(hospital['longitude'])

            # Haversine distance (km)
            pending_sql = """
                SELECT
                  er.id,
                  er.user_id,
                  u.name AS user_name,
                  u.phone AS user_phone,
                  u.blood_group AS blood_group,
                  er.latitude,
                  er.longitude,
                  er.emergency_type,
                  er.note,
                  er.status,
                  er.hospital_id,
                  er.created_at,
                  er.acknowledged_at,
                  er.resolved_at,
                  (6371 * 2 * ASIN(SQRT(
                      POWER(SIN(RADIANS(er.latitude - %s) / 2), 2) +
                      COS(RADIANS(%s)) * COS(RADIANS(er.latitude)) *
                      POWER(SIN(RADIANS(er.longitude - %s) / 2), 2)
                  ))) AS distance_km
                FROM emergency_requests er
                JOIN users u ON u.id = er.user_id
                WHERE er.status = 'pending'
                HAVING distance_km <= %s
                ORDER BY er.created_at DESC
                LIMIT 200
            """
            cursor.execute(pending_sql, (hlat, hlat, hlng, radius_km))
            pending = cursor.fetchall()

            assigned = []
            if include_assigned:
                cursor.execute(
                    """
                    SELECT
                      er.id,
                      er.user_id,
                      u.name AS user_name,
                      u.phone AS user_phone,
                      u.blood_group AS blood_group,
                      er.latitude,
                      er.longitude,
                      er.emergency_type,
                      er.note,
                      er.status,
                      er.hospital_id,
                      er.created_at,
                      er.acknowledged_at,
                      er.resolved_at
                    FROM emergency_requests er
                    JOIN users u ON u.id = er.user_id
                    WHERE er.hospital_id = %s
                    ORDER BY er.created_at DESC
                    LIMIT 200
                    """,
                    (hospital_id,),
                )
                assigned = cursor.fetchall()

        return (
            jsonify(
                {
                    'success': True,
                    'hospital_id': hospital_id,
                    'radius_km': radius_km,
                    'pending': pending,
                    'assigned': assigned,
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()


@emergency_sos_bp.route('/hospital/emergency/requests/<int:request_id>/accept', methods=['POST', 'OPTIONS'])
def hospital_accept_emergency_request(request_id: int):
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    hospital_id = _parse_hospital_id(get_jwt_identity())
    if hospital_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE emergency_requests
                SET status='acknowledged', hospital_id=%s, acknowledged_at=%s
                WHERE id=%s AND status='pending'
                """,
                (hospital_id, datetime.now(), request_id),
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Request not found or not pending'}), 404

        return jsonify({'success': True, 'request_id': request_id, 'status': 'acknowledged'}), 200
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()


@emergency_sos_bp.route('/hospital/emergency/requests/<int:request_id>/resolve', methods=['POST', 'OPTIONS'])
def hospital_resolve_emergency_request(request_id: int):
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    hospital_id = _parse_hospital_id(get_jwt_identity())
    if hospital_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE emergency_requests
                SET status='resolved', resolved_at=%s
                WHERE id=%s AND hospital_id=%s AND status IN ('pending', 'acknowledged')
                """,
                (datetime.now(), request_id, hospital_id),
            )
            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Request not found or not assigned to this hospital'}), 404

        return jsonify({'success': True, 'request_id': request_id, 'status': 'resolved'}), 200
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()
