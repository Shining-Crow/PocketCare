import bcrypt
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, hashed_password):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def jwt_required_custom(fn):
    """Custom JWT required decorator with error handling"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Only treat JWT verification errors as 401.
        # Do NOT swallow application errors (e.g., database/table missing), otherwise
        # real server bugs look like auth failures and cause redirect loops.
        try:
            verify_jwt_in_request()
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token', 'message': str(e)}), 401

        return fn(*args, **kwargs)
    return wrapper
