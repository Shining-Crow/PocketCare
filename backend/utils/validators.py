import re
from email_validator import validate_email, EmailNotValidError

def validate_email_format(email):
    """Validate email format"""
    try:
        validate_email(email)
        return True, None
    except EmailNotValidError as e:
        return False, str(e)

def validate_password_strength(password):
    """
    Validate password strength
    Requirements:
    - At least 8 characters
    - Contains uppercase and lowercase
    - Contains at least one number
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    return True, None

def validate_phone_number(phone):
    """Validate phone number format"""
    # Basic validation for 10 digits
    pattern = r'^\+?1?\d{10,15}$'
    if re.match(pattern, phone.replace(' ', '').replace('-', '')):
        return True, None
    return False, "Invalid phone number format"

def validate_required_fields(data, required_fields):
    """Check if all required fields are present"""
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    return True, None
