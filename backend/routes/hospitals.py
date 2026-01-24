from flask import Blueprint, request, jsonify
from utils.database import get_db_connection
from flask_jwt_extended import jwt_required
import pymysql
import json
from math import radians, cos, sin, asin, sqrt

hospitals_bp = Blueprint('hospitals', __name__)


def get_hospital_bed_stats(cursor, hospital_id):
    """
    Get aggregated bed statistics from bed_wards table for a hospital.
    Returns total_beds, available_beds, and icu_beds.
    """
    cursor.execute("""
        SELECT 
            COALESCE(SUM(total_beds), 0) as total_beds,
            COALESCE(SUM(available_beds), 0) as available_beds,
            COALESCE(SUM(CASE WHEN ward_type = 'icu' THEN total_beds ELSE 0 END), 0) as icu_beds
        FROM bed_wards
        WHERE hospital_id = %s
    """, (hospital_id,))
    result = cursor.fetchone()
    return {
        'total_beds': result['total_beds'] if result else 0,
        'available_beds': result['available_beds'] if result else 0,
        'icu_beds': result['icu_beds'] if result else 0
    }


def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r


@hospitals_bp.route('/hospitals', methods=['GET'])
@jwt_required()
def get_hospitals():
    """
    Get all hospitals with optional filtering by location, city, or services.
    
    Query Parameters:
    - latitude: User's latitude for distance calculation
    - longitude: User's longitude for distance calculation
    - radius: Search radius in kilometers (default: 50)
    - city: Filter by city name
    - service: Filter by service offered
    - search: Search by hospital name
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get query parameters
        user_lat = request.args.get('latitude', type=float)
        user_lon = request.args.get('longitude', type=float)
        radius = request.args.get('radius', default=5, type=float)
        city = request.args.get('city', type=str)
        service = request.args.get('service', type=str)
        search = request.args.get('search', type=str)
        
        # Build query
        query = """
            SELECT 
                id, name, address, city, state, 
                latitude, longitude, phone, email,
                emergency_contact, total_beds, available_beds, 
                icu_beds, services, rating
            FROM hospitals
            WHERE 1=1
        """
        params = []
        
        # Add filters
        if city:
            query += " AND LOWER(city) LIKE LOWER(%s)"
            params.append(f"%{city}%")
        
        if search:
            query += " AND LOWER(name) LIKE LOWER(%s)"
            params.append(f"%{search}%")
        
        query += " ORDER BY rating DESC, name ASC"
        
        cursor.execute(query, params)
        hospitals = cursor.fetchall()
        
        # Process results
        result = []
        for hospital in hospitals:
            # Parse services JSON string to list
            services_raw = hospital['services']
            if isinstance(services_raw, str):
                try:
                    services_list = json.loads(services_raw)
                except (json.JSONDecodeError, TypeError):
                    services_list = []
            elif isinstance(services_raw, list):
                services_list = services_raw
            else:
                services_list = []
            
            # Get bed data - use aggregated bed_wards data if hospital columns are NULL or 0
            total_beds = hospital['total_beds']
            available_beds = hospital['available_beds']
            icu_beds = hospital['icu_beds']
            
            if not total_beds or total_beds == 0:
                bed_stats = get_hospital_bed_stats(cursor, hospital['id'])
                total_beds = bed_stats['total_beds']
                available_beds = bed_stats['available_beds']
                icu_beds = bed_stats['icu_beds']
            
            hospital_data = {
                'id': hospital['id'],
                'name': hospital['name'],
                'address': hospital['address'],
                'city': hospital['city'],
                'state': hospital['state'],
                'latitude': float(hospital['latitude']) if hospital['latitude'] else None,
                'longitude': float(hospital['longitude']) if hospital['longitude'] else None,
                'phone': hospital['phone'],
                'email': hospital['email'],
                'emergency_contact': hospital['emergency_contact'],
                'total_beds': total_beds,
                'available_beds': available_beds,
                'icu_beds': icu_beds,
                'services': services_list,
                'rating': float(hospital['rating']) if hospital['rating'] else 0.0,
                'distance': None
            }
            
            # Calculate distance if user location is provided
            if user_lat is not None and user_lon is not None:
                if hospital['latitude'] and hospital['longitude']:
                    distance = haversine(
                        user_lon, user_lat,
                        float(hospital['longitude']), float(hospital['latitude'])
                    )
                    hospital_data['distance'] = round(distance, 2)
                    
                    # Filter by radius if location provided
                    if distance > radius:
                        continue
            
            # Filter by service if provided
            if service:
                if not any(service.lower() in s.lower() for s in services_list):
                    continue
            
            result.append(hospital_data)
        
        # Sort by distance if location provided
        if user_lat is not None and user_lon is not None:
            result.sort(key=lambda x: x['distance'] if x['distance'] is not None else float('inf'))
        
        return jsonify({
            'hospitals': result,
            'count': len(result)
        }), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch hospitals: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@hospitals_bp.route('/hospitals/<int:hospital_id>', methods=['GET'])
@jwt_required()
def get_hospital_details(hospital_id):
    """Get detailed information about a specific hospital"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id, name, address, city, state, 
                latitude, longitude, phone, email,
                emergency_contact, total_beds, available_beds, 
                icu_beds, services, rating
            FROM hospitals
            WHERE id = %s
        """, (hospital_id,))
        
        hospital = cursor.fetchone()
        
        if not hospital:
            return jsonify({'error': 'Hospital not found'}), 404
        
        # Get doctors associated with this hospital
        cursor.execute("""
            SELECT id, name, specialty, qualification, experience, rating, is_available
            FROM hospital_doctors
            WHERE hospital_id = %s AND is_available = TRUE
            ORDER BY rating DESC
        """, (hospital_id,))
        
        doctors = cursor.fetchall()
        
        # Parse services JSON string to list
        services_raw = hospital['services']
        if isinstance(services_raw, str):
            try:
                services_list = json.loads(services_raw)
            except (json.JSONDecodeError, TypeError):
                services_list = []
        elif isinstance(services_raw, list):
            services_list = services_raw
        else:
            services_list = []
        
        # Get bed data - use aggregated bed_wards data if hospital columns are NULL or 0
        total_beds = hospital['total_beds']
        available_beds = hospital['available_beds']
        icu_beds = hospital['icu_beds']
        
        if not total_beds or total_beds == 0:
            bed_stats = get_hospital_bed_stats(cursor, hospital['id'])
            total_beds = bed_stats['total_beds']
            available_beds = bed_stats['available_beds']
            icu_beds = bed_stats['icu_beds']
        
        hospital_data = {
            'id': hospital['id'],
            'name': hospital['name'],
            'address': hospital['address'],
            'city': hospital['city'],
            'state': hospital['state'],
            'latitude': float(hospital['latitude']) if hospital['latitude'] else None,
            'longitude': float(hospital['longitude']) if hospital['longitude'] else None,
            'phone': hospital['phone'],
            'email': hospital['email'],
            'emergency_contact': hospital['emergency_contact'],
            'total_beds': total_beds,
            'available_beds': available_beds,
            'icu_beds': icu_beds,
            'services': services_list,
            'rating': float(hospital['rating']) if hospital['rating'] else 0.0,
            'doctors': doctors
        }
        
        return jsonify({'hospital': hospital_data}), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch hospital: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@hospitals_bp.route('/hospitals/nearby', methods=['GET'])
@jwt_required()
def get_nearby_hospitals():
    """
    Get nearby hospitals based on user's current location.
    Requires latitude and longitude parameters.
    """
    conn = None
    cursor = None
    try:
        user_lat = request.args.get('latitude', type=float)
        user_lon = request.args.get('longitude', type=float)
        radius = request.args.get('radius', default=5, type=float)  # Default 5km
        limit = request.args.get('limit', default=10, type=int)
        
        if user_lat is None or user_lon is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id, name, address, city, state, 
                latitude, longitude, phone, email,
                emergency_contact, total_beds, available_beds, 
                icu_beds, services, rating
            FROM hospitals
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """)
        
        hospitals = cursor.fetchall()
        
        # Calculate distances and filter
        nearby = []
        for hospital in hospitals:
            if hospital['latitude'] and hospital['longitude']:
                distance = haversine(
                    user_lon, user_lat,
                    float(hospital['longitude']), float(hospital['latitude'])
                )
                
                if distance <= radius:
                    # Get bed data - use aggregated bed_wards data if hospital columns are NULL or 0
                    total_beds = hospital['total_beds']
                    available_beds = hospital['available_beds']
                    icu_beds = hospital['icu_beds']
                    
                    if not total_beds or total_beds == 0:
                        bed_stats = get_hospital_bed_stats(cursor, hospital['id'])
                        total_beds = bed_stats['total_beds']
                        available_beds = bed_stats['available_beds']
                        icu_beds = bed_stats['icu_beds']
                    
                    nearby.append({
                        'id': hospital['id'],
                        'name': hospital['name'],
                        'address': hospital['address'],
                        'city': hospital['city'],
                        'state': hospital['state'],
                        'latitude': float(hospital['latitude']),
                        'longitude': float(hospital['longitude']),
                        'phone': hospital['phone'],
                        'email': hospital['email'],
                        'emergency_contact': hospital['emergency_contact'],
                        'total_beds': total_beds,
                        'available_beds': available_beds,
                        'icu_beds': icu_beds,
                        'services': hospital['services'],
                        'rating': float(hospital['rating']) if hospital['rating'] else 0.0,
                        'distance': round(distance, 2)
                    })
        
        # Sort by distance and limit
        nearby.sort(key=lambda x: x['distance'])
        nearby = nearby[:limit]
        
        return jsonify({
            'hospitals': nearby,
            'count': len(nearby),
            'search_radius': radius
        }), 200
        
    except pymysql.MySQLError as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to fetch nearby hospitals: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
