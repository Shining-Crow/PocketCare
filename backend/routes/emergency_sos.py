from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from utils.database import get_db_connection


emergency_sos_bp = Blueprint('emergency_sos', __name__)

# SOS visibility expansion (for pending/unacknowledged requests)
# Rationale: if no nearby hospital sees/accepts a request quickly, widen the
# radius gradually so hospitals farther away can respond.
_SOS_BASE_RADIUS_KM_DEFAULT = 10.0
_SOS_EXPAND_EVERY_SECONDS = 180  # 3 minutes
_SOS_EXPAND_STEP_KM = 10.0
_SOS_MAX_RADIUS_KM = 50.0
_SOS_ACCEPTED_VISIBLE_SECONDS = 60


def _is_missing_emergency_types(err: Exception) -> bool:
    msg = str(err).lower()
    return (
        'emergency_types' in msg
        or "unknown table 'emergency_types'" in msg
        or 'doesn\'t exist' in msg and 'emergency_types' in msg
        or 'unknown column' in msg and 'et.' in msg
    )


def _is_unknown_column(err: Exception) -> bool:
    return 'unknown column' in str(err).lower()


def _is_missing_emergency_requests(err: Exception) -> bool:
    msg = str(err).lower()
    return 'emergency_requests' in msg and ('doesn\'t exist' in msg or 'table' in msg)


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
                        sql_with_types = """
                                SELECT
                                    er.id,
                                    er.status,
                                    er.latitude,
                                    er.longitude,
                                    er.emergency_type,
                                    COALESCE(
                                        et.label,
                                        CASE
                                            WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                                            ELSE er.emergency_type
                                        END
                                    ) AS emergency_type_label,
                                    er.note,
                                    er.created_at,
                                    er.acknowledged_at,
                                    er.resolved_at,
                                    er.hospital_id,
                                    h.name AS hospital_name,
                                    h.phone AS hospital_phone
                                FROM emergency_requests er
                                LEFT JOIN emergency_types et ON et.code = er.emergency_type
                                LEFT JOIN hospitals h ON h.id = er.hospital_id
                                WHERE er.user_id = %s
                                ORDER BY er.created_at DESC
                                LIMIT 1
                        """

                        sql_without_types = """
                                SELECT
                                    er.id,
                                    er.status,
                                    er.latitude,
                                    er.longitude,
                                    er.emergency_type,
                                    CASE
                                        WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                                        ELSE er.emergency_type
                                    END AS emergency_type_label,
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
                        """

                        sql_minimal = """
                                SELECT
                                    er.id,
                                    er.status,
                                    er.latitude,
                                    er.longitude,
                                    er.created_at
                                FROM emergency_requests er
                                WHERE er.user_id = %s
                                ORDER BY er.created_at DESC
                                LIMIT 1
                        """

                        try:
                                cursor.execute(sql_with_types, (user_id,))
                                row = cursor.fetchone()
                        except Exception as e:
                                try:
                                        if _is_missing_emergency_types(e):
                                                cursor.execute(sql_without_types, (user_id,))
                                                row = cursor.fetchone()
                                        elif _is_unknown_column(e):
                                                cursor.execute(sql_minimal, (user_id,))
                                                row = cursor.fetchone()
                                        else:
                                                raise
                                except Exception as e2:
                                        if _is_unknown_column(e2):
                                                cursor.execute(sql_minimal, (user_id,))
                                                row = cursor.fetchone()
                                        else:
                                                raise

        return jsonify({'success': True, 'request': row}), 200
    except Exception as e:
        if _is_missing_emergency_requests(e):
            return jsonify({'success': True, 'request': None}), 200
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
                        sql_with_types = """
                                SELECT
                                    er.id,
                                    er.status,
                                    er.latitude,
                                    er.longitude,
                                    er.emergency_type,
                                    COALESCE(
                                        et.label,
                                        CASE
                                            WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                                            ELSE er.emergency_type
                                        END
                                    ) AS emergency_type_label,
                                    er.note,
                                    er.created_at,
                                    er.acknowledged_at,
                                    er.resolved_at,
                                    er.hospital_id,
                                    h.name AS hospital_name,
                                    h.phone AS hospital_phone
                                FROM emergency_requests er
                                LEFT JOIN emergency_types et ON et.code = er.emergency_type
                                LEFT JOIN hospitals h ON h.id = er.hospital_id
                                WHERE er.user_id = %s
                                ORDER BY er.created_at DESC
                                LIMIT %s OFFSET %s
                        """

                        sql_without_types = """
                                SELECT
                                    er.id,
                                    er.status,
                                    er.latitude,
                                    er.longitude,
                                    er.emergency_type,
                                    CASE
                                        WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                                        ELSE er.emergency_type
                                    END AS emergency_type_label,
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
                        """

                        sql_minimal = """
                                SELECT
                                    er.id,
                                    er.status,
                                    er.latitude,
                                    er.longitude,
                                    er.created_at
                                FROM emergency_requests er
                                WHERE er.user_id = %s
                                ORDER BY er.created_at DESC
                                LIMIT %s OFFSET %s
                        """

                        try:
                                cursor.execute(sql_with_types, (user_id, limit, offset))
                                rows = cursor.fetchall() or []
                        except Exception as e:
                                try:
                                        if _is_missing_emergency_types(e):
                                                cursor.execute(sql_without_types, (user_id, limit, offset))
                                                rows = cursor.fetchall() or []
                                        elif _is_unknown_column(e):
                                                cursor.execute(sql_minimal, (user_id, limit, offset))
                                                rows = cursor.fetchall() or []
                                        else:
                                                raise
                                except Exception as e2:
                                        if _is_unknown_column(e2):
                                                cursor.execute(sql_minimal, (user_id, limit, offset))
                                                rows = cursor.fetchall() or []
                                        else:
                                                raise

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
        if _is_missing_emergency_requests(e):
            return jsonify({'success': True, 'requests': [], 'limit': limit, 'offset': offset, 'next_offset': offset, 'has_more': False}), 200
        return jsonify({'error': str(e)}), 500
    finally:
        connection.close()


@emergency_sos_bp.route('/emergency/sos/<int:request_id>/resolve', methods=['POST', 'OPTIONS'])
def user_resolve_emergency_sos(request_id: int):
    if request.method == 'OPTIONS':
        return ('', 200)

    verify_jwt_in_request()
    user_id = _parse_user_id(get_jwt_identity())
    if user_id is None:
        return jsonify({'error': 'Unauthorized'}), 401

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    UPDATE emergency_requests
                    SET status='resolved', resolved_at=%s
                    WHERE id=%s AND user_id=%s AND status IN ('pending', 'acknowledged')
                    """,
                    (datetime.now(), request_id, user_id),
                )
            except Exception as e:
                if _is_unknown_column(e):
                    cursor.execute(
                        """
                        UPDATE emergency_requests
                        SET status='resolved'
                        WHERE id=%s AND user_id=%s AND status IN ('pending', 'acknowledged')
                        """,
                        (request_id, user_id),
                    )
                else:
                    raise

            connection.commit()

            if cursor.rowcount == 0:
                return jsonify({'error': 'Request not found or not eligible to resolve'}), 404

        return jsonify({'success': True, 'request_id': request_id, 'status': 'resolved'}), 200
    except Exception as e:
        connection.rollback()
        if _is_missing_emergency_requests(e):
            return jsonify({'error': 'SOS feature is not available (missing table)'}), 404
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

    radius_km = _as_float(request.args.get('radius_km')) or _SOS_BASE_RADIUS_KM_DEFAULT
    include_assigned = str(request.args.get('include_assigned', '1')).lower() in ('1', 'true', 'yes', 'y', 'on')

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            accepted_cutoff = datetime.now() - timedelta(seconds=_SOS_ACCEPTED_VISIBLE_SECONDS)

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
            pending_sql_with_types = """
                SELECT
                  er.id,
                  er.user_id,
                  u.name AS user_name,
                  u.phone AS user_phone,
                  u.blood_group AS blood_group,
                  er.latitude,
                  er.longitude,
                  er.emergency_type,
                  COALESCE(
                    et.label,
                    CASE
                      WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                      ELSE er.emergency_type
                    END
                  ) AS emergency_type_label,
                  er.note,
                  er.status,
                  er.hospital_id,
                                    h_acc.name AS accepted_hospital_name,
                  er.created_at,
                  er.acknowledged_at,
                  er.resolved_at,
                                    LEAST(
                                        (%s + (%s * FLOOR(TIMESTAMPDIFF(SECOND, er.created_at, NOW()) / %s))),
                                        %s
                                    ) AS effective_radius_km,
                  (6371 * 2 * ASIN(SQRT(
                      POWER(SIN(RADIANS(er.latitude - %s) / 2), 2) +
                      COS(RADIANS(%s)) * COS(RADIANS(er.latitude)) *
                      POWER(SIN(RADIANS(er.longitude - %s) / 2), 2)
                  ))) AS distance_km
                FROM emergency_requests er
                JOIN users u ON u.id = er.user_id
                LEFT JOIN emergency_types et ON et.code = er.emergency_type
                                LEFT JOIN hospitals h_acc ON h_acc.id = er.hospital_id
                                WHERE (
                                    er.status = 'pending'
                                    OR (
                                        er.status = 'acknowledged'
                                        AND er.hospital_id IS NOT NULL
                                        AND er.hospital_id <> %s
                                        AND er.acknowledged_at IS NOT NULL
                                        AND er.acknowledged_at >= %s
                                    )
                                )
                                HAVING distance_km <= effective_radius_km
                ORDER BY er.created_at DESC
                LIMIT 200
            """
            pending_sql_without_types = """
                SELECT
                  er.id,
                  er.user_id,
                  u.name AS user_name,
                  u.phone AS user_phone,
                  u.blood_group AS blood_group,
                  er.latitude,
                  er.longitude,
                  er.emergency_type,
                  CASE
                    WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                    ELSE er.emergency_type
                  END AS emergency_type_label,
                  er.note,
                  er.status,
                  er.hospital_id,
                                    h_acc.name AS accepted_hospital_name,
                  er.created_at,
                  er.acknowledged_at,
                  er.resolved_at,
                                    LEAST(
                                        (%s + (%s * FLOOR(TIMESTAMPDIFF(SECOND, er.created_at, NOW()) / %s))),
                                        %s
                                    ) AS effective_radius_km,
                  (6371 * 2 * ASIN(SQRT(
                      POWER(SIN(RADIANS(er.latitude - %s) / 2), 2) +
                      COS(RADIANS(%s)) * COS(RADIANS(er.latitude)) *
                      POWER(SIN(RADIANS(er.longitude - %s) / 2), 2)
                  ))) AS distance_km
                FROM emergency_requests er
                JOIN users u ON u.id = er.user_id
                                LEFT JOIN hospitals h_acc ON h_acc.id = er.hospital_id
                                WHERE (
                                    er.status = 'pending'
                                    OR (
                                        er.status = 'acknowledged'
                                        AND er.hospital_id IS NOT NULL
                                        AND er.hospital_id <> %s
                                        AND er.acknowledged_at IS NOT NULL
                                        AND er.acknowledged_at >= %s
                                    )
                                )
                                HAVING distance_km <= effective_radius_km
                ORDER BY er.created_at DESC
                LIMIT 200
            """

            pending_sql_minimal = """
                SELECT
                  er.id,
                  er.user_id,
                  u.name AS user_name,
                  u.phone AS user_phone,
                  u.blood_group AS blood_group,
                  er.latitude,
                  er.longitude,
                  NULL AS emergency_type,
                  'General' AS emergency_type_label,
                  NULL AS note,
                  er.status,
                  er.created_at,
                                    LEAST(
                                        (%s + (%s * FLOOR(TIMESTAMPDIFF(SECOND, er.created_at, NOW()) / %s))),
                                        %s
                                    ) AS effective_radius_km,
                  (6371 * 2 * ASIN(SQRT(
                      POWER(SIN(RADIANS(er.latitude - %s) / 2), 2) +
                      COS(RADIANS(%s)) * COS(RADIANS(er.latitude)) *
                      POWER(SIN(RADIANS(er.longitude - %s) / 2), 2)
                  ))) AS distance_km
                FROM emergency_requests er
                JOIN users u ON u.id = er.user_id
                WHERE er.status = 'pending'
                                HAVING distance_km <= effective_radius_km
                ORDER BY er.created_at DESC
                LIMIT 200
            """

            try:
                cursor.execute(
                    pending_sql_with_types,
                    (
                        radius_km,
                        _SOS_EXPAND_STEP_KM,
                        _SOS_EXPAND_EVERY_SECONDS,
                        _SOS_MAX_RADIUS_KM,
                        hlat,
                        hlat,
                        hlng,
                        hospital_id,
                        accepted_cutoff,
                    ),
                )
                pending = cursor.fetchall()
            except Exception as e:
                try:
                    if _is_missing_emergency_types(e):
                        cursor.execute(
                            pending_sql_without_types,
                            (
                                radius_km,
                                _SOS_EXPAND_STEP_KM,
                                _SOS_EXPAND_EVERY_SECONDS,
                                _SOS_MAX_RADIUS_KM,
                                hlat,
                                hlat,
                                hlng,
                                hospital_id,
                                accepted_cutoff,
                            ),
                        )
                        pending = cursor.fetchall()
                    elif _is_unknown_column(e):
                        cursor.execute(
                            pending_sql_minimal,
                            (
                                radius_km,
                                _SOS_EXPAND_STEP_KM,
                                _SOS_EXPAND_EVERY_SECONDS,
                                _SOS_MAX_RADIUS_KM,
                                hlat,
                                hlat,
                                hlng,
                            ),
                        )
                        pending = cursor.fetchall()
                    else:
                        raise
                except Exception as e2:
                    if _is_unknown_column(e2):
                        cursor.execute(
                            pending_sql_minimal,
                            (
                                radius_km,
                                _SOS_EXPAND_STEP_KM,
                                _SOS_EXPAND_EVERY_SECONDS,
                                _SOS_MAX_RADIUS_KM,
                                hlat,
                                hlat,
                                hlng,
                            ),
                        )
                        pending = cursor.fetchall()
                    else:
                        raise

            assigned = []
            if include_assigned:
                                assigned_sql_with_types = """
                                        SELECT
                                            er.id,
                                            er.user_id,
                                            u.name AS user_name,
                                            u.phone AS user_phone,
                                            u.blood_group AS blood_group,
                                            er.latitude,
                                            er.longitude,
                                            er.emergency_type,
                                            COALESCE(
                                                et.label,
                                                CASE
                                                    WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                                                    ELSE er.emergency_type
                                                END
                                            ) AS emergency_type_label,
                                            er.note,
                                            er.status,
                                            er.hospital_id,
                                            er.created_at,
                                            er.acknowledged_at,
                                            er.resolved_at
                                        FROM emergency_requests er
                                        JOIN users u ON u.id = er.user_id
                                        LEFT JOIN emergency_types et ON et.code = er.emergency_type
                                        WHERE er.hospital_id = %s
                                        ORDER BY er.created_at DESC
                                        LIMIT 200
                                """

                                assigned_sql_without_types = """
                                        SELECT
                                            er.id,
                                            er.user_id,
                                            u.name AS user_name,
                                            u.phone AS user_phone,
                                            u.blood_group AS blood_group,
                                            er.latitude,
                                            er.longitude,
                                            er.emergency_type,
                                            CASE
                                                WHEN er.emergency_type IS NULL OR er.emergency_type = '' THEN 'General'
                                                ELSE er.emergency_type
                                            END AS emergency_type_label,
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
                                """

                                assigned_sql_minimal = """
                                        SELECT
                                            er.id,
                                            er.user_id,
                                            u.name AS user_name,
                                            u.phone AS user_phone,
                                            u.blood_group AS blood_group,
                                            er.latitude,
                                            er.longitude,
                                            NULL AS emergency_type,
                                            'General' AS emergency_type_label,
                                            NULL AS note,
                                            er.status,
                                            er.created_at
                                        FROM emergency_requests er
                                        JOIN users u ON u.id = er.user_id
                                        WHERE er.hospital_id = %s
                                        ORDER BY er.created_at DESC
                                        LIMIT 200
                                """

                                try:
                                        cursor.execute(assigned_sql_with_types, (hospital_id,))
                                        assigned = cursor.fetchall()
                                except Exception as e:
                                        try:
                                                if _is_missing_emergency_types(e):
                                                        cursor.execute(assigned_sql_without_types, (hospital_id,))
                                                        assigned = cursor.fetchall()
                                                elif _is_unknown_column(e):
                                                        cursor.execute(assigned_sql_minimal, (hospital_id,))
                                                        assigned = cursor.fetchall()
                                                else:
                                                        raise
                                        except Exception as e2:
                                                if _is_unknown_column(e2):
                                                        cursor.execute(assigned_sql_minimal, (hospital_id,))
                                                        assigned = cursor.fetchall()
                                                else:
                                                        raise

        return (
            jsonify(
                {
                    'success': True,
                    'hospital_id': hospital_id,
                    'radius_km': radius_km,
                    'auto_expand': {
                        'enabled': True,
                        'expand_every_seconds': _SOS_EXPAND_EVERY_SECONDS,
                        'expand_step_km': _SOS_EXPAND_STEP_KM,
                        'max_radius_km': _SOS_MAX_RADIUS_KM,
                    },
                    'pending': pending,
                    'assigned': assigned,
                }
            ),
            200,
        )
    except Exception as e:
        if _is_missing_emergency_requests(e):
            return jsonify({'success': True, 'hospital_id': hospital_id, 'radius_km': radius_km, 'pending': [], 'assigned': []}), 200
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
                # Race-condition friendly message: request exists but was already accepted.
                try:
                    cursor.execute(
                        """
                        SELECT status, hospital_id, acknowledged_at
                        FROM emergency_requests
                        WHERE id=%s
                        """,
                        (request_id,),
                    )
                    row = cursor.fetchone() or {}
                    if row.get('status') == 'acknowledged':
                        return (
                            jsonify(
                                {
                                    'error': 'Request already accepted by another hospital',
                                    'status': row.get('status'),
                                    'hospital_id': row.get('hospital_id'),
                                    'acknowledged_at': row.get('acknowledged_at'),
                                }
                            ),
                            409,
                        )
                except Exception:
                    pass

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
