"""
Granular file access control service.
Provides role-based and attribute-based access control for file operations.
"""

from typing import Dict, Any, List, Optional, Set, Tuple
from enum import Enum
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
import logging

from app.models import User, File, Folder, CustomerApplication
from app.core.exceptions import SecurityError

logger = logging.getLogger(__name__)

class FilePermission(str, Enum):
    """File operation permissions"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    DOWNLOAD = "download"
    SHARE = "share"
    ENCRYPT = "encrypt"
    DECRYPT = "decrypt"
    MOVE = "move"
    RENAME = "rename"
    VIEW_METADATA = "view_file_metadata"
    MODIFY_METADATA = "modify_file_metadata"

class AccessDecision(str, Enum):
    """Access control decision"""
    ALLOW = "allow"
    DENY = "deny"
    CONDITIONAL = "conditional"

class AccessContext:
    """Context information for access control decisions"""
    
    def __init__(
        self,
        user: User,
        file: File,
        permission: FilePermission,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        time_of_access: Optional[datetime] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ):
        self.user = user
        self.file = file
        self.permission = permission
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.time_of_access = time_of_access or datetime.now(timezone.utc)
        self.additional_context = additional_context or {}

class AccessResult:
    """Result of access control check"""
    
    def __init__(
        self,
        decision: AccessDecision,
        reason: str,
        conditions: Optional[List[str]] = None,
        result_metadata: Optional[Dict[str, Any]] = None
    ):
        self.decision = decision
        self.reason = reason
        self.conditions = conditions or []
        self.access_metadata = result_metadata or {}
        self.checked_at = datetime.now(timezone.utc)
    
    @property
    def is_allowed(self) -> bool:
        return self.decision == AccessDecision.ALLOW
    
    @property
    def is_denied(self) -> bool:
        return self.decision == AccessDecision.DENY
    
    @property
    def is_conditional(self) -> bool:
        return self.decision == AccessDecision.CONDITIONAL

class FileAccessControlService:
    """
    Service for granular file access control
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.role_permissions = self._initialize_role_permissions()
        self.access_policies = self._initialize_access_policies()
    
    def _initialize_role_permissions(self) -> Dict[str, Set[FilePermission]]:
        """Initialize default role-based permissions"""
        return {
            "admin": {
                FilePermission.READ,
                FilePermission.WRITE,
                FilePermission.DELETE,
                FilePermission.DOWNLOAD,
                FilePermission.SHARE,
                FilePermission.ENCRYPT,
                FilePermission.DECRYPT,
                FilePermission.MOVE,
                FilePermission.RENAME,
                FilePermission.VIEW_METADATA,
                FilePermission.MODIFY_METADATA
            },
            "manager": {
                FilePermission.READ,
                FilePermission.WRITE,
                FilePermission.DOWNLOAD,
                FilePermission.SHARE,
                FilePermission.MOVE,
                FilePermission.RENAME,
                FilePermission.VIEW_METADATA,
                FilePermission.MODIFY_METADATA
            },
            "officer": {
                FilePermission.READ,
                FilePermission.WRITE,
                FilePermission.DOWNLOAD,
                FilePermission.VIEW_METADATA
            },
            "teller": {
                FilePermission.READ,
                FilePermission.DOWNLOAD,
                FilePermission.VIEW_METADATA
            },
            "user": {
                FilePermission.READ,
                FilePermission.VIEW_METADATA
            }
        }
    
    def _initialize_access_policies(self) -> List[Dict[str, Any]]:
        """Initialize access control policies"""
        return [
            {
                "name": "owner_full_access",
                "description": "File owner has full access to their files",
                "condition": lambda ctx: ctx.file.uploaded_by == ctx.user.id,
                "permissions": list(FilePermission),
                "priority": 100
            },
            {
                "name": "application_access",
                "description": "Users can access files in their applications",
                "condition": self._check_application_access,
                "permissions": [
                    FilePermission.READ,
                    FilePermission.DOWNLOAD,
                    FilePermission.VIEW_METADATA
                ],
                "priority": 80
            },
            {
                "name": "department_access",
                "description": "Department members can access department files",
                "condition": self._check_department_access,
                "permissions": [
                    FilePermission.READ,
                    FilePermission.VIEW_METADATA
                ],
                "priority": 60
            },
            {
                "name": "branch_access",
                "description": "Branch members can access branch files",
                "condition": self._check_branch_access,
                "permissions": [
                    FilePermission.READ,
                    FilePermission.VIEW_METADATA
                ],
                "priority": 40
            },
            {
                "name": "sensitive_file_restriction",
                "description": "Restrict access to sensitive files",
                "condition": self._check_sensitive_file,
                "permissions": [],  # Deny by default
                "priority": 200,
                "is_restrictive": True
            },
            {
                "name": "time_based_access",
                "description": "Restrict access based on time",
                "condition": self._check_time_based_access,
                "permissions": [],
                "priority": 150,
                "is_restrictive": True
            }
        ]
    
    async def check_access(
        self,
        user: User,
        file: File,
        permission: FilePermission,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> AccessResult:
        """
        Check if user has permission to perform operation on file
        """
        
        context = AccessContext(
            user=user,
            file=file,
            permission=permission,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_context=additional_context
        )
        
        try:
            # 1. Check basic role permissions
            role_result = await self._check_role_permissions(context)
            if role_result.is_denied:
                return role_result
            
            # 2. Apply access policies
            policy_result = await self._apply_access_policies(context)
            if policy_result.is_denied:
                return policy_result
            
            # 3. Check file-specific restrictions
            restriction_result = await self._check_file_restrictions(context)
            if restriction_result.is_denied:
                return restriction_result
            
            # 4. Apply conditional access rules
            conditional_result = await self._apply_conditional_rules(context)
            
            # Combine results
            final_decision = self._combine_access_results([
                role_result,
                policy_result,
                restriction_result,
                conditional_result
            ])
            
            logger.info(
                f"Access check: user={user.id}, file={file.id}, "
                f"permission={permission.value}, decision={final_decision.decision.value}"
            )
            
            return final_decision
            
        except Exception as e:
            logger.error(f"Access control check failed: {e}")
            return AccessResult(
                decision=AccessDecision.DENY,
                reason=f"Access control error: {str(e)}"
            )
    
    async def check_bulk_access(
        self,
        user: User,
        file_ids: List[UUID],
        permission: FilePermission,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[UUID, AccessResult]:
        """
        Check access for multiple files at once
        """
        
        results = {}
        
        # Fetch all files at once
        query = select(File).where(File.id.in_(file_ids))
        result = await self.db.execute(query)
        files = {file.id: file for file in result.scalars().all()}
        
        # Check access for each file
        for file_id in file_ids:
            file = files.get(file_id)
            if not file:
                results[file_id] = AccessResult(
                    decision=AccessDecision.DENY,
                    reason="File not found"
                )
                continue
            
            access_result = await self.check_access(
                user, file, permission, ip_address, user_agent
            )
            results[file_id] = access_result
        
        return results
    
    async def get_accessible_files(
        self,
        user: User,
        permission: FilePermission,
        application_id: Optional[UUID] = None,
        folder_id: Optional[UUID] = None,
        limit: int = 100
    ) -> List[File]:
        """
        Get list of files user can access with given permission
        """
        
        query = select(File)
        
        # Apply filters
        if application_id:
            query = query.where(File.application_id == application_id)
        if folder_id:
            query = query.where(File.folder_id == folder_id)
        
        query = query.limit(limit)
        result = await self.db.execute(query)
        all_files = result.scalars().all()
        
        # Filter by access control
        accessible_files = []
        for file in all_files:
            access_result = await self.check_access(user, file, permission)
            if access_result.is_allowed:
                accessible_files.append(file)
        
        return accessible_files
    
    async def _check_role_permissions(self, context: AccessContext) -> AccessResult:
        """Check role-based permissions"""
        
        user_role = context.user.role.lower()
        role_permissions = self.role_permissions.get(user_role, set())
        
        if context.permission in role_permissions:
            return AccessResult(
                decision=AccessDecision.ALLOW,
                reason=f"Role '{user_role}' has '{context.permission.value}' permission"
            )
        
        return AccessResult(
            decision=AccessDecision.DENY,
            reason=f"Role '{user_role}' lacks '{context.permission.value}' permission"
        )
    
    async def _apply_access_policies(self, context: AccessContext) -> AccessResult:
        """Apply access control policies"""
        
        # Sort policies by priority (higher priority first)
        sorted_policies = sorted(
            self.access_policies,
            key=lambda p: p.get("priority", 0),
            reverse=True
        )
        
        applicable_policies = []
        
        for policy in sorted_policies:
            try:
                condition = policy["condition"]
                if callable(condition):
                    if await condition(context) if hasattr(condition, '__call__') else condition(context):
                        applicable_policies.append(policy)
                elif condition:
                    applicable_policies.append(policy)
            except Exception as e:
                logger.warning(f"Policy condition check failed for '{policy['name']}': {e}")
        
        # Apply policies
        for policy in applicable_policies:
            is_restrictive = policy.get("is_restrictive", False)
            policy_permissions = policy.get("permissions", [])
            
            if is_restrictive:
                # Restrictive policy - deny if permission not in allowed list
                if context.permission.value not in policy_permissions:
                    return AccessResult(
                        decision=AccessDecision.DENY,
                        reason=f"Restrictive policy '{policy['name']}' denies access"
                    )
            else:
                # Permissive policy - allow if permission in allowed list
                if context.permission.value in policy_permissions:
                    return AccessResult(
                        decision=AccessDecision.ALLOW,
                        reason=f"Policy '{policy['name']}' grants access"
                    )
        
        return AccessResult(
            decision=AccessDecision.ALLOW,
            reason="No applicable policies found"
        )
    
    async def _check_file_restrictions(self, context: AccessContext) -> AccessResult:
        """Check file-specific restrictions"""
        
        file = context.file
        
        # Check if file is in a restricted folder
        if file.folder_id:
            folder_query = select(Folder).where(Folder.id == file.folder_id)
            folder_result = await self.db.execute(folder_query)
            folder = folder_result.scalar_one_or_none()
            
            if folder and "restricted" in folder.name.lower():
                if context.user.role not in ["admin", "manager"]:
                    return AccessResult(
                        decision=AccessDecision.DENY,
                        reason="File is in restricted folder"
                    )
        
        # Check file size restrictions for certain operations
        if context.permission == FilePermission.DOWNLOAD:
            max_download_size = 50 * 1024 * 1024  # 50MB
            if file.file_size > max_download_size and context.user.role not in ["admin", "manager"]:
                return AccessResult(
                    decision=AccessDecision.CONDITIONAL,
                    reason="Large file download requires approval",
                    conditions=["manager_approval_required"]
                )
        
        return AccessResult(
            decision=AccessDecision.ALLOW,
            reason="No file restrictions apply"
        )
    
    async def _apply_conditional_rules(self, context: AccessContext) -> AccessResult:
        """Apply conditional access rules"""
        
        conditions = []
        
        # Time-based restrictions
        current_hour = context.time_of_access.hour
        if current_hour < 6 or current_hour > 22:  # Outside business hours
            if context.permission in [FilePermission.DELETE, FilePermission.MOVE]:
                conditions.append("business_hours_only")
        
        # IP-based restrictions
        if context.ip_address:
            # In production, this would check against allowed IP ranges
            suspicious_ips = ["127.0.0.1"]  # Example
            if context.ip_address in suspicious_ips:
                conditions.append("ip_verification_required")
        
        # Sensitive operation restrictions
        if context.permission in [FilePermission.DELETE, FilePermission.ENCRYPT, FilePermission.DECRYPT]:
            if context.user.role not in ["admin", "manager"]:
                conditions.append("two_factor_authentication")
        
        if conditions:
            return AccessResult(
                decision=AccessDecision.CONDITIONAL,
                reason="Conditional access rules apply",
                conditions=conditions
            )
        
        return AccessResult(
            decision=AccessDecision.ALLOW,
            reason="No conditional rules apply"
        )
    
    def _combine_access_results(self, results: List[AccessResult]) -> AccessResult:
        """Combine multiple access results into final decision"""
        
        # If any result is DENY, final decision is DENY
        for result in results:
            if result.is_denied:
                return result
        
        # Collect all conditions
        all_conditions = []
        reasons = []
        
        for result in results:
            if result.is_conditional:
                all_conditions.extend(result.conditions)
            reasons.append(result.reason)
        
        # If there are conditions, return conditional access
        if all_conditions:
            return AccessResult(
                decision=AccessDecision.CONDITIONAL,
                reason="; ".join(reasons),
                conditions=list(set(all_conditions))  # Remove duplicates
            )
        
        # Otherwise, allow access
        return AccessResult(
            decision=AccessDecision.ALLOW,
            reason="; ".join(reasons)
        )
    
    async def _check_application_access(self, context: AccessContext) -> bool:
        """Check if user has access to file's application"""
        
        if not context.file.application_id:
            return False
        
        app_query = select(CustomerApplication).where(
            CustomerApplication.id == context.file.application_id
        )
        app_result = await self.db.execute(app_query)
        application = app_result.scalar_one_or_none()
        
        if not application:
            return False
        
        # User owns the application
        if application.user_id == context.user.id:
            return True
        
        # User is assigned to review the application
        if application.assigned_reviewer == context.user.id:
            return True
        
        # User is in the workflow chain
        workflow_users = [
            application.po_created_by,
            application.user_completed_by,
            application.teller_processed_by,
            application.manager_reviewed_by
        ]
        
        if context.user.id in workflow_users:
            return True
        
        return False
    
    async def _check_department_access(self, context: AccessContext) -> bool:
        """Check if user has department-level access to file"""
        
        if not context.file.application_id:
            return False
        
        # Get file owner's department
        owner_query = select(User).where(User.id == context.file.uploaded_by)
        owner_result = await self.db.execute(owner_query)
        file_owner = owner_result.scalar_one_or_none()
        
        if not file_owner or not file_owner.department_id:
            return False
        
        # Check if current user is in same department
        return context.user.department_id == file_owner.department_id
    
    async def _check_branch_access(self, context: AccessContext) -> bool:
        """Check if user has branch-level access to file"""
        
        if not context.file.application_id:
            return False
        
        # Get file owner's branch
        owner_query = select(User).where(User.id == context.file.uploaded_by)
        owner_result = await self.db.execute(owner_query)
        file_owner = owner_result.scalar_one_or_none()
        
        if not file_owner or not file_owner.branch_id:
            return False
        
        # Check if current user is in same branch
        return context.user.branch_id == file_owner.branch_id
    
    async def _check_sensitive_file(self, context: AccessContext) -> bool:
        """Check if file is marked as sensitive"""
        
        # Check filename for sensitive keywords
        sensitive_keywords = [
            'confidential', 'secret', 'private', 'restricted',
            'ssn', 'tax', 'financial', 'bank_statement'
        ]
        
        filename_lower = context.file.filename.lower()
        for keyword in sensitive_keywords:
            if keyword in filename_lower:
                return True
        
        return False
    
    async def _check_time_based_access(self, context: AccessContext) -> bool:
        """Check time-based access restrictions"""
        
        # Example: Restrict sensitive operations outside business hours
        current_hour = context.time_of_access.hour
        is_business_hours = 6 <= current_hour <= 22
        
        sensitive_operations = [
            FilePermission.DELETE,
            FilePermission.ENCRYPT,
            FilePermission.DECRYPT,
            FilePermission.MOVE
        ]
        
        if context.permission in sensitive_operations and not is_business_hours:
            return True  # Restriction applies
        
        return False

async def get_file_access_control_service(db: AsyncSession) -> FileAccessControlService:
    """Get file access control service instance"""
    return FileAccessControlService(db)