from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from app.models import User, CustomerApplication, Department, Branch
from app.core.logging import get_logger
from app.services.audit_service import AuditService, ValidationEventType
from app.core.exceptions import (
    DuplicateFieldError,
    ValidationError,
    DatabaseError,
    ErrorCode,
    ErrorSeverity
)
from datetime import datetime, timezone
import json

logger = get_logger(__name__)

# Keep backward compatibility
class DuplicateValidationError(DuplicateFieldError):
    """Legacy exception class for backward compatibility"""
    pass

class AsyncValidationService:
    """Async service for handling duplicate validation across all models"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
    
    async def log_duplicate_attempt(self, model_name: str, field: str, value: Any, 
                                   user_id: Optional[int] = None, additional_info: Dict = None,
                                   ip_address: Optional[str] = None, user_agent: Optional[str] = None):
        """Log duplicate attempt for auditing purposes"""
        try:
            # Log to audit service - temporarily disabled to prevent 500 errors
            # await self.audit_service.log_duplicate_attempt(
            #     entity_type=model_name,
            #     field_name=field,
            #     field_value=str(value),
            #     existing_entity_id=additional_info.get('existing_id') if additional_info else None,
            #     user_id=str(user_id) if user_id else None,
            #     ip_address=ip_address,
            #     user_agent=user_agent,
            #     severity="warning"
            # )
            logger.info(f"Audit service temporarily disabled - duplicate attempt: {model_name}.{field}={value}")
        except Exception as e:
            logger.error(f"Failed to log duplicate attempt to audit service: {str(e)}")
        
        # Keep existing application logging as fallback
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": model_name,
            "field": field,
            "attempted_value": str(value),
            "user_id": user_id,
            "additional_info": additional_info or {}
        }
        
        logger.warning(
            f"Duplicate attempt detected - Model: {model_name}, Field: {field}, Value: {value}",
            extra={"audit_data": log_data}
        )
    
    async def validate_user_duplicates(self, user_data: Dict[str, Any], 
                                     exclude_id: Optional[int] = None,
                                     user_id: Optional[int] = None,
                                     ip_address: Optional[str] = None,
                                     user_agent: Optional[str] = None) -> None:
        """Validate user data for duplicates"""
        
        try:
            # Check username uniqueness
            if "username" in user_data and user_data["username"]:
                query = select(User).where(User.username == user_data["username"])
                if exclude_id:
                    query = query.where(User.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_user = result.scalar_one_or_none()
                if existing_user:
                    await self.log_duplicate_attempt(
                        "User", "username", user_data["username"], 
                        user_id=user_id,
                        additional_info={"existing_id": existing_user.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="username",
                        value=user_data["username"],
                        existing_id=existing_user.id,
                        entity_type="User",
                        message=f"Username '{user_data['username']}' is already taken",
                        suggestions=["Try a different username", "Add numbers or special characters"]
                    )
            
            # Check email uniqueness
            if "email" in user_data and user_data["email"]:
                query = select(User).where(User.email == user_data["email"])
                if exclude_id:
                    query = query.where(User.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_user = result.scalar_one_or_none()
                if existing_user:
                    await self.log_duplicate_attempt(
                        "User", "email", user_data["email"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_user.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="email",
                        value=user_data["email"],
                        existing_id=existing_user.id,
                        entity_type="User",
                        message=f"Email '{user_data['email']}' is already registered",
                        suggestions=["Use a different email address", "Check if you already have an account"]
                    )
            
            # Check employee_id uniqueness (if provided)
            if "employee_id" in user_data and user_data["employee_id"]:
                query = select(User).where(User.employee_id == user_data["employee_id"])
                if exclude_id:
                    query = query.where(User.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_user = result.scalar_one_or_none()
                if existing_user:
                    await self.log_duplicate_attempt(
                        "User", "employee_id", user_data["employee_id"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_user.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="employee_id",
                        value=user_data["employee_id"],
                        existing_id=existing_user.id,
                        entity_type="User",
                        message=f"Employee ID '{user_data['employee_id']}' is already assigned",
                        suggestions=["Contact HR to verify your employee ID", "Use a different employee ID"]
                    )
        except DuplicateFieldError:
            raise
        except Exception as e:
            logger.error(f"Database error in validate_user_duplicates: {str(e)}")
            raise DatabaseError(
                message="Failed to validate user data",
                details={"error": str(e), "field": "username"}
            )
    
    async def validate_customer_application_duplicates(self, customer_data: Dict[str, Any], 
                                                     exclude_id: Optional[int] = None,
                                                     user_id: Optional[int] = None,
                                                     ip_address: Optional[str] = None,
                                                     user_agent: Optional[str] = None) -> None:
        """Validate customer application data for duplicates"""
        
        try:
            # Check ID number + ID card type combination
            if ("id_number" in customer_data and customer_data["id_number"] and 
                "id_card_type" in customer_data and customer_data["id_card_type"]):
                
                query = select(CustomerApplication).where(
                    and_(
                        CustomerApplication.id_number == customer_data["id_number"],
                        CustomerApplication.id_card_type == customer_data["id_card_type"]
                    )
                )
                if exclude_id:
                    query = query.where(CustomerApplication.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_application = result.scalar_one_or_none()
                if existing_application:
                    await self.log_duplicate_attempt(
                        "CustomerApplication", "id_number_type", 
                        f"{customer_data['id_number']}_{customer_data['id_card_type']}",
                        user_id=user_id,
                        additional_info={"existing_id": existing_application.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                         field="id_number",
                         value=customer_data["id_number"],
                         existing_id=existing_application.id,
                         entity_type="CustomerApplication",
                         message=f"Customer with {customer_data['id_card_type']} number '{customer_data['id_number']}' already exists. Please verify your information.",
                         suggestions=["Verify the ID number is correct", "Check if this customer already has an application"]
                     )
            
            # Check phone number uniqueness
            if "phone" in customer_data and customer_data["phone"]:
                query = select(CustomerApplication).where(CustomerApplication.phone == customer_data["phone"])
                if exclude_id:
                    query = query.where(CustomerApplication.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_application = result.scalar_one_or_none()
                if existing_application:
                    await self.log_duplicate_attempt(
                        "CustomerApplication", "phone", customer_data["phone"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_application.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                         field="phone",
                         value=customer_data["phone"],
                         existing_id=existing_application.id,
                         entity_type="CustomerApplication",
                         message=f"Phone number '{customer_data['phone']}' is already registered",
                         suggestions=["Use a different phone number", "Check if this customer already has an application"]
                     )
            
            # Check for potential duplicate based on full name and other identifying info
            if ("full_name_latin" in customer_data and customer_data["full_name_latin"] and
                "date_of_birth" in customer_data and customer_data["date_of_birth"]):
                
                query = select(CustomerApplication).where(
                    and_(
                        CustomerApplication.full_name_latin.ilike(f"%{customer_data['full_name_latin']}%"),
                        CustomerApplication.date_of_birth == customer_data["date_of_birth"]
                    )
                )
                if exclude_id:
                    query = query.where(CustomerApplication.id != exclude_id)
                
                result = await self.db.execute(query)
                similar_applications = result.scalars().all()
                if similar_applications:
                    await self.log_duplicate_attempt(
                        "CustomerApplication", "name_dob_combination", 
                        f"{customer_data['full_name_latin']}_{customer_data['date_of_birth']}",
                        user_id=user_id,
                        additional_info={
                            "similar_applications": [app.id for app in similar_applications],
                            "warning_type": "potential_duplicate"
                        },
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    # This is a warning, not a hard error - let the frontend handle it
        except DuplicateFieldError:
            raise
        except Exception as e:
            logger.error(f"Database error in validate_customer_application_duplicates: {str(e)}")
            raise DatabaseError(
                 message="Failed to validate customer application data",
                 details={"error": str(e), "operation": "customer_validation"}
             )
    
    async def validate_department_duplicates(self, department_data: Dict[str, Any], 
                                            exclude_id: Optional[int] = None,
                                            user_id: Optional[int] = None,
                                            ip_address: Optional[str] = None,
                                            user_agent: Optional[str] = None) -> None:
        """Validate department data for duplicates"""
        
        try:
            # Check department code uniqueness
            if "code" in department_data and department_data["code"]:
                query = select(Department).where(Department.code == department_data["code"])
                if exclude_id:
                    query = query.where(Department.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_department = result.scalar_one_or_none()
                if existing_department:
                    await self.log_duplicate_attempt(
                        "Department", "code", department_data["code"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_department.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="code",
                        value=department_data["code"],
                        existing_id=existing_department.id,
                        entity_type="Department",
                        message=f"Department code '{department_data['code']}' already exists",
                        suggestions=["Use a different department code", "Check existing department codes"]
                    )
            
            # Check department name uniqueness
            if "name" in department_data and department_data["name"]:
                query = select(Department).where(Department.name.ilike(department_data["name"]))
                if exclude_id:
                    query = query.where(Department.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_department = result.scalar_one_or_none()
                if existing_department:
                    await self.log_duplicate_attempt(
                        "Department", "name", department_data["name"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_department.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="name",
                        value=department_data["name"],
                        existing_id=existing_department.id,
                        entity_type="Department",
                        message=f"Department name '{department_data['name']}' already exists",
                        suggestions=["Use a different department name", "Check if this department is already registered"]
                    )
        except (DuplicateFieldError, DuplicateValidationError):
            raise
        except Exception as e:
            logger.error(f"Database error in validate_department_duplicates: {str(e)}")
            raise DatabaseError(
                message="Failed to validate department data",
                details={"error": str(e), "operation": "department_validation"}
            )
    
    async def validate_branch_duplicates(self, branch_data: Dict[str, Any], 
                                        exclude_id: Optional[int] = None,
                                        user_id: Optional[int] = None,
                                        ip_address: Optional[str] = None,
                                        user_agent: Optional[str] = None) -> None:
        """Validate branch data for duplicates"""
        
        try:
            # Check branch code uniqueness
            if "code" in branch_data and branch_data["code"]:
                query = select(Branch).where(Branch.code == branch_data["code"])
                if exclude_id:
                    query = query.where(Branch.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_branch = result.scalar_one_or_none()
                if existing_branch:
                    await self.log_duplicate_attempt(
                        "Branch", "code", branch_data["code"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_branch.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="code",
                        value=branch_data["code"],
                        existing_id=existing_branch.id,
                        entity_type="Branch",
                        message=f"Branch code '{branch_data['code']}' already exists",
                        suggestions=["Use a different branch code", "Check existing branch codes"]
                    )
            
            # Check branch name uniqueness within the same region/area
            if "name" in branch_data and branch_data["name"]:
                query = select(Branch).where(Branch.name.ilike(branch_data["name"]))
                if exclude_id:
                    query = query.where(Branch.id != exclude_id)
                
                result = await self.db.execute(query)
                existing_branch = result.scalar_one_or_none()
                if existing_branch:
                    await self.log_duplicate_attempt(
                        "Branch", "name", branch_data["name"],
                        user_id=user_id,
                        additional_info={"existing_id": existing_branch.id},
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
                    raise DuplicateFieldError(
                        field="name",
                        value=branch_data["name"],
                        existing_id=existing_branch.id,
                        entity_type="Branch",
                        message=f"Branch name '{branch_data['name']}' already exists",
                        suggestions=["Use a different branch name", "Check if this branch is already registered"]
                    )
        except DuplicateFieldError:
            raise
        except Exception as e:
            logger.error(f"Database error in validate_branch_duplicates: {str(e)}")
            raise DatabaseError(
                message="Failed to validate branch data",
                details={"error": str(e), "operation": "branch_validation"}
            )
    
    async def check_field_availability(self, model_name: str, field: str, value: Any, 
                                     exclude_id: Optional[int] = None,
                                     user_id: Optional[int] = None,
                                     ip_address: Optional[str] = None,
                                     user_agent: Optional[str] = None) -> Dict[str, Any]:
        """Check if a specific field value is available (for real-time frontend validation)"""
        
        try:
            # Log field availability check
            try:
                await self.audit_service.log_validation_event(
                    event_type=ValidationEventType.FIELD_AVAILABILITY_CHECK,
                    entity_type=model_name,
                    field_name=field,
                    field_value=str(value),
                    user_id=str(user_id) if user_id else None,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={"exclude_id": exclude_id}
                )
            except Exception as audit_error:
                logger.error(f"Failed to log field availability check: {str(audit_error)}")
            
            if model_name.lower() == "user":
                if field == "username":
                    query = select(User).where(User.username == value)
                elif field == "email":
                    query = select(User).where(User.email == value)
                elif field == "employee_id":
                    query = select(User).where(User.employee_id == value)
                else:
                    return {"available": True, "message": "Field not validated"}
                
                if exclude_id:
                    query = query.where(User.id != exclude_id)
                
                result = await self.db.execute(query)
                existing = result.scalar_one_or_none()
                if existing:
                    try:
                        await self.audit_service.log_validation_event(
                            event_type=ValidationEventType.DUPLICATE_DETECTED,
                            entity_type="User",
                            field_name=field,
                            field_value=str(value),
                            user_id=str(user_id) if user_id else None,
                            ip_address=ip_address,
                            user_agent=user_agent,
                            metadata={"existing_id": existing.id, "exclude_id": exclude_id}
                        )
                    except Exception as audit_error:
                        logger.error(f"Failed to log duplicate detection: {str(audit_error)}")
                    return {
                        "available": False,
                        "message": f"{field.replace('_', ' ').title()} is already taken",
                        "existing_id": existing.id
                    }
            
            elif model_name.lower() == "customer_application":
                if field == "phone":
                    query = select(CustomerApplication).where(CustomerApplication.phone == value)
                elif field == "id_number":
                    # For ID number, we need the ID card type as well
                    return {"available": True, "message": "ID number validation requires ID card type"}
                else:
                    return {"available": True, "message": "Field not validated"}
                
                if exclude_id:
                    query = query.where(CustomerApplication.id != exclude_id)
                
                result = await self.db.execute(query)
                existing = result.scalar_one_or_none()
                if existing:
                    try:
                        await self.audit_service.log_validation_event(
                            event_type=ValidationEventType.DUPLICATE_DETECTED,
                            entity_type="CustomerApplication",
                            field_name=field,
                            field_value=str(value),
                            user_id=str(user_id) if user_id else None,
                            ip_address=ip_address,
                            user_agent=user_agent,
                            metadata={"existing_id": existing.id, "exclude_id": exclude_id}
                        )
                    except Exception as audit_error:
                        logger.error(f"Failed to log duplicate detection: {str(audit_error)}")
                    return {
                        "available": False,
                        "message": f"{field.replace('_', ' ').title()} is already registered",
                        "existing_id": existing.id
                    }
            
            return {"available": True, "message": "Available"}
            
        except Exception as e:
            logger.error(f"Error checking field availability: {str(e)}")
            return {"available": True, "message": "Validation error occurred"}
    
    async def get_duplicate_suggestions(self, model_name: str, search_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get suggestions for potential duplicates based on partial data"""
        
        suggestions = []
        
        try:
            if model_name.lower() == "customer_application":
                # Search by name similarity
                if "full_name_latin" in search_data and search_data["full_name_latin"]:
                    name_query = select(CustomerApplication).where(
                        CustomerApplication.full_name_latin.ilike(f"%{search_data['full_name_latin']}%")
                    ).limit(5)
                    
                    result = await self.db.execute(name_query)
                    applications = result.scalars().all()
                    
                    for app in applications:
                        suggestions.append({
                            "id": app.id,
                            "type": "name_similarity",
                            "full_name_latin": app.full_name_latin,
                            "phone": app.phone,
                            "id_number": app.id_number,
                            "id_card_type": app.id_card_type,
                            "similarity_score": 0.8  # Placeholder for actual similarity calculation
                        })
                
                # Search by phone similarity
                if "phone" in search_data and search_data["phone"] and len(search_data["phone"]) >= 4:
                    phone_query = select(CustomerApplication).where(
                        CustomerApplication.phone.like(f"%{search_data['phone'][-4:]}%")
                    ).limit(3)
                    
                    result = await self.db.execute(phone_query)
                    applications = result.scalars().all()
                    
                    for app in applications:
                        if app.id not in [s["id"] for s in suggestions]:
                            suggestions.append({
                                "id": app.id,
                                "type": "phone_similarity",
                                "full_name_latin": app.full_name_latin,
                                "phone": app.phone,
                                "id_number": app.id_number,
                                "id_card_type": app.id_card_type,
                                "similarity_score": 0.6
                            })
            
            return suggestions[:5]  # Return top 5 suggestions
            
        except Exception as e:
            logger.error(f"Error getting duplicate suggestions: {str(e)}")
            return []