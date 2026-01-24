from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.database import get_db_connection
from datetime import datetime
import sys

bed_management_bp = Blueprint('bed_management', __name__)

# ============================================================================
# WARD BED MANAGEMENT
# ============================================================================

@bed_management_bp.route('/bed-wards', methods=['GET'])
@jwt_required(optional=True)
def get_bed_wards():
    """Get all bed wards for a hospital"""
    try:
        hospital_id = request.args.get('hospital_id')
        
        if not hospital_id:
            return jsonify({'error': 'Hospital ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM bed_wards 
            WHERE hospital_id = %s
            ORDER BY ward_type, ac_type, room_config
        """, (hospital_id,))
        
        wards = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'wards': wards
        }), 200
        
    except Exception as e:
        print(f"Error fetching bed wards: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to fetch bed wards', 'details': str(e)}), 500


@bed_management_bp.route('/bed-wards', methods=['POST'])
@jwt_required(optional=True)
def create_bed_ward():
    """Create or update a bed ward"""
    try:
        data = request.get_json()
        hospital_id = data.get('hospital_id')
        ward_type = data.get('ward_type')
        ac_type = data.get('ac_type', 'not_applicable')
        room_config = data.get('room_config')  # For private rooms
        total_beds = data.get('total_beds', 0)
        available_beds = data.get('available_beds', 0)
        # reserved_beds was removed; accept it as a backwards-compatible alias for occupied.
        reserved_beds = data.get('reserved_beds', 0)
        occupied_beds = data.get('occupied_beds', 0)

        effective_occupied_beds = (occupied_beds or 0) + (reserved_beds or 0)

        # If available isn't provided (or is None), derive it from total - occupied.
        if available_beds is None:
            available_beds = max(0, (total_beds or 0) - effective_occupied_beds)
        
        if not hospital_id or not ward_type:
            return jsonify({'error': 'Hospital ID and ward type are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if ward already exists
        if room_config:
            cursor.execute("""
                SELECT id FROM bed_wards 
                WHERE hospital_id = %s AND ward_type = %s AND ac_type = %s AND room_config = %s
            """, (hospital_id, ward_type, ac_type, room_config))
        else:
            cursor.execute("""
                SELECT id FROM bed_wards 
                WHERE hospital_id = %s AND ward_type = %s AND ac_type = %s AND room_config IS NULL
            """, (hospital_id, ward_type, ac_type))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing ward
            cursor.execute("""
                UPDATE bed_wards 
                SET total_beds = %s, available_beds = %s, 
                    occupied_beds = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (total_beds, available_beds, effective_occupied_beds, existing['id']))
            ward_id = existing['id']
        else:
            # Create new ward
            cursor.execute("""
                INSERT INTO bed_wards 
                (hospital_id, ward_type, ac_type, room_config, total_beds, available_beds, occupied_beds)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (hospital_id, ward_type, ac_type, room_config, total_beds, available_beds, effective_occupied_beds))
            ward_id = cursor.lastrowid
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ward bed status updated successfully',
            'ward_id': ward_id
        }), 200
        
    except Exception as e:
        print(f"Error creating/updating bed ward: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to update bed ward'}), 500


@bed_management_bp.route('/bed-wards/<int:ward_id>', methods=['PUT'])
@jwt_required()
def update_bed_ward(ward_id):
    """Update bed ward counts"""
    try:
        data = request.get_json()

        # Backwards compatibility: reserved_beds -> occupied_beds
        if 'reserved_beds' in data and 'occupied_beds' not in data:
            data['occupied_beds'] = data.get('reserved_beds')
        if 'reserved_beds' in data:
            data.pop('reserved_beds', None)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if 'total_beds' in data:
            update_fields.append('total_beds = %s')
            values.append(data['total_beds'])
        if 'available_beds' in data:
            update_fields.append('available_beds = %s')
            values.append(data['available_beds'])
        if 'occupied_beds' in data:
            update_fields.append('occupied_beds = %s')
            values.append(data['occupied_beds'])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        update_fields.append('updated_at = NOW()')
        values.append(ward_id)
        
        query = f"UPDATE bed_wards SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, tuple(values))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ward updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Error updating bed ward: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to update bed ward'}), 500


@bed_management_bp.route('/bed-wards/<int:ward_id>', methods=['DELETE'])
@jwt_required()
def delete_bed_ward(ward_id):
    """Delete a bed ward"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM bed_wards WHERE id = %s", (ward_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Ward deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting bed ward: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to delete bed ward'}), 500


# ============================================================================
# PRIVATE ROOM MANAGEMENT
# ============================================================================

@bed_management_bp.route('/private-rooms', methods=['GET'])
@jwt_required()
def get_private_rooms():
    """Get all private rooms for a hospital"""
    try:
        hospital_id = request.args.get('hospital_id')
        status = request.args.get('status')  # Optional filter
        
        if not hospital_id:
            return jsonify({'error': 'Hospital ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if status:
            cursor.execute("""
                SELECT * FROM private_rooms 
                WHERE hospital_id = %s AND status = %s
                ORDER BY room_number
            """, (hospital_id, status))
        else:
            cursor.execute("""
                SELECT * FROM private_rooms 
                WHERE hospital_id = %s
                ORDER BY room_number
            """, (hospital_id,))
        
        rooms = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'rooms': rooms
        }), 200
        
    except Exception as e:
        print(f"Error fetching private rooms: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to fetch private rooms'}), 500


@bed_management_bp.route('/private-rooms', methods=['POST'])
@jwt_required()
def create_private_room():
    """Create a new private room"""
    try:
        data = request.get_json()
        
        required_fields = ['hospital_id', 'room_number', 'bed_count', 'ac_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO private_rooms 
            (hospital_id, room_number, bed_count, has_attached_bathroom, 
             ac_type, status, daily_rate, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['hospital_id'],
            data['room_number'],
            data['bed_count'],
            data.get('has_attached_bathroom', False),
            data['ac_type'],
            data.get('status', 'available'),
            data.get('daily_rate', 0.00),
            data.get('notes')
        ))
        
        room_id = cursor.lastrowid
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Private room created successfully',
            'room_id': room_id
        }), 201
        
    except Exception as e:
        print(f"Error creating private room: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to create private room'}), 500


@bed_management_bp.route('/private-rooms/<int:room_id>', methods=['PUT'])
@jwt_required()
def update_private_room(room_id):
    """Update a private room"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        allowed_fields = [
            'room_number', 'bed_count', 'has_attached_bathroom', 'ac_type',
            'status', 'daily_rate', 'patient_name', 'patient_contact',
            'admission_date', 'expected_discharge_date', 'notes'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f'{field} = %s')
                values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        update_fields.append('updated_at = NOW()')
        values.append(room_id)
        
        query = f"UPDATE private_rooms SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, tuple(values))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Private room updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Error updating private room: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to update private room'}), 500


@bed_management_bp.route('/private-rooms/<int:room_id>', methods=['DELETE'])
@jwt_required()
def delete_private_room(room_id):
    """Delete a private room"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM private_rooms WHERE id = %s", (room_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Private room deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting private room: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to delete private room'}), 500


# ============================================================================
# BED ALLOCATION LOGS
# ============================================================================

@bed_management_bp.route('/bed-allocation-logs', methods=['GET'])
@jwt_required()
def get_allocation_logs():
    """Get bed allocation logs for a hospital"""
    try:
        hospital_id = request.args.get('hospital_id')
        limit = request.args.get('limit', 50)
        
        if not hospital_id:
            return jsonify({'error': 'Hospital ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM bed_allocation_logs 
            WHERE hospital_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (hospital_id, limit))
        
        logs = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'logs': logs
        }), 200
        
    except Exception as e:
        print(f"Error fetching allocation logs: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to fetch allocation logs'}), 500


@bed_management_bp.route('/bed-allocation-logs', methods=['POST'])
@jwt_required()
def create_allocation_log():
    """Create a bed allocation log entry"""
    try:
        data = request.get_json()
        
        required_fields = ['hospital_id', 'allocation_type', 'action']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO bed_allocation_logs 
            (hospital_id, ward_id, room_id, allocation_type, action, 
             patient_name, patient_contact, allocated_by, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['hospital_id'],
            data.get('ward_id'),
            data.get('room_id'),
            data['allocation_type'],
            data['action'],
            data.get('patient_name'),
            data.get('patient_contact'),
            data.get('allocated_by'),
            data.get('notes')
        ))
        
        log_id = cursor.lastrowid
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Allocation log created successfully',
            'log_id': log_id
        }), 201
        
    except Exception as e:
        print(f"Error creating allocation log: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to create allocation log'}), 500


# ============================================================================
# SUMMARY AND STATISTICS
# ============================================================================

@bed_management_bp.route('/bed-summary', methods=['GET'])
@jwt_required()
def get_bed_summary():
    """Get bed availability summary for a hospital"""
    try:
        hospital_id = request.args.get('hospital_id')
        
        if not hospital_id:
            return jsonify({'error': 'Hospital ID is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get ward statistics
        cursor.execute("""
            SELECT 
                ward_type,
                ac_type,
                SUM(total_beds) as total,
                SUM(available_beds) as available,
                SUM(occupied_beds) as occupied
            FROM bed_wards
            WHERE hospital_id = %s
            GROUP BY ward_type, ac_type
        """, (hospital_id,))
        
        ward_stats = cursor.fetchall()
        
        # Get private room statistics
        cursor.execute("""
            SELECT 
                bed_count,
                ac_type,
                has_attached_bathroom,
                status,
                COUNT(*) as count
            FROM private_rooms
            WHERE hospital_id = %s
            GROUP BY bed_count, ac_type, has_attached_bathroom, status
        """, (hospital_id,))
        
        room_stats = cursor.fetchall()
        
        # Get total counts
        cursor.execute("""
            SELECT 
                SUM(total_beds) as total_ward_beds,
                SUM(available_beds) as available_ward_beds
            FROM bed_wards
            WHERE hospital_id = %s
        """, (hospital_id,))
        
        total_stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'ward_statistics': ward_stats,
            'room_statistics': room_stats,
            'total_statistics': total_stats
        }), 200
        
    except Exception as e:
        print(f"Error fetching bed summary: {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Failed to fetch bed summary'}), 500
