"""
Audit logging models for comprehensive system tracking.
"""

from sqlalchemy import Column, String, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid
from enum import Enum

class AuditEventType(str, Enum):
    """Types of events that can be audited"""
    USER_ACTION = "user_action"
    SYSTEM_EVENT = "system_event"
    SECURITY = "security"
    ACCESS_CONTROL = "access_control"
    FILE_OPERATION = "file_operation"
    DATA_CHANGE = "data_change"
    VALIDATION = "validation"
    ERROR = "error"

class AuditLog(Base):
    """
    Comprehensive audit log for all system activities
    """
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event classification
    event_type = Column(SQLEnum(AuditEventType), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # user, file, application, etc.
    entity_id = Column(String(255), nullable=True, index=True)   # ID of the affected entity
    
    # User and session information
    user_id = Column(String(255), nullable=True, index=True)
    session_id = Column(String(255), nullable=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)  # create, update, delete, access, etc.
    details = Column(JSON, nullable=True)  # Detailed information about the action
    
    # Request context
    ip_address = Column(String(45), nullable=True, index=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(255), nullable=True)  # For correlating related events
    
    # Outcome
    success = Column(String(10), nullable=False, default='true')  # true, false, partial
    error_message = Column(Text, nullable=True)
    
    # Timing
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    duration_ms = Column(String(20), nullable=True)  # Duration in milliseconds
    
    # Additional metadata
    extra_data = Column(JSON, nullable=True)  # Additional context-specific data
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, event_type={self.event_type}, action={self.action}, timestamp={self.timestamp})>"