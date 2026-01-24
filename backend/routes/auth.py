from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import create_access_token, get_jwt_identity
from utils.database import execute_query
from utils.auth_utils import hash_password, verify_password, jwt_required_custom
from utils.validators import validate_email_format, validate_password_strength, validate_required_fields
from datetime import datetime
import json
from datetime import date, timedelta
import secrets
import threading
import time
import base64
import os
from pathlib import Path
from werkzeug.utils import secure_filename

auth_bp = Blueprint('auth', __name__)

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_USER_PHOTOS_DIR = _REPO_ROOT / 'database' / 'users'
_DEFAULT_USER_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

# Uploaded user images should NOT be committed. This folder is gitignored via `uploads/`.
_UPLOADED_USER_PHOTOS_DIR = _REPO_ROOT / 'uploads' / 'users'
_UPLOADED_USER_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)


def _allowed_image_filename(filename: str) -> bool:
    fn = (filename or '').lower()
    return fn.endswith('.png') or fn.endswith('.jpg') or fn.endswith('.jpeg') or fn.endswith('.webp')


@auth_bp.route('/user-photos/<filename>', methods=['GET'])
def user_photos(filename):
    """Serve user profile photos.

    - Default avatar lives in `database/users` (tracked in git)
    - Uploaded photos live in `uploads/users` (gitignored)
    """
    # Basic hardening: disallow path traversal.
    if not filename or '/' in filename or '\\' in filename or '..' in filename:
        return jsonify({'error': 'Invalid filename'}), 400

    uploaded_path = _UPLOADED_USER_PHOTOS_DIR / filename
    if uploaded_path.exists():
        return send_from_directory(str(_UPLOADED_USER_PHOTOS_DIR), filename)
    return send_from_directory(str(_DEFAULT_USER_PHOTOS_DIR), filename)


# --- Lightweight captcha + rate limiting ---
# Note: This is an intentionally simple, dependency-free captcha to deter naive scripting.
# It is stored in-memory, so it resets on backend restart (OK for this use-case).

_captcha_lock = threading.Lock()
_captcha_store = {}  # captcha_id -> {answer:int, expires_at:float, ip:str, used:bool}

_rate_lock = threading.Lock()
_rate_store = {}  # key -> [timestamps]


def _get_client_ip() -> str:
    # Respect common proxy header if present.
    xff = request.headers.get('X-Forwarded-For')
    if xff:
        # XFF is a CSV list; take the first hop
        return (xff.split(',')[0] or '').strip() or (request.remote_addr or '')
    return request.remote_addr or ''


def _rate_limited(key: str, limit: int, window_seconds: int) -> bool:
    now = time.time()
    cutoff = now - float(window_seconds)
    with _rate_lock:
        lst = _rate_store.get(key) or []
        lst = [t for t in lst if t >= cutoff]
        if len(lst) >= int(limit):
            _rate_store[key] = lst
            return True
        lst.append(now)
        _rate_store[key] = lst
    return False


def _new_captcha(ip: str) -> dict:
    # Image captcha: random text rendered into a PNG with light noise.
    # This is meant to deter naive scripts, not to be bot-proof.
    try:
        from PIL import Image, ImageDraw, ImageFilter, ImageFont
    except Exception as exc:
        raise RuntimeError("Captcha image generation requires Pillow") from exc

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # avoid ambiguous 0/O, 1/I
    text = "".join(alphabet[secrets.randbelow(len(alphabet))] for _ in range(5))

    width, height = 180, 64
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Font: try a common bundled font; fall back to PIL default.
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 34)
    except Exception:
        font = ImageFont.load_default()

    # Background noise (lines)
    for _ in range(6):
        x1 = secrets.randbelow(width)
        y1 = secrets.randbelow(height)
        x2 = secrets.randbelow(width)
        y2 = secrets.randbelow(height)
        color = (secrets.randbelow(120), secrets.randbelow(120), secrets.randbelow(120))
        draw.line((x1, y1, x2, y2), fill=color, width=2)

    # Dots
    for _ in range(120):
        x = secrets.randbelow(width)
        y = secrets.randbelow(height)
        color = (secrets.randbelow(180), secrets.randbelow(180), secrets.randbelow(180))
        draw.point((x, y), fill=color)

    # Text (slightly jittered)
    x = 18
    for ch in text:
        y = 10 + secrets.randbelow(12)
        color = (secrets.randbelow(60), secrets.randbelow(60), secrets.randbelow(60))
        draw.text((x, y), ch, font=font, fill=color)
        x += 28 + secrets.randbelow(6)

    # Gentle blur to make OCR a bit harder
    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))

    from io import BytesIO

    buf = BytesIO()
    img.save(buf, format="PNG")
    png_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    captcha_id = secrets.token_urlsafe(16)
    expires_at = time.time() + 5 * 60  # 5 minutes

    with _captcha_lock:
        # Best-effort pruning of expired/used captchas to avoid unbounded growth.
        now = time.time()
        if _captcha_store:
            for cid, rec in list(_captcha_store.items()):
                try:
                    if rec.get('used') or float(rec.get('expires_at') or 0) < now:
                        _captcha_store.pop(cid, None)
                except Exception:
                    _captcha_store.pop(cid, None)

        _captcha_store[captcha_id] = {
            'answer': text.upper(),
            'expires_at': float(expires_at),
            'ip': ip,
            'used': False,
        }

    return {
        'captcha_id': captcha_id,
        'image_base64': png_b64,
        'mime_type': 'image/png',
        'expires_in_seconds': 300,
    }


def _verify_captcha(captcha_id: str, captcha_answer, ip: str) -> (bool, str):
    cid = (captcha_id or '').strip()
    if not cid:
        return False, 'Missing captcha_id'

    provided = ("" if captcha_answer is None else str(captcha_answer)).strip().upper()
    if not provided:
        return False, 'Invalid captcha answer'

    now = time.time()
    with _captcha_lock:
        rec = _captcha_store.get(cid)
        if not rec:
            return False, 'Captcha expired or invalid'
        if rec.get('used'):
            return False, 'Captcha already used'
        if float(rec.get('expires_at') or 0) < now:
            _captcha_store.pop(cid, None)
            return False, 'Captcha expired or invalid'
        # Bind captcha to IP to reduce token reuse.
        if (rec.get('ip') or '') != (ip or ''):
            return False, 'Captcha invalid'

        expected = (rec.get('answer') or '').strip().upper()
        if expected != provided:
            return False, 'Incorrect captcha'

        # One-time use: invalidate.
        rec['used'] = True
        _captcha_store.pop(cid, None)
    return True, ''


@auth_bp.route('/captcha', methods=['GET'])
def captcha():
    ip = _get_client_ip()
    # Throttle captcha generation itself
    if _rate_limited(f"captcha:{ip}", limit=60, window_seconds=60):
        return jsonify({'error': 'Too many captcha requests. Please slow down.'}), 429
    return jsonify(_new_captcha(ip)), 200


def _require_admin_identity():
    identity = get_jwt_identity()
    identity_s = str(identity or "")
    if not identity_s.startswith("admin_"):
        raise PermissionError("Admin access required")
    return identity_s


def _parse_range_days(value: str) -> int:
    v = (value or "").strip().lower()
    if v in {"7", "7d", "week", "1w"}:
        return 7
    if v in {"30", "30d", "month", "1m"}:
        return 30
    if v in {"90", "90d", "3m"}:
        return 90
    try:
        n = int(v.replace("d", ""))
        return max(1, min(n, 365))
    except Exception:
        return 30


def _date_start(days: int) -> date:
    days_i = max(1, min(int(days or 30), 365))
    end = date.today()
    return end - timedelta(days=days_i - 1)


def _fill_daily_series(start: date, days: int, by_day: dict, factory: dict):
    end = start + timedelta(days=days - 1)
    series = []
    cur = start
    while cur <= end:
        key = cur.isoformat()
        series.append(by_day.get(key, {'day': key, **factory}))
        cur += timedelta(days=1)
    return series

# User Registration
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        ip = _get_client_ip()
        # Basic anti-burst protection
        if _rate_limited(f"register:user:{ip}", limit=10, window_seconds=60):
            return jsonify({'error': 'Too many registration attempts. Please try again later.'}), 429

        data = request.get_json()
        
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password', 'name', 'captcha_id', 'captcha_answer'])
        if not is_valid:
            return jsonify({'error': error}), 400

        ok, captcha_err = _verify_captcha(data.get('captcha_id'), data.get('captcha_answer'), ip)
        if not ok:
            return jsonify({'error': captcha_err}), 400
        
        email = data.get('email').lower().strip()
        password = data.get('password')
        name = data.get('name').strip()
        phone = data.get('phone', '').strip()
        
        # Validate email format
        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        # Validate password strength
        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        # Check if user already exists
        query = "SELECT id FROM users WHERE email = %s"
        existing_user = execute_query(query, (email,), fetch_one=True)
        
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Insert new user
        insert_query = """
            INSERT INTO users (email, password_hash, name, phone, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        user_id = execute_query(
            insert_query,
            (email, hashed_password, name, phone, datetime.now()),
            commit=True
        )
        
        # Create access token
        access_token = create_access_token(identity=str(user_id))
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'email': email,
                'name': name,
                'role': 'user'
            },
            'access_token': access_token
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

# Doctor Registration
@auth_bp.route('/doctor/register', methods=['POST'])
def register_doctor():
    try:
        ip = _get_client_ip()
        if _rate_limited(f"register:doctor:{ip}", limit=10, window_seconds=60):
            return jsonify({'error': 'Too many registration attempts. Please try again later.'}), 429

        data = request.get_json()

        # Required fields
        required = ['name', 'email', 'password', 'captcha_id', 'captcha_answer']
        is_valid, error = validate_required_fields(data, required)
        if not is_valid:
            return jsonify({'error': error}), 400

        ok, captcha_err = _verify_captcha(data.get('captcha_id'), data.get('captcha_answer'), ip)
        if not ok:
            return jsonify({'error': captcha_err}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')
        doctor_name = data.get('name').strip()
        specialty = (data.get('specialty') or '').strip()
        specialty_other = (data.get('specialty_other') or '').strip()
        specialty_id = data.get('specialty_id')

        # New (multi-select) payload shape from frontend
        specialties_input = data.get('specialties')
        specialty_ids_input = data.get('specialty_ids')
        qualification = data.get('qualification', '').strip()
        experience = int(data.get('experience') or 0)
        hospital_id = int(data.get('hospital_id') or 0)
        consultation_fee = float(data.get('consultation_fee') or 0.0)
        phone = data.get('phone', '').strip()
        bio = data.get('bio', '').strip()

        # Resolve specialty (supports both single-select and multi-select)
        resolved_specialty = None
        resolved_specialty_id = None
        resolved_specialties = []

        def _normalize_specialty_name(value: str) -> str:
            return (value or '').strip()

        def _add_resolved(name: str):
            name = _normalize_specialty_name(name)
            if not name:
                return
            lowered = name.lower()
            if lowered not in {s.lower() for s in resolved_specialties}:
                resolved_specialties.append(name)

        # If frontend sent a list, treat it as the source of truth.
        if isinstance(specialties_input, list) and specialties_input:
            cleaned = [_normalize_specialty_name(x) for x in specialties_input if isinstance(x, str)]
            cleaned = [x for x in cleaned if x]
            if not cleaned:
                return jsonify({'error': 'Specialties must be a non-empty list of strings'}), 400

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
                placeholders = ','.join(['%s'] * len(ids))
                rows = execute_query(
                    f'SELECT id, name FROM specialties WHERE id IN ({placeholders})',
                    tuple(ids),
                    fetch_all=True,
                ) or []
                by_id = {int(r['id']): r.get('name') for r in rows if r and r.get('id') is not None}
                for sid in ids:
                    spec_name = by_id.get(int(sid))
                    if spec_name and (spec_name or '').lower() != 'other':
                        _add_resolved(spec_name)

            # Resolve names (canonicalize if they match DB)
            for spec in cleaned:
                match = execute_query(
                    'SELECT id, name FROM specialties WHERE LOWER(name) = LOWER(%s) LIMIT 1',
                    (spec,),
                    fetch_one=True,
                )
                if match and (match.get('name') or '').lower() != 'other':
                    _add_resolved(match.get('name'))
                else:
                    # Treat unknown as custom "Other" specialty
                    _add_resolved(spec)

            # Choose primary specialty
            resolved_specialty = resolved_specialties[0] if resolved_specialties else None
            if resolved_specialty:
                primary_match = execute_query(
                    'SELECT id, name FROM specialties WHERE LOWER(name) = LOWER(%s) LIMIT 1',
                    (resolved_specialty,),
                    fetch_one=True,
                )
                if primary_match and (primary_match.get('name') or '').lower() != 'other':
                    resolved_specialty_id = primary_match.get('id')
                else:
                    other_row = execute_query(
                        'SELECT id FROM specialties WHERE LOWER(name) = "other" LIMIT 1',
                        fetch_one=True,
                    )
                    resolved_specialty_id = other_row.get('id') if other_row else None

        elif specialty_id is not None and str(specialty_id).strip() != '':
            try:
                resolved_specialty_id = int(specialty_id)
            except (TypeError, ValueError):
                return jsonify({'error': 'specialty_id must be an integer'}), 400

            row = execute_query(
                'SELECT id, name FROM specialties WHERE id = %s',
                (resolved_specialty_id,),
                fetch_one=True,
            )
            if not row:
                return jsonify({'error': 'Invalid specialty_id'}), 400

            if (row.get('name') or '').lower() == 'other':
                if not (specialty_other or specialty):
                    return jsonify({'error': 'Please provide specialty_other when selecting Other'}), 400
                resolved_specialty = specialty_other or specialty
            else:
                resolved_specialty = row.get('name')

        else:
            # Backward compatible: accept a specialty string.
            if not specialty:
                return jsonify({'error': 'Missing required fields: specialty or specialty_id'}), 400

            # If it matches a predefined specialty, canonicalize it and store specialty_id.
            match = execute_query(
                'SELECT id, name FROM specialties WHERE LOWER(name) = LOWER(%s) LIMIT 1',
                (specialty,),
                fetch_one=True,
            )
            if match:
                resolved_specialty_id = match.get('id')
                if (match.get('name') or '').lower() == 'other':
                    resolved_specialty = specialty_other or specialty
                else:
                    resolved_specialty = match.get('name')
            else:
                # Treat unknown as Other
                other_row = execute_query(
                    'SELECT id, name FROM specialties WHERE LOWER(name) = "other" LIMIT 1',
                    fetch_one=True,
                )
                resolved_specialty_id = other_row.get('id') if other_row else None
                resolved_specialty = specialty_other or specialty

        if not resolved_specialty:
            return jsonify({'error': 'Specialty is required'}), 400

        if not resolved_specialties:
            _add_resolved(resolved_specialty)

        # Validate email and password
        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400

        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Check if doctor exists
        query = "SELECT id FROM doctors WHERE email=%s"
        existing = execute_query(query, (email,), fetch_one=True)
        if existing:
            return jsonify({'error': 'Email already registered'}), 409 

        # Hash password
        hashed_password = hash_password(password)

        specialties_json = json.dumps(resolved_specialties, ensure_ascii=False)

        # Insert into DB (try with multi-specialty column, fallback if DB hasn't been migrated)
        insert_query = """
        INSERT INTO doctors (name, email, password_hash, phone, specialty, specialty_id, specialties, qualification, experience, hospital_id, consultation_fee, bio, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        params = (doctor_name, email, hashed_password, phone, resolved_specialty, resolved_specialty_id, specialties_json, qualification, experience, hospital_id, consultation_fee, bio, datetime.now())

        try:
            doctor_id = execute_query(insert_query, params, commit=True)
        except Exception as e:
            # Unknown column 'specialties' (older DB) -> retry without it
            if 'Unknown column' in str(e) and 'specialties' in str(e):
                fallback_query = """
                INSERT INTO doctors (name, email, password_hash, phone, specialty, specialty_id, qualification, experience, hospital_id, consultation_fee, bio, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """
                fallback_params = (doctor_name, email, hashed_password, phone, resolved_specialty, resolved_specialty_id, qualification, experience, hospital_id, consultation_fee, bio, datetime.now())
                doctor_id = execute_query(fallback_query, fallback_params, commit=True)
            else:
                raise

        # JWT token
        access_token = create_access_token(identity=str(doctor_id))

        return jsonify({
            'message': 'Doctor registered successfully',
            'user': {
                'id': doctor_id,
                'email': email,
                'name': doctor_name,
                'specialty': resolved_specialty,
                'specialties': resolved_specialties,
                'role': 'doctor'
            },
            'access_token': access_token
        }), 201

    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

# Login
@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user or doctor"""
    try:
        data = request.get_json()
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password'])
        if not is_valid:
            return jsonify({'error': error}), 400

        email = data.get('email').lower().strip()
        password = data.get('password')
        role = data.get('role', 'user')  # default to user

        if role == 'doctor':
            query = "SELECT id, email, password_hash, name, phone, specialty, specialty_id, specialties FROM doctors WHERE email = %s"
            user = execute_query(query, (email,), fetch_one=True)
        else:
            query = "SELECT id, email, password_hash, name, phone FROM users WHERE email = %s"
            user = execute_query(query, (email,), fetch_one=True)

        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not verify_password(password, user['password_hash']):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=str(user['id']))

        user_data = {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'phone': user['phone'],
            'role': role
        }
        if role == 'doctor' and 'specialty' in user:
            user_data['specialty'] = user['specialty']
        if role == 'doctor' and 'specialties' in user:
            user_data['specialties'] = user.get('specialties')
        if role == 'doctor' and 'specialty_id' in user:
            user_data['specialty_id'] = user.get('specialty_id')

        return jsonify({
            'message': 'Login successful',
            'user': user_data,
            'access_token': access_token
        }), 200

    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required_custom
def get_profile():
    """Get user profile"""
    try:
        user_id = get_jwt_identity()
        
        query = """
            SELECT id, email, name, phone, date_of_birth, gender, 
                blood_group, address, created_at,
                photo_url AS profile_picture
            FROM users 
            WHERE id = %s
        """
        user = execute_query(query, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Convert datetime to string
        if user['created_at']:
            user['created_at'] = user['created_at'].isoformat()
        if user['date_of_birth']:
            user['date_of_birth'] = user['date_of_birth'].isoformat()
        
        # Get user stats
        stats_query = """
            SELECT COUNT(*) as appointments 
            FROM appointments 
            WHERE user_id = %s
        """
        appointments_count = execute_query(stats_query, (user_id,), fetch_one=True)
        
        stats = {
            'appointments': appointments_count['appointments'] if appointments_count else 0,
            'reports': 0,  # Placeholder for future feature
            'day_streak': 0  # Placeholder for future feature
        }
        
        return jsonify({
            'user': user,
            'stats': stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required_custom
def update_profile():
    """Update user profile"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Fields that can be updated
        allowed_fields = ['name', 'phone', 'date_of_birth', 'gender', 'blood_group', 'address']
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        update_values.append(user_id)
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        execute_query(query, tuple(update_values), commit=True)
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500


@auth_bp.route('/profile/photo', methods=['POST'])
@jwt_required_custom
def update_profile_photo():
    """Upload a new profile photo and store its URL in users.photo_url."""
    try:
        user_id = get_jwt_identity()

        file = request.files.get('photo') or request.files.get('file')
        if not file or not file.filename:
            return jsonify({'error': 'Missing image file'}), 400

        if not _allowed_image_filename(file.filename):
            return jsonify({'error': 'Unsupported file type. Use png, jpg, jpeg, or webp.'}), 400

        # Enforce max upload size ~2MB (best effort; relies on WSGI/server too)
        try:
            file.stream.seek(0, os.SEEK_END)
            size = file.stream.tell()
            file.stream.seek(0)
            if size and int(size) > 2 * 1024 * 1024:
                return jsonify({'error': 'Image size should be less than 2MB'}), 400
        except Exception:
            pass

        original = secure_filename(file.filename)
        ext = os.path.splitext(original)[1].lower() or '.png'
        if ext not in {'.png', '.jpg', '.jpeg', '.webp'}:
            ext = '.png'

        unique = secrets.token_hex(6)
        filename = f"user_{user_id}_{int(time.time())}_{unique}{ext}"
        save_path = _UPLOADED_USER_PHOTOS_DIR / filename
        file.save(str(save_path))

        photo_url = f"/api/auth/user-photos/{filename}"
        execute_query(
            "UPDATE users SET photo_url = %s WHERE id = %s",
            (photo_url, user_id),
            commit=True,
        )

        return jsonify({'message': 'Profile photo updated', 'profile_picture': photo_url}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to update profile photo: {str(e)}'}), 500

# Admin Login
@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password'])
        if not is_valid:
            return jsonify({'error': error}), 400
        
        email = data.get('email').lower().strip()
        password = data.get('password')
        
        # Get admin from database
        query = "SELECT id, email, password_hash, name, role, is_active FROM admins WHERE email = %s"
        admin = execute_query(query, (email,), fetch_one=True)
        
        if not admin:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not admin['is_active']:
            return jsonify({'error': 'Admin account is inactive'}), 403
        
        # Verify password
        if not verify_password(password, admin['password_hash']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Update last login
        update_query = "UPDATE admins SET last_login = %s WHERE id = %s"
        execute_query(update_query, (datetime.now(), admin['id']), commit=True)
        
        # Create access token
        access_token = create_access_token(identity=f"admin_{admin['id']}")
        
        return jsonify({
            'message': 'Admin login successful',
            'admin': {
                'id': admin['id'],
                'email': admin['email'],
                'name': admin['name'],
                'role': admin['role']
            },
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Admin login failed: {str(e)}'}), 500


# Hospital Login
@auth_bp.route('/hospital/login', methods=['POST'])
def hospital_login():
    """Hospital login endpoint (uses hospitals table as account store)."""
    try:
        data = request.get_json(silent=True) or {}

        is_valid, error = validate_required_fields(data, ['email', 'password'])
        if not is_valid:
            return jsonify({'error': error}), 400

        email = (data.get('email') or '').lower().strip()
        password = data.get('password')

        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400

        hospital = execute_query(
            """
            SELECT id, name, email, password_hash, phone, address, city, state, latitude, longitude
            FROM hospitals
            WHERE LOWER(email) = LOWER(%s)
            LIMIT 1
            """,
            (email,),
            fetch_one=True,
        )

        if not hospital:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not verify_password(password, hospital.get('password_hash') or ''):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=f"hospital_{hospital['id']}")

        hospital_data = {
            'id': hospital['id'],
            'name': hospital.get('name'),
            'email': hospital.get('email'),
            'phone': hospital.get('phone'),
            'address': hospital.get('address'),
            'city': hospital.get('city'),
            'state': hospital.get('state'),
            'latitude': float(hospital['latitude']) if hospital.get('latitude') is not None else None,
            'longitude': float(hospital['longitude']) if hospital.get('longitude') is not None else None,
            'role': 'hospital',
        }

        return jsonify({
            'message': 'Hospital login successful',
            'hospital': hospital_data,
            'access_token': access_token,
        }), 200

    except Exception as e:
        return jsonify({'error': f'Hospital login failed: {str(e)}'}), 500


# Get Dashboard Statistics
@auth_bp.route('/admin/dashboard-stats', methods=['GET'])
@jwt_required_custom
def get_dashboard_stats():
    """Get dashboard statistics for admin"""
    try:
        _require_admin_identity()

        # Total users
        users_query = "SELECT COUNT(*) as count FROM users"
        users_count = execute_query(users_query, fetch_one=True)
        
        # Total doctors
        doctors_query = "SELECT COUNT(*) as count FROM doctors"
        doctors_count = execute_query(doctors_query, fetch_one=True)
        
        # Pending appointments
        appointments_query = "SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'"
        pending_appointments = execute_query(appointments_query, fetch_one=True)
        
        # Active SOS alerts
        sos_query = "SELECT COUNT(*) as count FROM emergency_requests WHERE status = 'pending'"
        active_sos = execute_query(sos_query, fetch_one=True)
        
        # Medical reports reviewed
        reports_query = "SELECT COUNT(*) as count FROM medical_reports"
        total_reports = execute_query(reports_query, fetch_one=True)
        
        # Chat messages today
        chats_query = "SELECT COUNT(*) as count FROM chat_messages WHERE DATE(created_at) = CURDATE()"
        chats_today = execute_query(chats_query, fetch_one=True)
        
        return jsonify({
            'total_users': users_count['count'],
            'total_doctors': doctors_count['count'],
            'pending_appointments': pending_appointments['count'],
            'active_sos_alerts': active_sos['count'],
            'total_reports': total_reports['count'],
            'chats_today': chats_today['count']
        }), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch statistics: {str(e)}'}), 500


@auth_bp.route('/admin/hospitals', methods=['POST'])
@jwt_required_custom
def admin_create_hospital():
    """Create a hospital account + set location (admin only)."""
    try:
        _require_admin_identity()

        data = request.get_json(silent=True) or {}
        required = ['name', 'address', 'email', 'password', 'latitude', 'longitude']
        is_valid, error = validate_required_fields(data, required)
        if not is_valid:
            return jsonify({'error': error}), 400

        name = (data.get('name') or '').strip()
        address = (data.get('address') or '').strip()
        city = (data.get('city') or '').strip() or None
        state = (data.get('state') or '').strip() or None
        phone = (data.get('phone') or '').strip() or None
        emergency_contact = (data.get('emergency_contact') or '').strip() or None

        email = (data.get('email') or '').lower().strip()
        password = data.get('password')

        # Geo
        try:
            latitude = float(data.get('latitude'))
            longitude = float(data.get('longitude'))
        except (TypeError, ValueError):
            return jsonify({'error': 'latitude and longitude must be numbers'}), 400

        # Validate email + password
        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400

        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Prevent duplicates (best-effort; DB may not have unique constraint)
        existing = execute_query(
            'SELECT id FROM hospitals WHERE LOWER(email) = LOWER(%s) LIMIT 1',
            (email,),
            fetch_one=True,
        )
        if existing:
            return jsonify({'error': 'Hospital email already exists'}), 409

        hashed = hash_password(password)

        total_beds = data.get('total_beds')
        available_beds = data.get('available_beds')
        icu_beds = data.get('icu_beds')
        services = data.get('services')
        services_json = None
        if services is not None:
            # Accept list or string; store as JSON
            if isinstance(services, list):
                services_json = json.dumps(services, ensure_ascii=False)
            elif isinstance(services, str) and services.strip():
                services_json = json.dumps([s.strip() for s in services.split(',') if s.strip()], ensure_ascii=False)

        hospital_id = execute_query(
            """
            INSERT INTO hospitals (
                name, address, city, state,
                latitude, longitude,
                phone, email, password_hash,
                emergency_contact,
                total_beds, available_beds, icu_beds,
                services, created_at
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s,
                %s, %s, %s,
                %s, %s
            )
            """,
            (
                name, address, city, state,
                latitude, longitude,
                phone, email, hashed,
                emergency_contact,
                total_beds, available_beds, icu_beds,
                services_json, datetime.now(),
            ),
            commit=True,
        )

        return jsonify({
            'message': 'Hospital account created',
            'hospital': {
                'id': hospital_id,
                'name': name,
                'email': email,
                'latitude': latitude,
                'longitude': longitude,
            }
        }), 201

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to create hospital: {str(e)}'}), 500


@auth_bp.route('/admin/admins', methods=['POST'])
@jwt_required_custom
def admin_create_admin_account():
    """Create a new admin account (admin only)."""
    try:
        _require_admin_identity()

        data = request.get_json(silent=True) or {}
        required = ['name', 'email', 'password']
        is_valid, error = validate_required_fields(data, required)
        if not is_valid:
            return jsonify({'error': error}), 400

        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').lower().strip()
        password = data.get('password')
        role = (data.get('role') or 'admin').strip() or 'admin'
        is_active = data.get('is_active')

        if len(role) > 50:
            return jsonify({'error': 'role is too long'}), 400

        is_valid, error = validate_email_format(email)
        if not is_valid:
            return jsonify({'error': error}), 400

        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return jsonify({'error': error}), 400

        existing = execute_query(
            'SELECT id FROM admins WHERE LOWER(email) = LOWER(%s) LIMIT 1',
            (email,),
            fetch_one=True,
        )
        if existing:
            return jsonify({'error': 'Admin email already exists'}), 409

        hashed = hash_password(password)

        if is_active is None:
            is_active = True
        else:
            is_active = bool(is_active)

        admin_id = execute_query(
            """
            INSERT INTO admins (email, password_hash, name, role, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (email, hashed, name, role, is_active, datetime.now()),
            commit=True,
        )

        return jsonify({
            'message': 'Admin account created',
            'admin': {
                'id': admin_id,
                'email': email,
                'name': name,
                'role': role,
                'is_active': is_active,
            }
        }), 201

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to create admin: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/appointments', methods=['GET'])
@jwt_required_custom
def admin_appointments_analytics():
    """Return appointment counts per day for charting (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '30d'))
        start = _date_start(days)

        rows = execute_query(
            """
            SELECT
              DATE(created_at) AS day,
              COUNT(*) AS total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM appointments
            WHERE created_at >= %s
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            (start,),
            fetch_all=True,
        )

        by_day = {}
        for r in rows or []:
            d = r.get('day')
            if not d:
                continue
            try:
                key = d.isoformat()
            except Exception:
                key = str(d)
            by_day[key] = {
                'day': key,
                'total': int(r.get('total') or 0),
                'pending': int(r.get('pending') or 0),
                'confirmed': int(r.get('confirmed') or 0),
                'completed': int(r.get('completed') or 0),
                'cancelled': int(r.get('cancelled') or 0),
            }

        series = _fill_daily_series(
            start,
            days,
            by_day,
            {
                'total': 0,
                'pending': 0,
                'confirmed': 0,
                'completed': 0,
                'cancelled': 0,
            },
        )

        return jsonify({'range_days': days, 'series': series}), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/doctors/activity', methods=['GET'])
@jwt_required_custom
def admin_doctors_activity_analytics():
    """Doctor activity stats: zero appointments + top performers (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '30d'))
        start = _date_start(days)
        limit = request.args.get('limit', '10')
        try:
            limit_i = max(1, min(int(limit), 50))
        except Exception:
            limit_i = 10

        totals = execute_query('SELECT COUNT(*) AS count FROM doctors', fetch_one=True) or {}
        active = execute_query(
            """
            SELECT COUNT(DISTINCT doctor_id) AS count
            FROM appointments
            WHERE created_at >= %s
            """,
            (start,),
            fetch_one=True,
        ) or {}

        zero = execute_query(
            """
            SELECT COUNT(*) AS count
            FROM doctors d
            LEFT JOIN appointments a ON a.doctor_id = d.id
            WHERE a.id IS NULL
            """,
            fetch_one=True,
        ) or {}

        top = execute_query(
            """
            SELECT d.id, d.name, d.specialty, COUNT(a.id) AS appointments
            FROM doctors d
            JOIN appointments a ON a.doctor_id = d.id
            WHERE a.created_at >= %s
            GROUP BY d.id, d.name, d.specialty
            ORDER BY appointments DESC
            LIMIT %s
            """,
            (start, limit_i),
            fetch_all=True,
        )

        return jsonify(
            {
                'range_days': days,
                'total_doctors': int((totals or {}).get('count') or 0),
                'active_doctors': int((active or {}).get('count') or 0),
                'doctors_with_zero_appointments': int((zero or {}).get('count') or 0),
                'top_doctors': top or [],
            }
        ), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/specialties', methods=['GET'])
@jwt_required_custom
def admin_specialties_analytics():
    """Specialty distribution and demand (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '30d'))
        start = _date_start(days)

        distribution = execute_query(
            """
            SELECT specialty, COUNT(*) AS doctors
            FROM doctors
            GROUP BY specialty
            ORDER BY doctors DESC
            LIMIT 20
            """,
            fetch_all=True,
        )

        demand = execute_query(
            """
            SELECT d.specialty AS specialty, COUNT(a.id) AS appointments
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor_id
            WHERE a.created_at >= %s
            GROUP BY d.specialty
            ORDER BY appointments DESC
            LIMIT 20
            """,
            (start,),
            fetch_all=True,
        )

        return jsonify({'range_days': days, 'distribution': distribution or [], 'demand': demand or []}), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/chats', methods=['GET'])
@jwt_required_custom
def admin_chats_analytics():
    """AI chat + consultation chat analytics (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '30d'))
        start = _date_start(days)

        ai_rows = execute_query(
            """
            SELECT DATE(created_at) AS day,
                   COUNT(*) AS messages,
                   COUNT(DISTINCT user_id) AS sessions
            FROM chat_messages
            WHERE created_at >= %s
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            (start,),
            fetch_all=True,
        )

        consult_threads = execute_query(
            """
            SELECT DATE(created_at) AS day,
                   COUNT(*) AS threads
            FROM consultation_threads
            WHERE created_at >= %s
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            (start,),
            fetch_all=True,
        )

        consult_msgs = execute_query(
            """
            SELECT DATE(created_at) AS day,
                   COUNT(*) AS messages
            FROM consultation_messages
            WHERE created_at >= %s
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            (start,),
            fetch_all=True,
        )

        by_day = {}

        for r in ai_rows or []:
            d = r.get('day')
            if not d:
                continue
            key = d.isoformat() if hasattr(d, 'isoformat') else str(d)
            by_day.setdefault(key, {'day': key, 'ai_sessions': 0, 'ai_messages': 0, 'consult_threads': 0, 'consult_messages': 0})
            by_day[key]['ai_sessions'] = int(r.get('sessions') or 0)
            by_day[key]['ai_messages'] = int(r.get('messages') or 0)

        for r in consult_threads or []:
            d = r.get('day')
            if not d:
                continue
            key = d.isoformat() if hasattr(d, 'isoformat') else str(d)
            by_day.setdefault(key, {'day': key, 'ai_sessions': 0, 'ai_messages': 0, 'consult_threads': 0, 'consult_messages': 0})
            by_day[key]['consult_threads'] = int(r.get('threads') or 0)

        for r in consult_msgs or []:
            d = r.get('day')
            if not d:
                continue
            key = d.isoformat() if hasattr(d, 'isoformat') else str(d)
            by_day.setdefault(key, {'day': key, 'ai_sessions': 0, 'ai_messages': 0, 'consult_threads': 0, 'consult_messages': 0})
            by_day[key]['consult_messages'] = int(r.get('messages') or 0)

        series = _fill_daily_series(
            start,
            days,
            by_day,
            {'ai_sessions': 0, 'ai_messages': 0, 'consult_threads': 0, 'consult_messages': 0},
        )

        return jsonify({'range_days': days, 'series': series}), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/reports', methods=['GET'])
@jwt_required_custom
def admin_reports_analytics():
    """Medical reports analytics (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '30d'))
        start = _date_start(days)

        daily_rows = execute_query(
            """
            SELECT DATE(uploaded_at) AS day,
                   COUNT(*) AS total,
                   SUM(CASE WHEN ocr_text IS NOT NULL AND LENGTH(TRIM(ocr_text)) > 0 THEN 1 ELSE 0 END) AS ocr_success,
                   SUM(CASE WHEN ocr_text IS NULL OR LENGTH(TRIM(ocr_text)) = 0 THEN 1 ELSE 0 END) AS ocr_failed,
                   SUM(CASE WHEN ai_interpretation IS NOT NULL AND LENGTH(TRIM(ai_interpretation)) > 0 THEN 1 ELSE 0 END) AS ai_simplified
            FROM medical_reports
            WHERE uploaded_at >= %s
            GROUP BY DATE(uploaded_at)
            ORDER BY day ASC
            """,
            (start,),
            fetch_all=True,
        )

        by_day = {}
        for r in daily_rows or []:
            d = r.get('day')
            if not d:
                continue
            key = d.isoformat() if hasattr(d, 'isoformat') else str(d)
            by_day[key] = {
                'day': key,
                'total': int(r.get('total') or 0),
                'ocr_success': int(r.get('ocr_success') or 0),
                'ocr_failed': int(r.get('ocr_failed') or 0),
                'ai_simplified': int(r.get('ai_simplified') or 0),
            }

        series = _fill_daily_series(
            start,
            days,
            by_day,
            {'total': 0, 'ocr_success': 0, 'ocr_failed': 0, 'ai_simplified': 0},
        )

        names = execute_query(
            """
            SELECT file_name
            FROM medical_reports
            WHERE uploaded_at >= %s
            LIMIT 5000
            """,
            (start,),
            fetch_all=True,
        )

        ext_counts = {}
        for row in names or []:
            name = (row.get('file_name') or '').strip().lower()
            ext = 'unknown'
            if '.' in name:
                ext = name.rsplit('.', 1)[-1]
                if len(ext) > 8:
                    ext = 'unknown'
            ext_counts[ext] = ext_counts.get(ext, 0) + 1

        file_types = [
            {'type': k, 'count': v}
            for k, v in sorted(ext_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
        ]

        return jsonify({'range_days': days, 'series': series, 'file_types': file_types}), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/symptoms', methods=['GET'])
@jwt_required_custom
def admin_symptoms_analytics():
    """Symptom checker analytics (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '30d'))
        start = _date_start(days)

        daily_rows = execute_query(
            """
            SELECT DATE(created_at) AS day,
                   COUNT(*) AS total,
                   SUM(CASE WHEN urgency_level = 'low' THEN 1 ELSE 0 END) AS low,
                   SUM(CASE WHEN urgency_level = 'medium' THEN 1 ELSE 0 END) AS medium,
                   SUM(CASE WHEN urgency_level = 'high' THEN 1 ELSE 0 END) AS high
            FROM symptom_logs
            WHERE created_at >= %s
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            (start,),
            fetch_all=True,
        )

        by_day = {}
        for r in daily_rows or []:
            d = r.get('day')
            if not d:
                continue
            key = d.isoformat() if hasattr(d, 'isoformat') else str(d)
            by_day[key] = {
                'day': key,
                'total': int(r.get('total') or 0),
                'low': int(r.get('low') or 0),
                'medium': int(r.get('medium') or 0),
                'high': int(r.get('high') or 0),
            }

        series = _fill_daily_series(start, days, by_day, {'total': 0, 'low': 0, 'medium': 0, 'high': 0})

        rows = execute_query(
            """
            SELECT symptoms
            FROM symptom_logs
            WHERE created_at >= %s
            LIMIT 5000
            """,
            (start,),
            fetch_all=True,
        )

        counts = {}
        for r in rows or []:
            raw = (r.get('symptoms') or '').strip().lower()
            if not raw:
                continue
            parts = [p.strip() for p in raw.replace('\n', ',').replace(';', ',').split(',')]
            parts = [p for p in parts if p]
            if not parts:
                continue
            for p in parts[:10]:
                counts[p] = counts.get(p, 0) + 1

        top = [
            {'symptom': k, 'count': v}
            for k, v in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:12]
        ]

        return jsonify({'range_days': days, 'series': series, 'top_symptoms': top}), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500


@auth_bp.route('/admin/analytics/weight', methods=['GET'])
@jwt_required_custom
def admin_weight_analytics():
    """Weight management engagement analytics (admin only)."""

    try:
        _require_admin_identity()
        days = _parse_range_days(request.args.get('range', '90d'))
        start = _date_start(days)

        active_goals = execute_query(
            """
            SELECT COUNT(*) AS count
            FROM weight_goals
            WHERE is_active = TRUE
            """,
            fetch_one=True,
        ) or {}

        entries = execute_query(
            """
            SELECT user_id, entry_date
            FROM weight_entries
            WHERE entry_date >= %s
            """,
            (start,),
            fetch_all=True,
        )

        by_week = {}
        users_set = set()

        for r in entries or []:
            user_id = r.get('user_id')
            dt = r.get('entry_date')
            if user_id is not None:
                users_set.add(int(user_id))
            if not dt:
                continue
            try:
                iso_year, iso_week, _ = dt.isocalendar()
                key = f"{iso_year}-W{int(iso_week):02d}"
            except Exception:
                key = str(dt)
            bucket = by_week.setdefault(key, {'week': key, 'entries': 0, 'users': set()})
            bucket['entries'] += 1
            if user_id is not None:
                bucket['users'].add(int(user_id))

        week_series = []
        for key in sorted(by_week.keys()):
            b = by_week[key]
            week_series.append({'week': b['week'], 'entries': int(b['entries']), 'users': int(len(b['users']))})

        total_entries = sum(b['entries'] for b in by_week.values())
        distinct_users = len(users_set)
        weeks = max(1, int((days + 6) / 7))
        avg_checkins = 0.0
        if distinct_users > 0:
            avg_checkins = float(total_entries) / float(distinct_users * weeks)

        return jsonify(
            {
                'range_days': days,
                'active_goals': int(active_goals.get('count') or 0),
                'avg_checkins_per_user_per_week': round(avg_checkins, 3),
                'weekly': week_series,
            }
        ), 200

    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': f'Failed to fetch analytics: {str(e)}'}), 500

# Doctor Profile Endpoints
@auth_bp.route('/doctor/profile', methods=['GET'])
@jwt_required_custom
def get_doctor_profile():
    """Get doctor profile"""  
    try:
        doctor_id = get_jwt_identity()
        
        # Fetch doctor profile
        query = """
            SELECT id, name, email, phone, specialty, qualification, 
                   experience, rating, consultation_fee, bio
            FROM doctors 
            WHERE id = %s
        """
        doctor = execute_query(query, (doctor_id,), fetch_one=True)
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        return jsonify({
            'doctor': doctor
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500

@auth_bp.route('/doctor/profile', methods=['PUT'])
@jwt_required_custom
def update_doctor_profile():
    """Update doctor profile"""  
    try:
        doctor_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if doctor exists
        check_query = "SELECT id FROM doctors WHERE id = %s"
        doctor = execute_query(check_query, (doctor_id,), fetch_one=True)
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        
        # Editable fields (excluding email and rating)
        editable_fields = ['name', 'phone', 'specialty', 'qualification', 'experience', 'consultation_fee', 'bio']
        
        for field in editable_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # Add doctor_id to values for WHERE clause
        values.append(doctor_id)
        
        # Update query
        update_query = f"""
            UPDATE doctors 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        
        execute_query(update_query, tuple(values), commit=True)
        
        # Fetch updated profile
        fetch_query = """
            SELECT id, name, email, phone, specialty, qualification, 
                   experience, rating, consultation_fee, bio
            FROM doctors 
            WHERE id = %s
        """
        updated_doctor = execute_query(fetch_query, (doctor_id,), fetch_one=True)
        
        return jsonify({
            'message': 'Profile updated successfully',
            'doctor': updated_doctor
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

