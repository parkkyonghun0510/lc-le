from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import User, CustomerApplication, Department, Branch
from app.core.logging import get_logger
from datetime import datetime
import json

logger = get_logger(__name__)

class DuplicateValidationError(Exception):
    """Custom exception for duplicate validation errors"""
    def __init__(self, message: str, field: str, value: Any, existing_id: Optional[int] = None):
        self.message = message
        self.field = field
        self.value = value
        self.existing_id = existing_id
        super().__init__(self.message)

class ValidationService:
    """Service for handling duplicate validation across all models"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_duplicate_attempt(self, model_name: str, field: str, value: Any, 
                            user_id: Optional[int] = None, additional_info: Dict = None):
        """Log duplicate attempt for auditing purposes"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
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
    
    def validate_user_duplicates(self, user_data: Dict[str, Any], 
                               exclude_id: Optional[int] = None) -> None:
        """Validate user data for duplicates"""
        
        # Check username uniqueness
        if "username" in user_data and user_data["username"]:
            query = self.db.query(User).filter(User.username == user_data["username"])
            if exclude_id:
                query = query.filter(User.id != exclude_id)
            
            existing_user = query.first()
            if existing_user:
                self.log_duplicate_attempt("User", "username", user_data["username"], 
                                         additional_info={"existing_user_id": existing_user.id})
                raise DuplicateValidationError(
                    f"Username '{user_data['username']}' is already taken",
                    "username", user_data["username"], existing_user.id
                )
        
        # Check email uniqueness
        if "email" in user_data and user_data["email"]:
            query = self.db.query(User).filter(User.email == user_data["email"])
            if exclude_id:
                query = query.filter(User.id != exclude_id)
            
            existing_user = query.first()
            if existing_user:
                self.log_duplicate_attempt("User", "email", user_data["email"],
                                         additional_info={"existing_user_id": existing_user.id})
                raise DuplicateValidationError(
                    f"Email '{user_data['email']}' is already registered",
                    "email", user_data["email"], existing_user.id
                )
        
        # Check employee_id uniqueness (if provided)
        if "employee_id" in user_data and user_data["employee_id"]:
            query = self.db.query(User).filter(User.employee_id == user_data["employee_id"])
            if exclude_id:
                query = query.filter(User.id != exclude_id)
            
            existing_user = query.first()
            if existing_user:
                self.log_duplicate_attempt("User", "employee_id", user_data["employee_id"],
                                         additional_info={"existing_user_id": existing_user.id})
                raise DuplicateValidationError(
                    f"Employee ID '{user_data['employee_id']}' is already assigned",
                    "employee_id", user_data["employee_id"], existing_user.id
                )
    
    def validate_customer_application_duplicates(self, customer_data: Dict[str, Any], 
                                               exclude_id: Optional[int] = None) -> None:
        """Validate customer application data for duplicates"""
        
        # Check ID number + ID card type combination
        if ("id_number" in customer_data and customer_data["id_number"] and 
            "id_card_type" in customer_data and customer_data["id_card_type"]):
            
            query = self.db.query(CustomerApplication).filter(
                and_(
                    CustomerApplication.id_number == customer_data["id_number"],
                    CustomerApplication.id_card_type == customer_data["id_card_type"]
                )
            )
            if exclude_id:
                query = query.filter(CustomerApplication.id != exclude_id)
            
            existing_application = query.first()
            if existing_application:
                self.log_duplicate_attempt(
                    "CustomerApplication", "id_number_type", 
                    f"{customer_data['id_number']}_{customer_data['id_card_type']}",
                    additional_info={"existing_application_id": existing_application.id}
                )
                raise DuplicateValidationError(
                    f"Customer with {customer_data['id_card_type']} number '{customer_data['id_number']}' already exists",
                    "id_number", customer_data["id_number"], existing_application.id
                )
        
        # Check phone number uniqueness
        if "phone" in customer_data and customer_data["phone"]:
            query = self.db.query(CustomerApplication).filter(CustomerApplication.phone == customer_data["phone"])
            if exclude_id:
                query = query.filter(CustomerApplication.id != exclude_id)
            
            existing_application = query.first()
            if existing_application:
                self.log_duplicate_attempt(
                    "CustomerApplication", "phone", customer_data["phone"],
                    additional_info={"existing_application_id": existing_application.id}
                )
                raise DuplicateValidationError(
                    f"Phone number '{customer_data['phone']}' is already registered",
                    "phone", customer_data["phone"], existing_application.id
                )
        
        # Check for potential duplicate based on full name and other identifying info
        if ("full_name_latin" in customer_data and customer_data["full_name_latin"] and
            "date_of_birth" in customer_data and customer_data["date_of_birth"]):
            
            query = self.db.query(CustomerApplication).filter(
                and_(
                    CustomerApplication.full_name_latin.ilike(f"%{customer_data['full_name_latin']}%"),
                    CustomerApplication.date_of_birth == customer_data["date_of_birth"]
                )
            )
            if exclude_id:
                query = query.filter(CustomerApplication.id != exclude_id)
            
            similar_applications = query.all()
            if similar_applications:
                self.log_duplicate_attempt(
                    "CustomerApplication", "name_dob_combination", 
                    f"{customer_data['full_name_latin']}_{customer_data['date_of_birth']}",
                    additional_info={
                        "similar_applications": [app.id for app in similar_applications],
                        "warning_type": "potential_duplicate"
                    }
                )
                # This is a warning, not a hard error - let the frontend handle it
    
    def validate_department_duplicates(self, department_data: Dict[str, Any], 
                                     exclude_id: Optional[int] = None) -> None:
        """Validate department data for duplicates"""
        
        # Check department code uniqueness
        if "code" in department_data and department_data["code"]:
            query = self.db.query(Department).filter(Department.code == department_data["code"])
            if exclude_id:
                query = query.filter(Department.id != exclude_id)
            
            existing_department = query.first()
            if existing_department:
                self.log_duplicate_attempt(
                    "Department", "code", department_data["code"],
                    additional_info={"existing_department_id": existing_department.id}
                )
                raise DuplicateValidationError(
                    f"Department code '{department_data['code']}' already exists",
                    "code", department_data["code"], existing_department.id
                )
        
        # Check department name uniqueness
        if "name" in department_data and department_data["name"]:
            query = self.db.query(Department).filter(Department.name.ilike(department_data["name"]))
            if exclude_id:
                query = query.filter(Department.id != exclude_id)
            
            existing_department = query.first()
            if existing_department:
                self.log_duplicate_attempt(
                    "Department", "name", department_data["name"],
                    additional_info={"existing_department_id": existing_department.id}
                )
                raise DuplicateValidationError(
                    f"Department name '{department_data['name']}' already exists",
                    "name", department_data["name"], existing_department.id
                )
    
    def validate_branch_duplicates(self, branch_data: Dict[str, Any], 
                                 exclude_id: Optional[int] = None) -> None:
        """Validate branch data for duplicates"""
        
        # Check branch code uniqueness
        if "code" in branch_data and branch_data["code"]:
            query = self.db.query(Branch).filter(Branch.code == branch_data["code"])
            if exclude_id:
                query = query.filter(Branch.id != exclude_id)
            
            existing_branch = query.first()
            if existing_branch:
                self.log_duplicate_attempt(
                    "Branch", "code", branch_data["code"],
                    additional_info={"existing_branch_id": existing_branch.id}
                )
                raise DuplicateValidationError(
                    f"Branch code '{branch_data['code']}' already exists",
                    "code", branch_data["code"], existing_branch.id
                )
        
        # Check branch name uniqueness within the same region/area
        if "name" in branch_data and branch_data["name"]:
            query = self.db.query(Branch).filter(Branch.name.ilike(branch_data["name"]))
            if exclude_id:
                query = query.filter(Branch.id != exclude_id)
            
            existing_branch = query.first()
            if existing_branch:
                self.log_duplicate_attempt(
                    "Branch", "name", branch_data["name"],
                    additional_info={"existing_branch_id": existing_branch.id}
                )
                raise DuplicateValidationError(
                    f"Branch name '{branch_data['name']}' already exists",
                    "name", branch_data["name"], existing_branch.id
                )
    
    def check_field_availability(self, model_name: str, field: str, value: Any, 
                               exclude_id: Optional[int] = None) -> Dict[str, Any]:
        """Check if a specific field value is available (for real-time frontend validation)"""
        
        try:
            if model_name.lower() == "user":
                if field == "username":
                    query = self.db.query(User).filter(User.username == value)
                elif field == "email":
                    query = self.db.query(User).filter(User.email == value)
                elif field == "employee_id":
                    query = self.db.query(User).filter(User.employee_id == value)
                else:
                    return {"available": True, "message": "Field not validated"}
                
                if exclude_id:
                    query = query.filter(User.id != exclude_id)
                
                existing = query.first()
                if existing:
                    return {
                        "available": False,
                        "message": f"{field.replace('_', ' ').title()} is already taken",
                        "existing_id": existing.id
                    }
            
            elif model_name.lower() == "customer_application":
                if field == "phone":
                    query = self.db.query(CustomerApplication).filter(CustomerApplication.phone == value)
                elif field == "id_number":
                    # For ID number, we need the ID card type as well
                    return {"available": True, "message": "ID number validation requires ID card type"}
                else:
                    return {"available": True, "message": "Field not validated"}
                
                if exclude_id:
                    query = query.filter(CustomerApplication.id != exclude_id)
                
                existing = query.first()
                if existing:
                    return {
                        "available": False,
                        "message": f"{field.replace('_', ' ').title()} is already registered",
                        "existing_id": existing.id
                    }
            
            return {"available": True, "message": "Available"}
            
        except Exception as e:
            logger.error(f"Error checking field availability: {str(e)}")
            return {"available": True, "message": "Validation error occurred"}
    
    def get_duplicate_suggestions(self, model_name: str, search_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get suggestions for potential duplicates based on partial data"""
        
        suggestions = []
        
        try:
            if model_name.lower() == "customer_application":
                # Search by name similarity
                if "full_name_latin" in search_data and search_data["full_name_latin"]:
                    name_query = self.db.query(CustomerApplication).filter(
                        CustomerApplication.full_name_latin.ilike(f"%{search_data['full_name_latin']}%")
                    ).limit(5)
                    
                    for app in name_query.all():
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
                if "phone" in search_data and search_data["phone"]:
                    phone_query = self.db.query(CustomerApplication).filter(
                        CustomerApplication.phone.like(f"%{search_data['phone'][-4:]}%")
                    ).limit(3)
                    
                    for app in phone_query.all():
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