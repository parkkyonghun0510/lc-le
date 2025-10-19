"""
Employee Management Router

This router handles all employee-related operations including:
- Employee CRUD operations
- Employee assignments to applications
- Employee workload reporting
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.database import get_db
from app.models import User, Employee, ApplicationEmployeeAssignment, CustomerApplication
from app.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, PaginatedResponse,
    EmployeeAssignmentCreate, EmployeeAssignmentUpdate, EmployeeAssignmentResponse,
    NextCodeResponse, CodeAvailabilityResponse, GenerateCodesRequest, GeneratedCodesResponse
)
from app.routers.auth import get_current_user
from app.services.employee_service import EmployeeService
from app.services.employee_assignment_service import EmployeeAssignmentService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["employees"])


# ==================== HELPER FUNCTIONS ====================

def check_permission(current_user: User, required_roles: List[str], permission_name: str):
    """Check if user has required role for permission"""
    if current_user.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {permission_name} required"
        )


async def filter_by_branch(query, current_user: User, model_class):
    """Filter query by user's branch unless user is admin"""
    if current_user.role != "admin" and current_user.branch_id:
        query = query.where(model_class.branch_id == current_user.branch_id)
    return query


# ==================== EMPLOYEE CODE MANAGEMENT ENDPOINTS ====================

@router.get("/next-code", response_model=NextCodeResponse)
async def get_next_employee_code(
    pattern: Optional[str] = Query(None, description="Code pattern to follow"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the next available employee code.
    
    This endpoint analyzes existing employee codes and suggests the next available code
    following the detected or specified pattern.
    
    Requires: Authentication (any authenticated user)
    """
    try:
        result = await EmployeeService.get_next_available_code(db, pattern)
        logger.debug(f"Next employee code requested by user {current_user.id}: {result['code']}")
        return result
    except Exception as e:
        logger.error(f"Error getting next employee code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate next employee code"
        )


@router.get("/check-code/{code}", response_model=CodeAvailabilityResponse)
async def check_employee_code_availability(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if an employee code is available.
    
    Returns availability status and existing employee information if the code is taken.
    
    Requires: Authentication (any authenticated user)
    """
    try:
        result = await EmployeeService.check_code_availability(db, code)
        logger.debug(f"Code availability check for '{code}' by user {current_user.id}: {result['available']}")
        return result
    except Exception as e:
        logger.error(f"Error checking code availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check code availability"
        )


@router.post("/generate-codes", response_model=GeneratedCodesResponse)
async def generate_employee_codes(
    request: GenerateCodesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a batch of available employee codes.
    
    Useful for bulk employee imports. Maximum 100 codes per request.
    
    Requires: manage_employees permission (admin, manager roles)
    """
    check_permission(current_user, ["admin", "manager"], "manage_employees")
    
    try:
        codes = await EmployeeService.generate_code_batch(
            db=db,
            count=request.count,
            pattern=request.pattern
        )
        
        logger.info(f"Generated {len(codes)} employee codes for user {current_user.id}")
        
        return {
            "codes": codes,
            "count": len(codes),
            "expires_at": None  # Could implement reservation system in future
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating employee codes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate employee codes"
        )


# ==================== EMPLOYEE CRUD ENDPOINTS ====================

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new employee.
    
    Requires: manage_employees permission (admin, manager roles)
    
    Returns enhanced error response with suggested code if duplicate code is detected.
    """
    check_permission(current_user, ["admin", "manager"], "manage_employees")
    
    try:
        employee = await EmployeeService.create_employee(
            db=db,
            employee_data=employee_data,
            created_by=current_user.id
        )
        
        logger.info(f"Employee created: {employee.employee_code} by user {current_user.id}")
        return employee
        
    except HTTPException as e:
        # Enhanced error handling for duplicate employee code
        if e.status_code == status.HTTP_409_CONFLICT and "already exists" in str(e.detail):
            try:
                # Get next available code
                next_code_info = await EmployeeService.get_next_available_code(db)
                
                # Get existing employee with this code
                existing = await EmployeeService.get_employee_by_code(db, employee_data.employee_code)
                
                # Return enhanced error response
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": f"Employee with code '{employee_data.employee_code}' already exists",
                        "suggested_code": next_code_info["code"],
                        "existing_employee": {
                            "id": str(existing.id),
                            "full_name_khmer": existing.full_name_khmer,
                            "full_name_latin": existing.full_name_latin
                        } if existing else None
                    }
                )
            except HTTPException:
                raise
            except Exception as enhance_error:
                logger.error(f"Error enhancing duplicate error response: {enhance_error}")
                # Fall back to original error
                raise e
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating employee: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create employee"
        )


@router.get("/", response_model=PaginatedResponse)
async def list_employees(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    search: Optional[str] = Query(None, description="Search by name or employee code"),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    branch_id: Optional[UUID] = Query(None, description="Filter by branch"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List employees with pagination, search, and filters.
    
    Requires: Authentication (all authenticated users can view employees)
    Non-admin users only see employees from their branch.
    Regular users have read-only access for viewing portfolio officers, etc.
    """
    # Allow all authenticated users to view employees (read-only)
    # This is needed for application forms to show portfolio officers
    # check_permission(current_user, ["admin", "manager", "officer"], "view_employees")
    
    try:
        # Build base query
        query = select(Employee).options(
            selectinload(Employee.department),
            selectinload(Employee.branch),
            selectinload(Employee.linked_user)
        )
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Employee.full_name_khmer.ilike(search_term),
                    Employee.full_name_latin.ilike(search_term),
                    Employee.employee_code.ilike(search_term)
                )
            )
        
        if department_id:
            query = query.where(Employee.department_id == department_id)
        
        if branch_id:
            query = query.where(Employee.branch_id == branch_id)
        elif current_user.role != "admin" and current_user.branch_id:
            # Non-admin users only see employees from their branch
            query = query.where(Employee.branch_id == current_user.branch_id)
        
        if is_active is not None:
            query = query.where(Employee.is_active == is_active)
        
        # Get total count
        count_query = select(func.count()).select_from(Employee)
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    Employee.full_name_khmer.ilike(search_term),
                    Employee.full_name_latin.ilike(search_term),
                    Employee.employee_code.ilike(search_term)
                )
            )
        if department_id:
            count_query = count_query.where(Employee.department_id == department_id)
        if branch_id:
            count_query = count_query.where(Employee.branch_id == branch_id)
        elif current_user.role != "admin" and current_user.branch_id:
            count_query = count_query.where(Employee.branch_id == current_user.branch_id)
        if is_active is not None:
            count_query = count_query.where(Employee.is_active == is_active)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        query = query.offset((page - 1) * size).limit(size)
        query = query.order_by(Employee.created_at.desc())
        
        # Execute query
        result = await db.execute(query)
        employees = result.scalars().all()
        
        # Calculate assignment counts for each employee
        employee_responses = []
        for employee in employees:
            # Count active assignments
            assignment_count_query = select(func.count()).where(
                and_(
                    ApplicationEmployeeAssignment.employee_id == employee.id,
                    ApplicationEmployeeAssignment.is_active == True
                )
            )
            count_result = await db.execute(assignment_count_query)
            assignment_count = count_result.scalar()
            
            # Convert to response model
            employee_dict = {
                "id": employee.id,
                "employee_code": employee.employee_code,
                "full_name_khmer": employee.full_name_khmer,
                "full_name_latin": employee.full_name_latin,
                "phone_number": employee.phone_number,
                "email": employee.email,
                "position": employee.position,
                "department_id": employee.department_id,
                "branch_id": employee.branch_id,
                "user_id": employee.user_id,
                "is_active": employee.is_active,
                "notes": employee.notes,
                "created_at": employee.created_at,
                "updated_at": employee.updated_at,
                "department": employee.department,
                "branch": employee.branch,
                "linked_user": employee.linked_user,
                "assignment_count": assignment_count
            }
            employee_responses.append(EmployeeResponse.model_validate(employee_dict))
        
        return PaginatedResponse(
            items=employee_responses,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error listing employees: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list employees"
        )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single employee by ID.
    
    Requires: view_employees permission (admin, manager, officer roles)
    """
    check_permission(current_user, ["admin", "manager", "officer"], "view_employees")
    
    try:
        employee = await EmployeeService.get_employee_by_id(db, employee_id)
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Check branch access for non-admin users
        if current_user.role != "admin" and current_user.branch_id:
            if employee.branch_id != current_user.branch_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this employee"
                )
        
        # Get assignment count
        assignment_count_query = select(func.count()).where(
            and_(
                ApplicationEmployeeAssignment.employee_id == employee.id,
                ApplicationEmployeeAssignment.is_active == True
            )
        )
        count_result = await db.execute(assignment_count_query)
        assignment_count = count_result.scalar()
        
        # Convert to response
        employee_dict = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name_khmer": employee.full_name_khmer,
            "full_name_latin": employee.full_name_latin,
            "phone_number": employee.phone_number,
            "email": employee.email,
            "position": employee.position,
            "department_id": employee.department_id,
            "branch_id": employee.branch_id,
            "user_id": employee.user_id,
            "is_active": employee.is_active,
            "notes": employee.notes,
            "created_at": employee.created_at,
            "updated_at": employee.updated_at,
            "department": employee.department,
            "branch": employee.branch,
            "linked_user": employee.linked_user,
            "assignment_count": assignment_count
        }
        
        return EmployeeResponse.model_validate(employee_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee {employee_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get employee"
        )


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    employee_data: EmployeeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an employee.
    
    Requires: manage_employees permission (admin, manager roles)
    """
    check_permission(current_user, ["admin", "manager"], "manage_employees")
    
    try:
        employee = await EmployeeService.update_employee(
            db=db,
            employee_id=employee_id,
            employee_data=employee_data,
            updated_by=current_user.id
        )
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        logger.info(f"Employee updated: {employee.employee_code} by user {current_user.id}")
        
        # Get assignment count
        assignment_count_query = select(func.count()).where(
            and_(
                ApplicationEmployeeAssignment.employee_id == employee.id,
                ApplicationEmployeeAssignment.is_active == True
            )
        )
        count_result = await db.execute(assignment_count_query)
        assignment_count = count_result.scalar()
        
        # Convert to response
        employee_dict = {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name_khmer": employee.full_name_khmer,
            "full_name_latin": employee.full_name_latin,
            "phone_number": employee.phone_number,
            "email": employee.email,
            "position": employee.position,
            "department_id": employee.department_id,
            "branch_id": employee.branch_id,
            "user_id": employee.user_id,
            "is_active": employee.is_active,
            "notes": employee.notes,
            "created_at": employee.created_at,
            "updated_at": employee.updated_at,
            "department": employee.department,
            "branch": employee.branch,
            "linked_user": employee.linked_user,
            "assignment_count": assignment_count
        }
        
        return EmployeeResponse.model_validate(employee_dict)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employee {employee_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update employee"
        )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Soft delete (deactivate) an employee.
    
    Requires: manage_employees permission (admin, manager roles)
    """
    check_permission(current_user, ["admin", "manager"], "manage_employees")
    
    try:
        success = await EmployeeService.deactivate_employee(db, employee_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        logger.info(f"Employee deactivated: {employee_id} by user {current_user.id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating employee {employee_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate employee"
        )



# ==================== EMPLOYEE ASSIGNMENT ENDPOINTS ====================

@router.post("/assignments", response_model=EmployeeAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_employee_to_application(
    assignment_data: EmployeeAssignmentCreate,
    application_id: UUID = Query(..., description="Application ID to assign employee to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign an employee to an application.
    
    Requires: assign_employees permission (admin, manager, officer roles)
    
    Validations:
    - Employee must exist and be active
    - Employee and application must be in the same branch
    - No duplicate assignments (same employee, application, role)
    """
    check_permission(current_user, ["admin", "manager", "officer"], "assign_employees")
    
    try:
        # Validate employee exists and is active
        employee = await EmployeeService.get_employee_by_id(db, assignment_data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        if not employee.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign inactive employee to application"
            )
        
        # Validate application exists
        app_query = select(CustomerApplication).where(CustomerApplication.id == application_id)
        app_result = await db.execute(app_query)
        application = app_result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        # Validate branch match
        if employee.branch_id and application.branch_id:
            if employee.branch_id != application.branch_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee and application must be in the same branch"
                )
        
        # Check for duplicate assignment
        duplicate_query = select(ApplicationEmployeeAssignment).where(
            and_(
                ApplicationEmployeeAssignment.application_id == application_id,
                ApplicationEmployeeAssignment.employee_id == assignment_data.employee_id,
                ApplicationEmployeeAssignment.assignment_role == assignment_data.assignment_role,
                ApplicationEmployeeAssignment.is_active == True
            )
        )
        duplicate_result = await db.execute(duplicate_query)
        duplicate = duplicate_result.scalar_one_or_none()
        
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee already assigned to this application with this role"
            )
        
        # Create assignment
        assignment = await EmployeeAssignmentService.assign_employee(
            db=db,
            application_id=application_id,
            employee_id=assignment_data.employee_id,
            role=assignment_data.assignment_role,
            assigned_by=current_user.id,
            notes=assignment_data.notes
        )
        
        logger.info(f"Employee {assignment_data.employee_id} assigned to application {application_id} by user {current_user.id}")
        return assignment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning employee to application: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign employee to application"
        )


@router.get("/assignments/application/{application_id}", response_model=List[EmployeeAssignmentResponse])
async def get_application_assignments(
    application_id: UUID,
    active_only: bool = Query(True, description="Only return active assignments"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all employee assignments for an application.
    
    Requires: view_employees permission (admin, manager, officer roles)
    """
    check_permission(current_user, ["admin", "manager", "officer"], "view_employees")
    
    try:
        assignments = await EmployeeAssignmentService.get_application_assignments(
            db=db,
            application_id=application_id,
            active_only=active_only
        )
        
        return assignments
        
    except Exception as e:
        logger.error(f"Error getting application assignments for {application_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get application assignments"
        )


@router.get("/assignments/employee/{employee_id}", response_model=List[EmployeeAssignmentResponse])
async def get_employee_assignments(
    employee_id: UUID,
    active_only: bool = Query(True, description="Only return active assignments"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all assignments for an employee.
    
    Requires: view_employees permission (admin, manager, officer roles)
    """
    check_permission(current_user, ["admin", "manager", "officer"], "view_employees")
    
    try:
        # Check if employee exists and user has access
        employee = await EmployeeService.get_employee_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Check branch access for non-admin users
        if current_user.role != "admin" and current_user.branch_id:
            if employee.branch_id != current_user.branch_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this employee's assignments"
                )
        
        assignments = await EmployeeAssignmentService.get_employee_assignments(
            db=db,
            employee_id=employee_id,
            active_only=active_only
        )
        
        return assignments
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee assignments for {employee_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get employee assignments"
        )


@router.patch("/assignments/{assignment_id}", response_model=EmployeeAssignmentResponse)
async def update_assignment(
    assignment_id: UUID,
    assignment_data: EmployeeAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an employee assignment.
    
    Requires: assign_employees permission (admin, manager, officer roles)
    """
    check_permission(current_user, ["admin", "manager", "officer"], "assign_employees")
    
    try:
        assignment = await EmployeeAssignmentService.update_assignment(
            db=db,
            assignment_id=assignment_id,
            assignment_data=assignment_data
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        logger.info(f"Assignment {assignment_id} updated by user {current_user.id}")
        return assignment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating assignment {assignment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update assignment"
        )


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_assignment(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove (soft delete) an employee assignment.
    
    Requires: assign_employees permission (admin, manager, officer roles)
    """
    check_permission(current_user, ["admin", "manager", "officer"], "assign_employees")
    
    try:
        success = await EmployeeAssignmentService.remove_assignment(db, assignment_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        logger.info(f"Assignment {assignment_id} removed by user {current_user.id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing assignment {assignment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove assignment"
        )



# ==================== EMPLOYEE REPORTING ENDPOINTS ====================

@router.get("/{employee_id}/workload")
async def get_employee_workload(
    employee_id: UUID,
    status_filter: Optional[str] = Query(None, description="Filter by application status"),
    date_from: Optional[date] = Query(None, description="Start date for filtering"),
    date_to: Optional[date] = Query(None, description="End date for filtering"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get workload statistics for an employee.
    
    Requires: view_employee_reports permission (admin, manager roles)
    
    Returns assignment counts grouped by application status.
    """
    check_permission(current_user, ["admin", "manager"], "view_employee_reports")
    
    try:
        # Check if employee exists
        employee = await EmployeeService.get_employee_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Check branch access for non-admin users
        if current_user.role != "admin" and current_user.branch_id:
            if employee.branch_id != current_user.branch_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this employee's workload"
                )
        
        workload = await EmployeeService.get_employee_workload(
            db=db,
            employee_id=employee_id,
            status_filter=status_filter,
            date_from=date_from,
            date_to=date_to
        )
        
        return workload
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee workload for {employee_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get employee workload"
        )


@router.get("/reports/workload-summary")
async def get_workload_summary(
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    branch_id: Optional[UUID] = Query(None, description="Filter by branch"),
    status_filter: Optional[str] = Query(None, description="Filter by application status"),
    date_from: Optional[date] = Query(None, description="Start date for filtering"),
    date_to: Optional[date] = Query(None, description="End date for filtering"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get workload summary for all employees.
    
    Requires: view_employee_reports permission (admin, manager roles)
    
    Returns assignment counts grouped by employee and status.
    """
    check_permission(current_user, ["admin", "manager"], "view_employee_reports")
    
    try:
        # Build query for employees
        employee_query = select(Employee).options(
            selectinload(Employee.department),
            selectinload(Employee.branch)
        ).where(Employee.is_active == True)
        
        # Apply filters
        if department_id:
            employee_query = employee_query.where(Employee.department_id == department_id)
        
        if branch_id:
            employee_query = employee_query.where(Employee.branch_id == branch_id)
        elif current_user.role != "admin" and current_user.branch_id:
            # Non-admin users only see employees from their branch
            employee_query = employee_query.where(Employee.branch_id == current_user.branch_id)
        
        # Get employees
        employee_result = await db.execute(employee_query)
        employees = employee_result.scalars().all()
        
        # Get workload for each employee
        workload_summary = []
        for employee in employees:
            workload = await EmployeeService.get_employee_workload(
                db=db,
                employee_id=employee.id,
                status_filter=status_filter,
                date_from=date_from,
                date_to=date_to
            )
            
            workload_summary.append({
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "full_name_khmer": employee.full_name_khmer,
                "full_name_latin": employee.full_name_latin,
                "position": employee.position,
                "department": {
                    "id": employee.department.id,
                    "name": employee.department.name
                } if employee.department else None,
                "branch": {
                    "id": employee.branch.id,
                    "name": employee.branch.name
                } if employee.branch else None,
                "workload": workload
            })
        
        return {
            "summary": workload_summary,
            "total_employees": len(employees),
            "filters": {
                "department_id": str(department_id) if department_id else None,
                "branch_id": str(branch_id) if branch_id else None,
                "status_filter": status_filter,
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workload summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get workload summary"
        )
