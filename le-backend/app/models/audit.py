from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy.sql import func

class AuditEventType(str, Enum):
    """Types of audit events"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    VALIDATION = "validation"
    ACCESS = "access"
    ERROR = "error"
    SECURITY = "security"

class AuditLog(Base):
    """Audit log model for tracking system events and user actions"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Event information
    event_type = Column(SQLEnum(AuditEventType), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    
    # Entity information
    entity_type = Column(String(50), nullable=True, index=True)  # e.g., 'user', 'customer_application'
    entity_id = Column(String(50), nullable=True, index=True)    # ID of the affected entity
    
    # User information
    user_id = Column(String(50), nullable=True, index=True)      # User who performed the action
    
    # Request information
    ip_address = Column(String(45), nullable=True, index=True)   # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)                     # Browser/client info
    
    # Event details
    details = Column(JSON, nullable=True)                        # Additional event data
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, event_type={self.event_type}, action={self.action}, timestamp={self.timestamp})>"
    
    def to_dict(self):
        """Convert audit log to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "event_type": self.event_type.value if self.event_type else None,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }