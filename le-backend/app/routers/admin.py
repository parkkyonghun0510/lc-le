"""
Admin Router
Handles administrative operations including employee migration
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from typing import Dict, Any, List
from uuid import UUID
import asyncio
import subprocess
import sys
from pathlib import Path

from app.database import get_db
from app.models import User, CustomerApplication, ApplicationEmployeeAssignment, Employee
from app.routers.auth import get_current_user
from app.core.logging import get_logger
from pydantic import BaseModel

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


class MigrationStatusResponse(BaseModel):
    """Response model for migration status"""
    total_applications: int
    migrated_applications: int
    pending_applications: int
    total_employees: int
    active_employees: int


class MigrationResultResponse(BaseModel):
    """Response model for migration execution result"""
    success: bool
    message: str
    report: Dict[str, Any]


class UnmatchedNameResponse(BaseModel):
    """Response model for unmatched portfolio officer names"""
    application_id: str
    portfolio_officer_name: str
    created_at: str


class ManualMatchRequest(BaseModel):
    """Request model for manual employee matching"""
    application_id: UUID
    employee_id: UUID





@router.get("/migration-status", response_model=MigrationStatusResponse)
async def get_migration_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current migration status statistics
    
    Returns counts of:
    - Total applications
    - Migrated applications
    - Pending applications
    - Total employees
    - Active employees
    """
    try:
        # Count total applications
        total_apps_query = await db.execute(
            select(func.count(CustomerApplication.id))
        )
        total_applications = total_apps_query.scalar()
        
        # Count migrated applications
        migrated_apps_query = await db.execute(
            select(func.count(CustomerApplication.id)).where(
                CustomerApplication.portfolio_officer_migrated == True
            )
        )
        migrated_applications = migrated_apps_query.scalar()
        
        # Count pending applications (have portfolio_officer_name but not migrated)
        pending_apps_query = await db.execute(
            select(func.count(CustomerApplication.id)).where(
                and_(
                    CustomerApplication.portfolio_officer_name.isnot(None),
                    CustomerApplication.portfolio_officer_name != '',
                    CustomerApplication.portfolio_officer_migrated == False
                )
            )
        )
        pending_applications = pending_apps_query.scalar()
        
        # Count total employees
        total_employees_query = await db.execute(
            select(func.count(Employee.id))
        )
        total_employees = total_employees_query.scalar()
        
        # Count active employees
        active_employees_query = await db.execute(
            select(func.count(Employee.id)).where(Employee.is_active == True)
        )
        active_employees = active_employees_query.scalar()
        
        logger.info(f"Migration status retrieved by admin {current_user.id}")
        
        return MigrationStatusResponse(
            total_applications=total_applications,
            migrated_applications=migrated_applications,
            pending_applications=pending_applications,
            total_employees=total_employees,
            active_employees=active_employees
        )
        
    except Exception as e:
        logger.error(f"Error getting migration status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve migration status"
        )


@router.post("/migrate-employees", response_model=MigrationResultResponse)
async def start_migration(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start the employee migration process
    
    This endpoint executes the migration script to convert portfolio_officer_name
    values to structured employee assignments.
    """
    try:
        logger.info(f"Migration started by admin {current_user.id}")
        
        # Get the path to the migration script
        script_path = Path(__file__).parent.parent.parent / "scripts" / "migrate_portfolio_officers.py"
        
        if not script_path.exists():
            logger.error(f"Migration script not found at {script_path}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Migration script not found"
            )
        
        # Execute the migration script
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        # Parse the output to extract report information
        # The script logs the report, so we'll parse it from stdout
        success = result.returncode == 0
        
        # Create a basic report from the output
        report = {
            "total": 0,
            "matched": 0,
            "created": 0,
            "failed": 0,
            "errors": []
        }
        
        # Try to parse the output for report data
        for line in result.stdout.split('\n'):
            if "Total applications processed:" in line:
                try:
                    report["total"] = int(line.split(':')[1].strip())
                except (ValueError, IndexError):
                    pass
            elif "Matched to existing employees:" in line:
                try:
                    report["matched"] = int(line.split(':')[1].strip())
                except (ValueError, IndexError):
                    pass
            elif "New employees created:" in line:
                try:
                    report["created"] = int(line.split(':')[1].strip())
                except (ValueError, IndexError):
                    pass
            elif "Failed migrations:" in line:
                try:
                    report["failed"] = int(line.split(':')[1].strip())
                except (ValueError, IndexError):
                    pass
        
        if not success:
            logger.error(f"Migration failed: {result.stderr}")
            report["errors"].append(result.stderr)
        
        logger.info(f"Migration completed with status: {success}")
        
        return MigrationResultResponse(
            success=success,
            message="Migration completed successfully" if success else "Migration failed",
            report=report
        )
        
    except subprocess.TimeoutExpired:
        logger.error("Migration script timed out")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Migration process timed out"
        )
    except Exception as e:
        logger.error(f"Error starting migration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start migration: {str(e)}"
        )


@router.get("/unmatched-names", response_model=List[UnmatchedNameResponse])
async def get_unmatched_names(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of applications with portfolio officer names that haven't been matched
    
    Returns applications that:
    - Have a portfolio_officer_name
    - Are not marked as migrated
    - Don't have any employee assignments
    """
    try:
        # Query for applications with portfolio_officer_name but no assignments
        query = await db.execute(
            select(CustomerApplication).where(
                and_(
                    CustomerApplication.portfolio_officer_name.isnot(None),
                    CustomerApplication.portfolio_officer_name != '',
                    CustomerApplication.portfolio_officer_migrated == False
                )
            ).limit(100)  # Limit to 100 for performance
        )
        applications = query.scalars().all()
        
        unmatched = []
        for app in applications:
            # Check if application has any assignments
            assignment_query = await db.execute(
                select(func.count(ApplicationEmployeeAssignment.id)).where(
                    ApplicationEmployeeAssignment.application_id == app.id
                )
            )
            assignment_count = assignment_query.scalar()
            
            if assignment_count == 0:
                unmatched.append(UnmatchedNameResponse(
                    application_id=str(app.id),
                    portfolio_officer_name=app.portfolio_officer_name,
                    created_at=app.created_at.isoformat()
                ))
        
        logger.info(f"Retrieved {len(unmatched)} unmatched names for admin {current_user.id}")
        return unmatched
        
    except Exception as e:
        logger.error(f"Error getting unmatched names: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve unmatched names"
        )


@router.post("/manual-match")
async def create_manual_match(
    request: ManualMatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually create an employee assignment for an application
    
    This allows admins to manually match portfolio officer names to employees
    when automatic matching fails.
    """
    try:
        from app.services.employee_assignment_service import EmployeeAssignmentService
        from app.schemas import AssignmentRole
        
        # Create the assignment
        assignment = await EmployeeAssignmentService.assign_employee(
            db=db,
            application_id=request.application_id,
            employee_id=request.employee_id,
            role=AssignmentRole.PRIMARY_OFFICER,
            assigned_by=current_user.id,
            notes="Manually matched by admin"
        )
        
        # Mark application as migrated
        app_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == request.application_id)
        )
        application = app_query.scalar_one_or_none()
        
        if application:
            application.portfolio_officer_migrated = True
            await db.commit()
        
        logger.info(
            f"Manual match created by admin {current_user.id}: "
            f"application {request.application_id} -> employee {request.employee_id}"
        )
        
        return {
            "success": True,
            "message": "Manual match created successfully",
            "assignment_id": str(assignment.id)
        }
        
    except Exception as e:
        logger.error(f"Error creating manual match: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create manual match: {str(e)}"
        )


@router.post("/revert-migration")
async def revert_migration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Revert the migration by:
    - Setting portfolio_officer_migrated to False for all applications
    - Deactivating all employee assignments created during migration
    
    WARNING: This is a destructive operation and should be used with caution.
    """
    try:
        logger.warning(f"Migration revert initiated by admin {current_user.id}")
        
        # Count assignments to be reverted
        assignment_count_query = await db.execute(
            select(func.count(ApplicationEmployeeAssignment.id)).where(
                ApplicationEmployeeAssignment.notes.like('%Migrated from portfolio_officer_name%')
            )
        )
        assignment_count = assignment_count_query.scalar()
        
        # Deactivate assignments created during migration
        assignments_query = await db.execute(
            select(ApplicationEmployeeAssignment).where(
                ApplicationEmployeeAssignment.notes.like('%Migrated from portfolio_officer_name%')
            )
        )
        assignments = assignments_query.scalars().all()
        
        for assignment in assignments:
            assignment.is_active = False
        
        # Reset portfolio_officer_migrated flag
        apps_query = await db.execute(
            select(CustomerApplication).where(
                CustomerApplication.portfolio_officer_migrated == True
            )
        )
        applications = apps_query.scalars().all()
        
        for app in applications:
            app.portfolio_officer_migrated = False
        
        await db.commit()
        
        logger.warning(
            f"Migration reverted by admin {current_user.id}: "
            f"{assignment_count} assignments deactivated, "
            f"{len(applications)} applications reset"
        )
        
        return {
            "success": True,
            "message": "Migration reverted successfully",
            "assignments_deactivated": assignment_count,
            "applications_reset": len(applications)
        }
        
    except Exception as e:
        logger.error(f"Error reverting migration: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revert migration: {str(e)}"
        )
