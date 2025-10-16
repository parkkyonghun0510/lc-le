"""
Employee Assignment Service
Handles business logic for assigning employees to applications
"""
from uuid import UUID
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_
from app.models import (
    Employee, 
    ApplicationEmployeeAssignment, 
    CustomerApplication,
    Branch
)
from app.schemas import EmployeeAssignmentCreate, EmployeeAssignmentUpdate, AssignmentRole
from app.core.logging import get_logger
from app.core.exceptions import ValidationError, ErrorCode
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


class EmployeeAssignmentService:
    """Service for managing employee assignments to applications"""
    
    @staticmethod
    async def assign_employee(
        db: AsyncSession,
        application_id: UUID,
        employee_id: UUID,
        role: AssignmentRole,
        assigned_by: UUID,
        notes: Optional[str] = None
    ) -> ApplicationEmployeeAssignment:
        """
        Assign an employee to an application
        
        Validates:
        - Employee exists and is active
        - Application exists
        - Employee belongs to the same branch as the application
        - No duplicate assignment exists
        
        Args:
            db: Database session
            application_id: Application UUID
            employee_id: Employee UUID
            role: Assignment role
            assigned_by: UUID of user making the assignment
            notes: Optional notes about the assignment
            
        Returns:
            Created ApplicationEmployeeAssignment object
            
        Raises:
            NotFoundError: If employee or application not found
            ValidationError: If employee is inactive or branch mismatch
            ConflictError: If duplicate assignment exists
        """
        # Get employee
        employee_query = await db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        employee = employee_query.scalar_one_or_none()
        
        if not employee:
            logger.warning(f"Attempted to assign non-existent employee: {employee_id}")
            raise NotFoundError(f"Employee not found")
        
        # Check if employee is active
        if not employee.is_active:
            logger.warning(f"Attempted to assign inactive employee: {employee_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign inactive employee to application"
            )
        
        # Get application
        application_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == application_id)
        )
        application = application_query.scalar_one_or_none()
        
        if not application:
            logger.warning(f"Attempted to assign employee to non-existent application: {application_id}")
            raise NotFoundError(f"Application not found")
        
        # Validate branch match
        if employee.branch_id and application.user_id:
            # Get application creator's branch
            from app.models import User
            user_query = await db.execute(
                select(User).where(User.id == application.user_id)
            )
            user = user_query.scalar_one_or_none()
            
            if user and user.branch_id and employee.branch_id != user.branch_id:
                logger.warning(
                    f"Branch mismatch: employee {employee_id} (branch {employee.branch_id}) "
                    f"vs application {application_id} (user branch {user.branch_id})"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee must belong to the same branch as the application"
                )
        
        # Check for duplicate assignment
        existing_assignment_query = await db.execute(
            select(ApplicationEmployeeAssignment).where(
                and_(
                    ApplicationEmployeeAssignment.application_id == application_id,
                    ApplicationEmployeeAssignment.employee_id == employee_id,
                    ApplicationEmployeeAssignment.assignment_role == role.value,
                    ApplicationEmployeeAssignment.is_active == True
                )
            )
        )
        existing_assignment = existing_assignment_query.scalar_one_or_none()
        
        if existing_assignment:
            logger.warning(
                f"Duplicate assignment: employee {employee_id} already assigned to "
                f"application {application_id} as {role.value}"
            )
            raise ConflictError(
                f"Employee already assigned to this application with this role"
            )
        
        # Create assignment
        assignment = ApplicationEmployeeAssignment(
            application_id=application_id,
            employee_id=employee_id,
            assignment_role=role.value,
            assigned_by=assigned_by,
            is_active=True,
            notes=notes
        )
        
        db.add(assignment)
        await db.flush()
        await db.refresh(assignment)
        await db.commit()
        
        logger.info(
            f"Assigned employee {employee_id} to application {application_id} "
            f"as {role.value} by user {assigned_by}"
        )
        return assignment
    
    @staticmethod
    async def get_application_assignments(
        db: AsyncSession,
        application_id: UUID,
        active_only: bool = True
    ) -> List[ApplicationEmployeeAssignment]:
        """
        Get all employee assignments for an application
        
        Args:
            db: Database session
            application_id: Application UUID
            active_only: Whether to return only active assignments
            
        Returns:
            List of ApplicationEmployeeAssignment objects
        """
        query = select(ApplicationEmployeeAssignment).where(
            ApplicationEmployeeAssignment.application_id == application_id
        ).options(
            selectinload(ApplicationEmployeeAssignment.employee).selectinload(Employee.department),
            selectinload(ApplicationEmployeeAssignment.employee).selectinload(Employee.branch),
            selectinload(ApplicationEmployeeAssignment.employee).selectinload(Employee.linked_user),
            selectinload(ApplicationEmployeeAssignment.assigner)
        )
        
        if active_only:
            query = query.where(ApplicationEmployeeAssignment.is_active == True)
        
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        logger.debug(f"Retrieved {len(assignments)} assignments for application {application_id}")
        return list(assignments)
    
    @staticmethod
    async def get_employee_assignments(
        db: AsyncSession,
        employee_id: UUID,
        active_only: bool = True
    ) -> List[ApplicationEmployeeAssignment]:
        """
        Get all assignments for an employee
        
        Args:
            db: Database session
            employee_id: Employee UUID
            active_only: Whether to return only active assignments
            
        Returns:
            List of ApplicationEmployeeAssignment objects
        """
        query = select(ApplicationEmployeeAssignment).where(
            ApplicationEmployeeAssignment.employee_id == employee_id
        ).options(
            selectinload(ApplicationEmployeeAssignment.application),
            selectinload(ApplicationEmployeeAssignment.employee).selectinload(Employee.department),
            selectinload(ApplicationEmployeeAssignment.employee).selectinload(Employee.branch),
            selectinload(ApplicationEmployeeAssignment.employee).selectinload(Employee.linked_user),
            selectinload(ApplicationEmployeeAssignment.assigner)
        )
        
        if active_only:
            query = query.where(ApplicationEmployeeAssignment.is_active == True)
        
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        logger.debug(f"Retrieved {len(assignments)} assignments for employee {employee_id}")
        return list(assignments)
    
    @staticmethod
    async def update_assignment(
        db: AsyncSession,
        assignment_id: UUID,
        assignment_data: EmployeeAssignmentUpdate
    ) -> ApplicationEmployeeAssignment:
        """
        Update an employee assignment
        
        Args:
            db: Database session
            assignment_id: Assignment UUID
            assignment_data: Assignment update data
            
        Returns:
            Updated ApplicationEmployeeAssignment object
            
        Raises:
            NotFoundError: If assignment not found
        """
        # Get assignment
        assignment_query = await db.execute(
            select(ApplicationEmployeeAssignment)
            .where(ApplicationEmployeeAssignment.id == assignment_id)
            .options(
                selectinload(ApplicationEmployeeAssignment.employee),
                selectinload(ApplicationEmployeeAssignment.application)
            )
        )
        assignment = assignment_query.scalar_one_or_none()
        
        if not assignment:
            logger.warning(f"Attempted to update non-existent assignment: {assignment_id}")
            raise NotFoundError(f"Assignment not found")
        
        # Update fields
        update_data = assignment_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'assignment_role' and value:
                setattr(assignment, field, value.value)
            else:
                setattr(assignment, field, value)
        
        await db.flush()
        await db.refresh(assignment)
        await db.commit()
        
        logger.info(f"Updated assignment {assignment_id}")
        return assignment
    
    @staticmethod
    async def remove_assignment(
        db: AsyncSession,
        assignment_id: UUID
    ) -> None:
        """
        Remove an employee assignment (soft delete)
        
        Args:
            db: Database session
            assignment_id: Assignment UUID
            
        Raises:
            NotFoundError: If assignment not found
        """
        # Get assignment
        assignment_query = await db.execute(
            select(ApplicationEmployeeAssignment).where(
                ApplicationEmployeeAssignment.id == assignment_id
            )
        )
        assignment = assignment_query.scalar_one_or_none()
        
        if not assignment:
            logger.warning(f"Attempted to remove non-existent assignment: {assignment_id}")
            raise NotFoundError(f"Assignment not found")
        
        # Soft delete by setting is_active to False
        assignment.is_active = False
        
        await db.flush()
        await db.commit()
        
        logger.info(f"Removed assignment {assignment_id} (soft delete)")
    
    @staticmethod
    async def migrate_portfolio_officer_name(
        db: AsyncSession,
        application_id: UUID,
        migrated_by: UUID
    ) -> Optional[ApplicationEmployeeAssignment]:
        """
        Migrate free-text portfolio_officer_name to employee assignment
        
        Strategy:
        1. Get application's portfolio_officer_name
        2. Try to match name to existing employees using fuzzy matching
        3. If match found, create assignment with role='primary_officer'
        4. Mark application as migrated
        
        Args:
            db: Database session
            application_id: Application UUID
            migrated_by: UUID of user performing migration
            
        Returns:
            Created ApplicationEmployeeAssignment or None if no match found
            
        Raises:
            NotFoundError: If application not found
        """
        # Get application
        application_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == application_id)
        )
        application = application_query.scalar_one_or_none()
        
        if not application:
            logger.warning(f"Attempted to migrate non-existent application: {application_id}")
            raise NotFoundError(f"Application not found")
        
        # Check if already migrated
        if application.portfolio_officer_migrated:
            logger.info(f"Application {application_id} already migrated")
            return None
        
        # Check if portfolio_officer_name exists
        if not application.portfolio_officer_name:
            logger.info(f"Application {application_id} has no portfolio_officer_name to migrate")
            application.portfolio_officer_migrated = True
            await db.commit()
            return None
        
        portfolio_name = application.portfolio_officer_name.strip()
        
        # Try to find matching employee
        # Search in both Khmer and Latin names
        search_pattern = f"%{portfolio_name}%"
        employee_query = await db.execute(
            select(Employee).where(
                and_(
                    or_(
                        Employee.full_name_khmer.ilike(search_pattern),
                        Employee.full_name_latin.ilike(search_pattern)
                    ),
                    Employee.is_active == True
                )
            ).limit(1)
        )
        employee = employee_query.scalar_one_or_none()
        
        if not employee:
            logger.warning(
                f"No matching employee found for portfolio_officer_name: '{portfolio_name}' "
                f"in application {application_id}"
            )
            # Mark as migrated even if no match found to avoid repeated attempts
            application.portfolio_officer_migrated = True
            await db.commit()
            return None
        
        # Check if assignment already exists
        existing_assignment_query = await db.execute(
            select(ApplicationEmployeeAssignment).where(
                and_(
                    ApplicationEmployeeAssignment.application_id == application_id,
                    ApplicationEmployeeAssignment.employee_id == employee.id,
                    ApplicationEmployeeAssignment.assignment_role == AssignmentRole.PRIMARY_OFFICER.value,
                    ApplicationEmployeeAssignment.is_active == True
                )
            )
        )
        existing_assignment = existing_assignment_query.scalar_one_or_none()
        
        if existing_assignment:
            logger.info(f"Assignment already exists for application {application_id}")
            application.portfolio_officer_migrated = True
            await db.commit()
            return existing_assignment
        
        # Create assignment
        assignment = ApplicationEmployeeAssignment(
            application_id=application_id,
            employee_id=employee.id,
            assignment_role=AssignmentRole.PRIMARY_OFFICER.value,
            assigned_by=migrated_by,
            is_active=True,
            notes=f"Migrated from portfolio_officer_name: {portfolio_name}"
        )
        
        db.add(assignment)
        
        # Mark application as migrated
        application.portfolio_officer_migrated = True
        
        await db.flush()
        await db.refresh(assignment)
        await db.commit()
        
        logger.info(
            f"Migrated portfolio_officer_name '{portfolio_name}' to employee {employee.id} "
            f"for application {application_id}"
        )
        return assignment
