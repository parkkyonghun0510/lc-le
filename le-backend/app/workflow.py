from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, validator
from datetime import datetime

class WorkflowStatus(str, Enum):
    """Enum for role-based workflow stages"""
    PO_CREATED = "po_created"  # PO creates the application form
    USER_COMPLETED = "user_completed"  # User completes the form details
    TELLER_PROCESSING = "teller_processing"  # Teller reviews and inputs account_id
    MANAGER_REVIEW = "manager_review"  # Manager performs final approval
    APPROVED = "approved"  # Application approved
    REJECTED = "rejected"  # Application rejected

class WorkflowTransition(BaseModel):
    """Model for workflow stage transitions"""
    from_status: WorkflowStatus
    to_status: WorkflowStatus
    required_role: str
    validation_required: bool = False
    
class WorkflowValidator:
    """Validator for workflow transitions and role permissions"""
    
    # Define valid transitions between workflow stages
    VALID_TRANSITIONS: Dict[WorkflowStatus, List[WorkflowTransition]] = {
        WorkflowStatus.PO_CREATED: [
            WorkflowTransition(
                from_status=WorkflowStatus.PO_CREATED,
                to_status=WorkflowStatus.USER_COMPLETED,
                required_role="user"
            )
        ],
        WorkflowStatus.USER_COMPLETED: [
            WorkflowTransition(
                from_status=WorkflowStatus.USER_COMPLETED,
                to_status=WorkflowStatus.TELLER_PROCESSING,
                required_role="teller",
                validation_required=True
            )
        ],
        WorkflowStatus.TELLER_PROCESSING: [
            WorkflowTransition(
                from_status=WorkflowStatus.TELLER_PROCESSING,
                to_status=WorkflowStatus.MANAGER_REVIEW,
                required_role="teller"
            ),
            WorkflowTransition(
                from_status=WorkflowStatus.TELLER_PROCESSING,
                to_status=WorkflowStatus.REJECTED,
                required_role="teller"
            )
        ],
        WorkflowStatus.MANAGER_REVIEW: [
            WorkflowTransition(
                from_status=WorkflowStatus.MANAGER_REVIEW,
                to_status=WorkflowStatus.APPROVED,
                required_role="manager"
            ),
            WorkflowTransition(
                from_status=WorkflowStatus.MANAGER_REVIEW,
                to_status=WorkflowStatus.REJECTED,
                required_role="manager"
            )
        ]
    }
    
    @classmethod
    def can_transition(cls, from_status: WorkflowStatus, to_status: WorkflowStatus, user_role: str) -> bool:
        """Check if a workflow transition is valid for the given role"""
        if from_status not in cls.VALID_TRANSITIONS:
            return False
            
        valid_transitions = cls.VALID_TRANSITIONS[from_status]
        for transition in valid_transitions:
            if transition.to_status == to_status and transition.required_role == user_role:
                return True
        return False
    
    @classmethod
    def get_next_stages(cls, current_status: WorkflowStatus, user_role: str) -> List[WorkflowStatus]:
        """Get list of valid next stages for current status and user role"""
        if current_status not in cls.VALID_TRANSITIONS:
            return []
            
        valid_transitions = cls.VALID_TRANSITIONS[current_status]
        next_stages = []
        
        for transition in valid_transitions:
            if transition.required_role == user_role:
                next_stages.append(transition.to_status)
                
        return next_stages
    
    @classmethod
    def requires_validation(cls, from_status: WorkflowStatus, to_status: WorkflowStatus) -> bool:
        """Check if transition requires additional validation"""
        if from_status not in cls.VALID_TRANSITIONS:
            return False
            
        valid_transitions = cls.VALID_TRANSITIONS[from_status]
        for transition in valid_transitions:
            if transition.to_status == to_status:
                return transition.validation_required
        return False
    
    @classmethod
    def validate_transition(cls, current_status: WorkflowStatus, new_status: WorkflowStatus, 
                          user_role: str, account_id: Optional[str] = None) -> bool:
        """Validate if a workflow transition is allowed"""
        # Check if transition is valid
        if not cls.can_transition(current_status, new_status, user_role):
            raise ValueError(f"Invalid transition from {current_status} to {new_status} for role {user_role}")
        
        # Special validation for teller to manager transition
        if (current_status == WorkflowStatus.TELLER_PROCESSING and 
            new_status == WorkflowStatus.MANAGER_REVIEW and 
            not account_id):
            raise ValueError("Account ID is required when transitioning from teller processing to manager review")
        
        return True
    
    @classmethod
    def apply_transition(cls, application, new_status: WorkflowStatus, user, 
                        account_id: Optional[str] = None, notes: Optional[str] = None):
        """Apply workflow transition to application"""
        from app.models import CustomerApplication  # Import here to avoid circular imports
        
        # Update workflow status
        application.workflow_status = new_status
        
        # Update role-specific fields based on transition
        current_time = datetime.utcnow()
        
        if new_status == WorkflowStatus.USER_COMPLETED:
            application.user_completed_at = current_time
            application.user_completed_by = user.id
            
        elif new_status == WorkflowStatus.TELLER_PROCESSING:
            application.teller_processing_at = current_time
            application.teller_processing_by = user.id
            
        elif new_status == WorkflowStatus.MANAGER_REVIEW:
            application.manager_review_at = current_time
            application.manager_review_by = user.id
            # Set account_id if provided by teller
            if account_id:
                application.account_id = account_id
                application.account_id_validated = True
                application.account_id_validation_notes = notes or "Validated by teller"
                
        elif new_status in [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED]:
            application.final_decision_at = current_time
            application.final_decision_by = user.id
            if notes:
                application.rejection_reason = notes if new_status == WorkflowStatus.REJECTED else None
        
        return application
    
    @classmethod
    def can_edit_form(cls, current_status: WorkflowStatus, user_role: str) -> bool:
        """Check if user can edit the application form based on current status and role"""
        # PO can edit during creation phase
        if current_status == WorkflowStatus.PO_CREATED and user_role == "po":
            return True
        
        # User can edit during user completion phase
        if current_status == WorkflowStatus.USER_COMPLETED and user_role == "user":
            return True
            
        # Teller can edit during teller processing
        if current_status == WorkflowStatus.TELLER_PROCESSING and user_role == "teller":
            return True
            
        return False
    
    @classmethod
    def requires_account_id(cls, from_status: WorkflowStatus, to_status: WorkflowStatus) -> bool:
        """Check if transition requires account_id input"""
        return (from_status == WorkflowStatus.TELLER_PROCESSING and 
                to_status == WorkflowStatus.MANAGER_REVIEW)

class WorkflowStatusUpdate(BaseModel):
    """Schema for updating workflow status"""
    new_status: WorkflowStatus
    notes: Optional[str] = None
    account_id: Optional[str] = None  # Required when transitioning from teller_processing
    
    @validator('account_id')
    def validate_account_id_for_teller(cls, v, values):
        """Validate account_id is provided when moving from teller processing"""
        new_status = values.get('new_status')
        if new_status == WorkflowStatus.MANAGER_REVIEW and not v:
            raise ValueError('account_id is required when transitioning to manager review')
        return v

class WorkflowHistory(BaseModel):
    """Schema for workflow history tracking"""
    status: WorkflowStatus
    changed_at: datetime
    changed_by: str  # User ID
    notes: Optional[str] = None
    
class WorkflowStatusResponse(BaseModel):
    """Response schema for workflow status information"""
    current_status: WorkflowStatus
    can_edit: bool
    next_possible_stages: List[WorkflowStatus]
    requires_account_id: bool
    workflow_history: List[WorkflowHistory]