"""
Security utilities for enhanced password validation and security functions.
"""
import re
from typing import List, Optional
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def validate_password_strength(password: str) -> List[str]:
    """
    Validate password strength based on security requirements.
    Returns list of validation errors, empty if password is valid.
    """
    errors = []
    
    # Check minimum length
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters long")
    
    # Check for uppercase letters
    if settings.REQUIRE_PASSWORD_UPPERCASE and not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    # Check for numbers
    if settings.REQUIRE_PASSWORD_NUMBERS and not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    # Check for special characters
    if settings.REQUIRE_PASSWORD_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("Password must contain at least one special character")
    
    # Check for common weak patterns
    common_patterns = [
        r'123456',
        r'password',
        r'qwerty',
        r'abc123',
        r'admin'
    ]
    
    for pattern in common_patterns:
        if re.search(pattern, password.lower()):
            errors.append("Password contains common weak patterns")
            break
    
    return errors

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and other security issues.
    """
    # Remove any path separators
    filename = filename.replace('/', '').replace('\\', '')
    
    # Remove or replace dangerous characters
    dangerous_chars = ['..', '<', '>', ':', '"', '|', '?', '*']
    for char in dangerous_chars:
        filename = filename.replace(char, '_')
    
    # Limit filename length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:200] + ('.' + ext if ext else '')
    
    return filename

def validate_file_type(content_type: str, allowed_types: Optional[List[str]] = None) -> bool:
    """
    Validate file content type against allowed types.
    """
    if allowed_types is None:
        allowed_types = settings.ALLOWED_FILE_TYPES
    
    return content_type.lower() in [t.lower() for t in allowed_types]

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    import secrets
    return secrets.token_urlsafe(length)

def is_safe_redirect_url(url: str, allowed_hosts: List[str]) -> bool:
    """
    Check if a redirect URL is safe (prevents open redirect vulnerabilities).
    """
    if not url:
        return False
    
    # Check if it's a relative URL (safe)
    if url.startswith('/') and not url.startswith('//'):
        return True
    
    # Check if it's an absolute URL to an allowed host
    from urllib.parse import urlparse
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower() in [host.lower() for host in allowed_hosts]
    except Exception:
        return False

class SecurityHeaders:
    """Security headers for HTTP responses."""
    
    @staticmethod
    def get_security_headers() -> dict:
        """Get recommended security headers."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none';"
            )
        }