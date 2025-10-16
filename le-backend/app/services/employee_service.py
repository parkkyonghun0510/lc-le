"""
Employee Service
Handles business logic for employee management operations
"""
from uuid import UUID
from typing import Optional, List, Dict, Any, Tuple
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_, and_
from app.models import Employee, ApplicationEmployeeAssignment, User, Department, Branch
from app.schemas import EmployeeCreate, EmployeeUpdate
from app.core.logging import get_logger
from app.core.exceptions import ValidationError, DuplicateFieldError, ErrorCode
from fastapi import HTTPException, status

logger = get_logger(__name__)


class NotFoundError(HTTPException):
    """Exception for resource not found"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ConflictError(HTTPException):
    """Exception for resource conflicts"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class EmployeeService:
    """Service for employee management operations"""
    
    @staticmethod
    async def create_employee(
        db: AsyncSession,
        employee_data: EmployeeCreate,
        created_by: UUID
    ) -> Employee:
        """
        Create a new employee with validation
        
        Args:
            db: Database session
            employee_data: Employee creation data
            created_by: UUID of user creating the employee
            
        Returns:
            Created Employee object
            
        Raises:
            ConflictError: If employee_code already exists
            ValidationError: If user_id is already linked to another employee
        """
        # Check if employee_code already exists
        existing_code_query = await db.execute(
            select(Employee).where(Employee.employee_code == employee_data.employee_code)
        )
        existing_employee = existing_code_query.scalar_one_or_none()
        
        if existing_employee:
            logger.warning(f"Attempted to create employee with duplicate code: {employee_data.employee_code}")
            raise ConflictError(f"Employee with code '{employee_data.employee_code}' already exists")
        
        # If user_id is provided, check if it's already linked to another employee
        if employee_data.user_id:
            existing_user_link_query = await db.execute(
                select(Employee).where(Employee.user_id == employee_data.user_id)
            )
            existing_user_link = existing_user_link_query.scalar_one_or_none()
            
            if existing_user_link:
                logger.warning(f"Attempted to link user {employee_data.user_id} already linked to employee {existing_user_link.id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already linked to another employee"
                )
        
        # Create new employee
        new_employee = Employee(
            employee_code=employee_data.employee_code,
            full_name_khmer=employee_data.full_name_khmer,
            full_name_latin=employee_data.full_name_latin,
            phone_number=employee_data.phone_number,
            email=employee_data.email,
            position=employee_data.position,
            department_id=employee_data.department_id,
            branch_id=employee_data.branch_id,
            user_id=employee_data.user_id,
            is_active=employee_data.is_active,
            notes=employee_data.notes,
            created_by=created_by,
            updated_by=created_by
        )
        
        db.add(new_employee)
        await db.flush()
        await db.refresh(new_employee)
        
        # Eagerly load relationships before commit to avoid MissingGreenlet error
        await db.refresh(
            new_employee,
            attribute_names=['department', 'branch', 'linked_user']
        )
        
        await db.commit()
        
        logger.info(f"Created employee: {new_employee.employee_code} (ID: {new_employee.id}) by user {created_by}")
        return new_employee
    
    @staticmethod
    async def get_employee_by_id(
        db: AsyncSession,
        employee_id: UUID,
        load_relationships: bool = True
    ) -> Optional[Employee]:
        """
        Get employee by ID
        
        Args:
            db: Database session
            employee_id: Employee UUID
            load_relationships: Whether to eager load relationships
            
        Returns:
            Employee object or None if not found
        """
        query = select(Employee).where(Employee.id == employee_id)
        
        if load_relationships:
            query = query.options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
                selectinload(Employee.linked_user),
                selectinload(Employee.assignments)
            )
        
        result = await db.execute(query)
        employee = result.scalar_one_or_none()
        
        if employee:
            logger.debug(f"Retrieved employee by ID: {employee_id}")
        else:
            logger.debug(f"Employee not found: {employee_id}")
        
        return employee
    
    @staticmethod
    async def get_employee_by_code(
        db: AsyncSession,
        employee_code: str,
        load_relationships: bool = True
    ) -> Optional[Employee]:
        """
        Get employee by employee code
        
        Args:
            db: Database session
            employee_code: Employee code
            load_relationships: Whether to eager load relationships
            
        Returns:
            Employee object or None if not found
        """
        query = select(Employee).where(Employee.employee_code == employee_code)
        
        if load_relationships:
            query = query.options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
                selectinload(Employee.linked_user),
                selectinload(Employee.assignments)
            )
        
        result = await db.execute(query)
        employee = result.scalar_one_or_none()
        
        if employee:
            logger.debug(f"Retrieved employee by code: {employee_code}")
        else:
            logger.debug(f"Employee not found with code: {employee_code}")
        
        return employee
    
    @staticmethod
    async def list_employees(
        db: AsyncSession,
        page: int = 1,
        size: int = 10,
        search: Optional[str] = None,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Employee], int]:
        """
        List employees with pagination, search, and filters
        
        Args:
            db: Database session
            page: Page number (1-indexed)
            size: Page size
            search: Search term for name or code
            department_id: Filter by department
            branch_id: Filter by branch
            is_active: Filter by active status
            
        Returns:
            Tuple of (list of employees, total count)
        """
        # Build base query
        query = select(Employee).options(
            selectinload(Employee.department),
            selectinload(Employee.branch),
            selectinload(Employee.linked_user),
            selectinload(Employee.assignments)
        )
        
        # Apply filters
        filters = []
        
        if search:
            search_pattern = f"%{search}%"
            filters.append(
                or_(
                    Employee.full_name_khmer.ilike(search_pattern),
                    Employee.full_name_latin.ilike(search_pattern),
                    Employee.employee_code.ilike(search_pattern)
                )
            )
        
        if department_id:
            filters.append(Employee.department_id == department_id)
        
        if branch_id:
            filters.append(Employee.branch_id == branch_id)
        
        if is_active is not None:
            filters.append(Employee.is_active == is_active)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Get total count
        count_query = select(func.count()).select_from(Employee)
        if filters:
            count_query = count_query.where(and_(*filters))
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        
        # Execute query
        result = await db.execute(query)
        employees = result.scalars().all()
        
        logger.debug(f"Listed {len(employees)} employees (page {page}, size {size}, total {total})")
        return list(employees), total
    
    @staticmethod
    async def update_employee(
        db: AsyncSession,
        employee_id: UUID,
        employee_data: EmployeeUpdate,
        updated_by: UUID
    ) -> Employee:
        """
        Update an employee
        
        Args:
            db: Database session
            employee_id: Employee UUID
            employee_data: Employee update data
            updated_by: UUID of user updating the employee
            
        Returns:
            Updated Employee object
            
        Raises:
            NotFoundError: If employee not found
            ConflictError: If employee_code already exists
            ValidationError: If user_id is already linked to another employee
        """
        # Get existing employee
        employee = await EmployeeService.get_employee_by_id(db, employee_id, load_relationships=False)
        if not employee:
            logger.warning(f"Attempted to update non-existent employee: {employee_id}")
            raise NotFoundError(f"Employee not found")
        
        # Check if employee_code is being changed and if it already exists
        if employee_data.employee_code and employee_data.employee_code != employee.employee_code:
            existing_code_query = await db.execute(
                select(Employee).where(
                    Employee.employee_code == employee_data.employee_code,
                    Employee.id != employee_id
                )
            )
            existing_employee = existing_code_query.scalar_one_or_none()
            
            if existing_employee:
                logger.warning(f"Attempted to update employee with duplicate code: {employee_data.employee_code}")
                raise ConflictError(f"Employee with code '{employee_data.employee_code}' already exists")
        
        # Check if user_id is being changed and if it's already linked
        if employee_data.user_id and employee_data.user_id != employee.user_id:
            existing_user_link_query = await db.execute(
                select(Employee).where(
                    Employee.user_id == employee_data.user_id,
                    Employee.id != employee_id
                )
            )
            existing_user_link = existing_user_link_query.scalar_one_or_none()
            
            if existing_user_link:
                logger.warning(f"Attempted to link user {employee_data.user_id} already linked to employee {existing_user_link.id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already linked to another employee"
                )
        
        # Update fields
        update_data = employee_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(employee, field, value)
        
        employee.updated_by = updated_by
        
        await db.flush()
        await db.refresh(employee)
        
        # Eagerly load relationships before commit to avoid MissingGreenlet error
        await db.refresh(
            employee,
            attribute_names=['department', 'branch', 'linked_user']
        )
        
        await db.commit()
        
        logger.info(f"Updated employee: {employee.employee_code} (ID: {employee.id}) by user {updated_by}")
        return employee
    
    @staticmethod
    async def deactivate_employee(
        db: AsyncSession,
        employee_id: UUID,
        updated_by: UUID
    ) -> Employee:
        """
        Deactivate an employee (soft delete)
        
        Args:
            db: Database session
            employee_id: Employee UUID
            updated_by: UUID of user deactivating the employee
            
        Returns:
            Deactivated Employee object
            
        Raises:
            NotFoundError: If employee not found
        """
        employee = await EmployeeService.get_employee_by_id(db, employee_id, load_relationships=False)
        if not employee:
            logger.warning(f"Attempted to deactivate non-existent employee: {employee_id}")
            raise NotFoundError(f"Employee not found")
        
        employee.is_active = False
        employee.updated_by = updated_by
        
        await db.flush()
        await db.refresh(employee)
        await db.commit()
        
        logger.info(f"Deactivated employee: {employee.employee_code} (ID: {employee.id}) by user {updated_by}")
        return employee
    
    @staticmethod
    async def search_employees(
        db: AsyncSession,
        search_term: str,
        is_active: bool = True,
        limit: int = 20
    ) -> List[Employee]:
        """
        Search employees by name or code using ILIKE
        
        Args:
            db: Database session
            search_term: Search term
            is_active: Filter by active status
            limit: Maximum number of results
            
        Returns:
            List of matching employees
        """
        search_pattern = f"%{search_term}%"
        
        query = select(Employee).where(
            and_(
                or_(
                    Employee.full_name_khmer.ilike(search_pattern),
                    Employee.full_name_latin.ilike(search_pattern),
                    Employee.employee_code.ilike(search_pattern)
                ),
                Employee.is_active == is_active
            )
        ).options(
            selectinload(Employee.department),
            selectinload(Employee.branch),
            selectinload(Employee.linked_user)
        ).limit(limit)
        
        result = await db.execute(query)
        employees = result.scalars().all()
        
        logger.debug(f"Search for '{search_term}' returned {len(employees)} employees")
        return list(employees)
    
    @staticmethod
    async def link_employee_to_user(
        db: AsyncSession,
        employee_id: UUID,
        user_id: UUID,
        updated_by: UUID
    ) -> Employee:
        """
        Link an employee record to a system user
        
        Args:
            db: Database session
            employee_id: Employee UUID
            user_id: User UUID to link
            updated_by: UUID of user performing the link
            
        Returns:
            Updated Employee object
            
        Raises:
            NotFoundError: If employee or user not found
            ValidationError: If user is already linked to another employee
        """
        # Get employee
        employee = await EmployeeService.get_employee_by_id(db, employee_id, load_relationships=False)
        if not employee:
            logger.warning(f"Attempted to link non-existent employee: {employee_id}")
            raise NotFoundError(f"Employee not found")
        
        # Check if user exists
        user_query = await db.execute(select(User).where(User.id == user_id))
        user = user_query.scalar_one_or_none()
        if not user:
            logger.warning(f"Attempted to link to non-existent user: {user_id}")
            raise NotFoundError(f"User not found")
        
        # Check if user is already linked to another employee
        existing_link_query = await db.execute(
            select(Employee).where(
                Employee.user_id == user_id,
                Employee.id != employee_id
            )
        )
        existing_link = existing_link_query.scalar_one_or_none()
        
        if existing_link:
            logger.warning(f"Attempted to link user {user_id} already linked to employee {existing_link.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already linked to another employee"
            )
        
        # Link user to employee
        employee.user_id = user_id
        employee.updated_by = updated_by
        
        await db.flush()
        await db.refresh(employee)
        await db.commit()
        
        logger.info(f"Linked employee {employee.employee_code} to user {user_id} by user {updated_by}")
        return employee
    
    @staticmethod
    async def get_employee_workload(
        db: AsyncSession,
        employee_id: UUID,
        status_filter: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get workload statistics for an employee
        
        Args:
            db: Database session
            employee_id: Employee UUID
            status_filter: Optional filter by application status
            date_from: Optional start date for filtering assignments
            date_to: Optional end date for filtering assignments
            
        Returns:
            Dictionary with workload statistics
            
        Raises:
            NotFoundError: If employee not found
        """
        # Verify employee exists
        employee = await EmployeeService.get_employee_by_id(db, employee_id, load_relationships=False)
        if not employee:
            logger.warning(f"Attempted to get workload for non-existent employee: {employee_id}")
            raise NotFoundError(f"Employee not found")
        
        # Build query for assignments
        from app.models import CustomerApplication
        
        query = select(
            CustomerApplication.status,
            func.count(ApplicationEmployeeAssignment.id).label('count')
        ).join(
            ApplicationEmployeeAssignment,
            ApplicationEmployeeAssignment.application_id == CustomerApplication.id
        ).where(
            and_(
                ApplicationEmployeeAssignment.employee_id == employee_id,
                ApplicationEmployeeAssignment.is_active == True
            )
        ).group_by(CustomerApplication.status)
        
        # Apply status filter if provided
        if status_filter:
            query = query.where(CustomerApplication.status == status_filter)
        
        # Apply date filters if provided
        if date_from:
            query = query.where(ApplicationEmployeeAssignment.assigned_at >= date_from)
        
        if date_to:
            query = query.where(ApplicationEmployeeAssignment.assigned_at <= date_to)
        
        result = await db.execute(query)
        status_counts = {row.status: row.count for row in result}
        
        # Get total assignments
        total_query = select(func.count(ApplicationEmployeeAssignment.id)).where(
            and_(
                ApplicationEmployeeAssignment.employee_id == employee_id,
                ApplicationEmployeeAssignment.is_active == True
            )
        )
        total_result = await db.execute(total_query)
        total_assignments = total_result.scalar()
        
        workload = {
            "employee_id": str(employee_id),
            "employee_code": employee.employee_code,
            "full_name_khmer": employee.full_name_khmer,
            "full_name_latin": employee.full_name_latin,
            "total_assignments": total_assignments,
            "assignments_by_status": status_counts
        }
        
        logger.debug(f"Retrieved workload for employee {employee_id}: {total_assignments} total assignments")
        return workload
    
    @staticmethod
    async def get_next_available_code(
        db: AsyncSession,
        pattern: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Get the next available employee code
        
        Args:
            db: Database session
            pattern: Optional code pattern (e.g., "EMP-{year}-{seq}")
            
        Returns:
            Dictionary with 'code' and 'pattern' keys
        """
        # Get all existing employee codes
        query = select(Employee.employee_code).order_by(Employee.employee_code)
        result = await db.execute(query)
        existing_codes = [row[0] for row in result.fetchall()]
        
        # If no employees exist, return default starting code
        if not existing_codes:
            logger.debug("No existing employees, returning default code '0001'")
            return {"code": "0001", "pattern": "sequential_numeric"}
        
        # If pattern is provided, use it; otherwise detect pattern
        if not pattern:
            detected_pattern = EmployeeService.detect_code_pattern(existing_codes)
            logger.debug(f"Detected pattern: {detected_pattern}")
        else:
            detected_pattern = pattern
        
        # Generate next code based on pattern
        if detected_pattern == "sequential_numeric":
            # Extract numeric codes and find max
            numeric_codes = []
            for code in existing_codes:
                try:
                    numeric_codes.append(int(code))
                except ValueError:
                    continue
            
            if numeric_codes:
                max_code = max(numeric_codes)
                next_code = str(max_code + 1).zfill(len(str(max_code)))
                logger.debug(f"Next sequential numeric code: {next_code}")
                return {"code": next_code, "pattern": "sequential_numeric"}
            else:
                return {"code": "0001", "pattern": "sequential_numeric"}
        
        elif detected_pattern.startswith("prefix_"):
            # Handle prefix-based patterns (e.g., "EMP-2025-001")
            # Extract prefix and find max sequence
            import re
            from datetime import datetime
            
            # Try to extract pattern components
            prefix_match = re.match(r'^([A-Z]+-)?(\d{4}-)?(\d+)$', existing_codes[-1])
            if prefix_match:
                prefix = prefix_match.group(1) or ""
                year_part = prefix_match.group(2) or ""
                
                # Extract all sequence numbers with same prefix
                sequences = []
                pattern_regex = f"^{re.escape(prefix)}{re.escape(year_part)}(\\d+)$"
                for code in existing_codes:
                    match = re.match(pattern_regex, code)
                    if match:
                        sequences.append(int(match.group(1)))
                
                if sequences:
                    max_seq = max(sequences)
                    next_seq = str(max_seq + 1).zfill(len(str(max_seq)))
                    next_code = f"{prefix}{year_part}{next_seq}"
                    logger.debug(f"Next prefix-based code: {next_code}")
                    return {"code": next_code, "pattern": detected_pattern}
        
        # Fallback: increment last code numerically
        last_code = existing_codes[-1]
        try:
            # Try to extract trailing number
            import re
            match = re.search(r'(\d+)$', last_code)
            if match:
                number = int(match.group(1))
                prefix = last_code[:match.start()]
                next_number = str(number + 1).zfill(len(match.group(1)))
                next_code = f"{prefix}{next_number}"
                logger.debug(f"Next code (fallback): {next_code}")
                return {"code": next_code, "pattern": "custom"}
        except Exception as e:
            logger.warning(f"Error generating next code: {e}")
        
        # Ultimate fallback
        return {"code": "0001", "pattern": "sequential_numeric"}
    
    @staticmethod
    def detect_code_pattern(codes: List[str]) -> str:
        """
        Detect the most common code pattern from existing codes
        
        Patterns:
        - sequential_numeric: "0001", "0002", "0003"
        - prefix_year_seq: "EMP-2025-001", "EMP-2025-002"
        - prefix_seq: "IT-001", "HR-001"
        
        Args:
            codes: List of existing employee codes
            
        Returns:
            Detected pattern string
        """
        if not codes:
            return "sequential_numeric"
        
        import re
        
        # Check if all codes are purely numeric
        numeric_count = sum(1 for code in codes if code.isdigit())
        if numeric_count > len(codes) * 0.8:  # 80% threshold
            return "sequential_numeric"
        
        # Check for prefix-year-sequence pattern (e.g., "EMP-2025-001")
        prefix_year_pattern = re.compile(r'^[A-Z]+-\d{4}-\d+$')
        prefix_year_count = sum(1 for code in codes if prefix_year_pattern.match(code))
        if prefix_year_count > len(codes) * 0.8:
            return "prefix_year_seq"
        
        # Check for prefix-sequence pattern (e.g., "IT-001")
        prefix_seq_pattern = re.compile(r'^[A-Z]+-\d+$')
        prefix_seq_count = sum(1 for code in codes if prefix_seq_pattern.match(code))
        if prefix_seq_count > len(codes) * 0.8:
            return "prefix_seq"
        
        # Default to custom if no clear pattern
        return "custom"
    
    @staticmethod
    async def check_code_availability(
        db: AsyncSession,
        code: str
    ) -> Dict[str, Any]:
        """
        Check if an employee code is available
        
        Args:
            db: Database session
            code: Employee code to check
            
        Returns:
            Dictionary with availability status and existing employee info if taken
        """
        existing_employee = await EmployeeService.get_employee_by_code(
            db, code, load_relationships=False
        )
        
        if existing_employee:
            logger.debug(f"Employee code '{code}' is taken by employee {existing_employee.id}")
            return {
                "available": False,
                "code": code,
                "existing_employee": {
                    "id": str(existing_employee.id),
                    "full_name_khmer": existing_employee.full_name_khmer,
                    "full_name_latin": existing_employee.full_name_latin
                }
            }
        else:
            logger.debug(f"Employee code '{code}' is available")
            return {
                "available": True,
                "code": code,
                "existing_employee": None
            }
    
    @staticmethod
    async def generate_code_batch(
        db: AsyncSession,
        count: int,
        pattern: Optional[str] = None
    ) -> List[str]:
        """
        Generate a batch of available employee codes
        
        Args:
            db: Database session
            count: Number of codes to generate (max 100)
            pattern: Optional code pattern
            
        Returns:
            List of available employee codes
            
        Raises:
            ValidationError: If count exceeds 100
        """
        if count > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate more than 100 codes at once"
            )
        
        generated_codes = []
        
        # Get the first code
        next_code_info = await EmployeeService.get_next_available_code(db, pattern)
        current_code = next_code_info["code"]
        detected_pattern = next_code_info["pattern"]
        
        for i in range(count):
            # Check if code is available
            availability = await EmployeeService.check_code_availability(db, current_code)
            
            if availability["available"]:
                generated_codes.append(current_code)
            
            # Generate next code
            if detected_pattern == "sequential_numeric":
                try:
                    next_num = int(current_code) + 1
                    current_code = str(next_num).zfill(len(current_code))
                except ValueError:
                    break
            else:
                # For other patterns, increment the trailing number
                import re
                match = re.search(r'(\d+)$', current_code)
                if match:
                    number = int(match.group(1))
                    prefix = current_code[:match.start()]
                    next_number = str(number + 1).zfill(len(match.group(1)))
                    current_code = f"{prefix}{next_number}"
                else:
                    break
        
        logger.info(f"Generated {len(generated_codes)} employee codes")
        return generated_codes
    
    @staticmethod
    def validate_code_format(code: str, pattern: Optional[str] = None) -> bool:
        """
        Validate employee code against format pattern
        
        Args:
            code: Employee code to validate
            pattern: Optional pattern to validate against
            
        Returns:
            True if valid, False otherwise
        """
        import re
        
        # Basic validation: alphanumeric and hyphens, max 20 characters
        if not code or len(code) > 20:
            return False
        
        if not re.match(r'^[A-Za-z0-9-]+$', code):
            return False
        
        # If no pattern specified, basic validation is enough
        if not pattern:
            return True
        
        # Validate against specific patterns
        if pattern == "sequential_numeric":
            return code.isdigit()
        elif pattern == "prefix_year_seq":
            return bool(re.match(r'^[A-Z]+-\d{4}-\d+$', code))
        elif pattern == "prefix_seq":
            return bool(re.match(r'^[A-Z]+-\d+$', code))
        
        return True
