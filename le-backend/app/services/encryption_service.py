"""
File encryption service for sensitive documents.
Provides AES-256 encryption with secure key management and metadata handling.
"""

import os
import base64
import hashlib
import json
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import logging

from app.core.config import settings
from app.core.exceptions import SecurityError

logger = logging.getLogger(__name__)

class EncryptionMetadata:
    """Metadata for encrypted files"""
    
    def __init__(
        self,
        algorithm: str,
        key_id: str,
        iv: str = None,
        salt: str = None,
        encrypted_at: datetime = None,
        file_hash: str = None,
        original_size: int = None
    ):
        self.algorithm = algorithm
        self.key_id = key_id
        self.iv = iv
        self.salt = salt
        self.encrypted_at = encrypted_at or datetime.now(timezone.utc)
        self.file_hash = file_hash
        self.original_size = original_size
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "algorithm": self.algorithm,
            "key_id": self.key_id,
            "iv": self.iv,
            "salt": self.salt,
            "encrypted_at": self.encrypted_at.isoformat(),
            "file_hash": self.file_hash,
            "original_size": self.original_size
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EncryptionMetadata':
        """Create from dictionary"""
        return cls(
            algorithm=data["algorithm"],
            key_id=data["key_id"],
            iv=data.get("iv"),
            salt=data.get("salt"),
            encrypted_at=datetime.fromisoformat(data["encrypted_at"]),
            file_hash=data.get("file_hash"),
            original_size=data.get("original_size")
        )

class EncryptionResult:
    """Result of encryption operation"""
    
    def __init__(
        self,
        encrypted_data: bytes,
        metadata: EncryptionMetadata,
        success: bool = True,
        error_message: str = None
    ):
        self.encrypted_data = encrypted_data
        self.metadata = metadata
        self.success = success
        self.error_message = error_message

class DecryptionResult:
    """Result of decryption operation"""
    
    def __init__(
        self,
        decrypted_data: bytes,
        metadata: EncryptionMetadata,
        success: bool = True,
        error_message: str = None
    ):
        self.decrypted_data = decrypted_data
        self.metadata = metadata
        self.success = success
        self.error_message = error_message

class FileEncryptionService:
    """
    Service for encrypting and decrypting sensitive files
    """
    
    def __init__(self):
        self.master_key = self._get_master_key()
        self.key_cache = {}  # Cache for derived keys
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize encryption service"""
        try:
            # Verify master key is available
            if not self.master_key:
                raise SecurityError("Master encryption key not available")
            
            logger.info("File encryption service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize encryption service: {e}")
            raise
    
    def _get_master_key(self) -> bytes:
        """Get or generate master encryption key"""
        try:
            # Try to get key from environment
            key_b64 = getattr(settings, 'ENCRYPTION_MASTER_KEY', None)
            if key_b64:
                return base64.b64decode(key_b64)
            
            # Try to get key from file
            key_file = getattr(settings, 'ENCRYPTION_KEY_FILE', None)
            if key_file and os.path.exists(key_file):
                with open(key_file, 'rb') as f:
                    return f.read()
            
            # Generate new key (for development/testing only)
            logger.warning("Generating new master key for development/testing")
            key = Fernet.generate_key()
            
            # Save to file for persistence in development
            try:
                key_file = 'encryption_master.key'
                with open(key_file, 'wb') as f:
                    f.write(key)
                logger.info(f"Master key saved to {key_file}")
            except Exception as e:
                logger.warning(f"Could not save master key to file: {e}")
            
            return key
            
        except Exception as e:
            logger.error(f"Failed to get master key: {e}")
            raise
    
    def _derive_key(self, key_id: str, salt: bytes = None) -> Tuple[bytes, bytes]:
        """Derive encryption key from master key"""
        if salt is None:
            salt = os.urandom(16)
        
        # Use PBKDF2 to derive key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256-bit key
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        # Combine master key with key_id for derivation
        key_material = self.master_key + key_id.encode('utf-8')
        derived_key = kdf.derive(key_material)
        
        return derived_key, salt
    
    def _should_encrypt_file(self, filename: str, content_type: str = None, file_size: int = 0) -> bool:
        """Determine if file should be encrypted based on sensitivity"""
        
        # Always encrypt files with sensitive keywords in name
        sensitive_keywords = [
            'id', 'passport', 'license', 'certificate', 'contract',
            'agreement', 'financial', 'bank', 'income', 'salary',
            'tax', 'credit', 'loan', 'collateral', 'guarantor'
        ]
        
        filename_lower = filename.lower()
        for keyword in sensitive_keywords:
            if keyword in filename_lower:
                return True
        
        # Encrypt based on file type
        sensitive_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
        
        if content_type in sensitive_types:
            return True
        
        # Encrypt large files (potential sensitive documents)
        if file_size > 1024 * 1024:  # 1MB
            return True
        
        return False
    
    async def encrypt_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str = None,
        key_id: str = None,
        force_encrypt: bool = False
    ) -> EncryptionResult:
        """
        Encrypt file content if it contains sensitive data
        """
        try:
            # Check if file should be encrypted
            if not force_encrypt and not self._should_encrypt_file(filename, content_type, len(file_content)):
                # Return original data with no encryption metadata
                return EncryptionResult(
                    encrypted_data=file_content,
                    metadata=EncryptionMetadata(
                        algorithm="none",
                        key_id="none",
                        file_hash=hashlib.sha256(file_content).hexdigest(),
                        original_size=len(file_content)
                    )
                )
            
            # Generate key ID if not provided
            if not key_id:
                key_id = f"file_{hashlib.sha256(filename.encode()).hexdigest()[:16]}"
            
            # Derive encryption key
            derived_key, salt = self._derive_key(key_id)
            
            # Generate IV for AES
            iv = os.urandom(16)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(derived_key),
                modes.CBC(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            # Pad data to block size
            padded_data = self._pad_data(file_content)
            
            # Encrypt
            encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
            
            # Create metadata
            metadata = EncryptionMetadata(
                algorithm="AES-256-CBC",
                key_id=key_id,
                iv=base64.b64encode(iv).decode('utf-8'),
                salt=base64.b64encode(salt).decode('utf-8'),
                file_hash=hashlib.sha256(file_content).hexdigest(),
                original_size=len(file_content)
            )
            
            logger.info(f"File encrypted: {filename} (key_id: {key_id})")
            
            return EncryptionResult(
                encrypted_data=encrypted_data,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Encryption failed for {filename}: {e}")
            return EncryptionResult(
                encrypted_data=b'',
                metadata=EncryptionMetadata(algorithm="error", key_id="error"),
                success=False,
                error_message=str(e)
            )
    
    async def decrypt_file(
        self,
        encrypted_data: bytes,
        metadata: EncryptionMetadata
    ) -> DecryptionResult:
        """
        Decrypt file content using stored metadata
        """
        try:
            # Handle unencrypted files
            if metadata.algorithm == "none":
                return DecryptionResult(
                    decrypted_data=encrypted_data,
                    metadata=metadata
                )
            
            # Handle encryption errors
            if metadata.algorithm == "error":
                return DecryptionResult(
                    decrypted_data=b'',
                    metadata=metadata,
                    success=False,
                    error_message="File was not properly encrypted"
                )
            
            # Decrypt AES-256-CBC
            if metadata.algorithm == "AES-256-CBC":
                return await self._decrypt_aes_cbc(encrypted_data, metadata)
            
            raise SecurityError(f"Unsupported encryption algorithm: {metadata.algorithm}")
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return DecryptionResult(
                decrypted_data=b'',
                metadata=metadata,
                success=False,
                error_message=str(e)
            )
    
    async def _decrypt_aes_cbc(
        self,
        encrypted_data: bytes,
        metadata: EncryptionMetadata
    ) -> DecryptionResult:
        """Decrypt AES-256-CBC encrypted data"""
        
        # Decode IV and salt
        iv = base64.b64decode(metadata.iv)
        salt = base64.b64decode(metadata.salt)
        
        # Derive the same key
        derived_key, _ = self._derive_key(metadata.key_id, salt)
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(derived_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # Decrypt
        padded_data = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # Remove padding
        decrypted_data = self._unpad_data(padded_data)
        
        # Verify integrity if hash is available
        if metadata.file_hash:
            actual_hash = hashlib.sha256(decrypted_data).hexdigest()
            if actual_hash != metadata.file_hash:
                raise SecurityError("File integrity check failed")
        
        return DecryptionResult(
            decrypted_data=decrypted_data,
            metadata=metadata
        )
    
    def _pad_data(self, data: bytes) -> bytes:
        """Add PKCS7 padding to data"""
        block_size = 16  # AES block size
        padding_length = block_size - (len(data) % block_size)
        padding = bytes([padding_length] * padding_length)
        return data + padding
    
    def _unpad_data(self, padded_data: bytes) -> bytes:
        """Remove PKCS7 padding from data"""
        if not padded_data:
            return padded_data
        
        padding_length = padded_data[-1]
        
        # Validate padding
        if padding_length > 16 or padding_length == 0:
            raise SecurityError("Invalid padding")
        
        for i in range(padding_length):
            if padded_data[-(i + 1)] != padding_length:
                raise SecurityError("Invalid padding")
        
        return padded_data[:-padding_length]
    
    async def rotate_encryption_key(self, old_key_id: str, new_key_id: str = None) -> str:
        """
        Rotate encryption key for enhanced security
        """
        if not new_key_id:
            new_key_id = f"rotated_{old_key_id}_{int(datetime.now().timestamp())}"
        
        # In a full implementation, this would:
        # 1. Find all files encrypted with old_key_id
        # 2. Decrypt with old key
        # 3. Re-encrypt with new key
        # 4. Update metadata
        
        logger.info(f"Key rotation initiated: {old_key_id} -> {new_key_id}")
        return new_key_id
    
    def get_encryption_status(self, metadata: EncryptionMetadata) -> Dict[str, Any]:
        """Get encryption status information"""
        return {
            "is_encrypted": metadata.algorithm != "none",
            "algorithm": metadata.algorithm,
            "key_id": metadata.key_id,
            "encrypted_at": metadata.encrypted_at.isoformat() if metadata.encrypted_at else None,
            "original_size": metadata.original_size,
            "has_integrity_check": bool(metadata.file_hash)
        }

# Global encryption service instance
encryption_service = FileEncryptionService()

async def encrypt_sensitive_file(
    file_content: bytes,
    filename: str,
    content_type: str = None,
    force_encrypt: bool = False
) -> EncryptionResult:
    """
    Convenience function to encrypt sensitive files
    """
    return await encryption_service.encrypt_file(
        file_content, filename, content_type, force_encrypt=force_encrypt
    )

async def decrypt_file_content(
    encrypted_data: bytes,
    metadata: EncryptionMetadata
) -> DecryptionResult:
    """
    Convenience function to decrypt file content
    """
    return await encryption_service.decrypt_file(encrypted_data, metadata)