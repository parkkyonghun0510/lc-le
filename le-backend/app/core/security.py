import hashlib
import secrets
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

# Create separate contexts for different schemes
# This allows us to handle both old bcrypt and new pbkdf2_sha256 hashes
try:
    # Context for bcrypt (for verifying old hashes)
    bcrypt_context = CryptContext(
        schemes=["bcrypt"], 
        deprecated="auto",
        bcrypt__default_rounds=12,
        bcrypt__min_rounds=10,
        bcrypt__max_rounds=15
    )
    # Test bcrypt
    bcrypt_context.hash("test")
    bcrypt_available = True
except Exception:
    bcrypt_available = False

# Context for pbkdf2_sha256 (for new hashes)
pbkdf2_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
    pbkdf2_sha256__default_rounds=100000,
    pbkdf2_sha256__min_rounds=50000,
    pbkdf2_sha256__max_rounds=200000
)

# Primary context for new password hashing (uses pbkdf2_sha256)
pwd_context = pbkdf2_context

def _truncate_password(password: str, max_bytes: int = 72) -> str:
    """Safely truncate password to max_bytes while preserving UTF-8 character boundaries."""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) <= max_bytes:
        return password
    
    # Truncate to max_bytes
    truncated_bytes = password_bytes[:max_bytes]
    
    # Find the last complete UTF-8 character
    while truncated_bytes and (truncated_bytes[-1] & 0x80) and not (truncated_bytes[-1] & 0x40):
        truncated_bytes = truncated_bytes[:-1]
    
    return truncated_bytes.decode('utf-8', errors='ignore')

def get_password_hash(password: str) -> str:
    """Hash a password for storing with proper length handling."""
    # Truncate password if it's too long for bcrypt (72 bytes)
    if len(password.encode('utf-8')) > 72:
        password = _truncate_password(password, 72)
    
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash with backward compatibility."""
    # Truncate password if it's too long for bcrypt (72 bytes)
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = _truncate_password(plain_password, 72)
    
    # First try with the primary context (pbkdf2_sha256)
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        # If the hash is not recognized by pbkdf2, try bcrypt (for old hashes)
        if bcrypt_available:
            try:
                return bcrypt_context.verify(plain_password, hashed_password)
            except Exception:
                pass
        # If bcrypt is not available, try direct bcrypt verification
        if hashed_password.startswith('$2b$') or hashed_password.startswith('$2a$'):
            try:
                import bcrypt
                # Direct bcrypt verification for old hashes
                password_bytes = plain_password.encode('utf-8')
                if len(password_bytes) > 72:
                    password_bytes = password_bytes[:72]
                return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
            except Exception:
                pass
        return False
    except Exception:
        return False