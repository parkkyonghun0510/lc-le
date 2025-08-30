from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, desc
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, CustomerApplication, Department, Branch, File
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard statistics
    """
    try:
        # Application statistics
        app_stats_query = select(
            func.count(CustomerApplication.id).label('total'),
            func.count(CustomerApplication.id).filter(CustomerApplication.status == 'draft').label('draft'),
            func.count(CustomerApplication.id).filter(CustomerApplication.status == 'submitted').label('submitted'),
            func.count(CustomerApplication.id).filter(CustomerApplication.status == 'under_review').label('under_review'),
            func.count(CustomerApplication.id).filter(CustomerApplication.status == 'approved').label('approved'),
            func.count(CustomerApplication.id).filter(CustomerApplication.status == 'rejected').label('rejected'),
        )
        
        # Filter by user role
        if str(current_user.role) == 'officer':
            app_stats_query = app_stats_query.where(CustomerApplication.user_id == current_user.id)
        elif str(current_user.role) == 'manager' and current_user.department_id is not None:
            # Manager can see applications from their department
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            app_stats_query = app_stats_query.where(CustomerApplication.user_id.in_(dept_user_ids))
        
        app_stats_result = await db.execute(app_stats_query)
        app_stats = app_stats_result.first()

        # User statistics
        user_stats_query = select(
            func.count(User.id).label('total'),
            func.count(User.id).filter(User.status == 'active').label('active'),
            func.count(User.id).filter(User.status == 'inactive').label('inactive'),
            func.count(User.id).filter(User.role == 'admin').label('admins'),
            func.count(User.id).filter(User.role == 'manager').label('managers'),
            func.count(User.id).filter(User.role == 'officer').label('officers'),
            func.count(User.id).filter(User.role == 'viewer').label('viewers'),
        )
        
        # Filter by user role
        if str(current_user.role) == 'manager' and current_user.department_id is not None:
            user_stats_query = user_stats_query.where(User.department_id == current_user.department_id)
        elif str(current_user.role) == 'officer':
            # Officers can only see their own stats
            user_stats_query = user_stats_query.where(User.id == current_user.id)
        
        user_stats_result = await db.execute(user_stats_query)
        user_stats = user_stats_result.first()

        # Department statistics
        dept_stats_query = select(
            func.count(Department.id).label('total'),
            func.count(Department.id).filter(Department.is_active == True).label('active'),
        )
        dept_stats_result = await db.execute(dept_stats_query)
        dept_stats = dept_stats_result.first()

        # Branch statistics
        branch_stats_query = select(
            func.count(Branch.id).label('total'),
            func.count(Branch.id).filter(Branch.is_active == True).label('active'),
        )
        branch_stats_result = await db.execute(branch_stats_query)
        branch_stats = branch_stats_result.first()

        # File statistics
        file_stats_query = select(
            func.count(File.id).label('total'),
            func.sum(File.file_size).label('total_size'),
        )
        
        # Filter files by user role
        if str(current_user.role) == 'officer':
            file_stats_query = file_stats_query.where(File.uploaded_by == current_user.id)
        elif str(current_user.role) == 'manager' and current_user.department_id is not None:
            # Manager can see files from their department users
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            file_stats_query = file_stats_query.where(File.uploaded_by.in_(dept_user_ids))
        
        file_stats_result = await db.execute(file_stats_query)
        file_stats = file_stats_result.first()

        # Handle potential None values
        app_stats_total = getattr(app_stats, 'total', 0) if app_stats else 0
        app_stats_draft = getattr(app_stats, 'draft', 0) if app_stats else 0
        app_stats_submitted = getattr(app_stats, 'submitted', 0) if app_stats else 0
        app_stats_under_review = getattr(app_stats, 'under_review', 0) if app_stats else 0
        app_stats_approved = getattr(app_stats, 'approved', 0) if app_stats else 0
        app_stats_rejected = getattr(app_stats, 'rejected', 0) if app_stats else 0
        
        user_stats_total = getattr(user_stats, 'total', 0) if user_stats else 0
        user_stats_active = getattr(user_stats, 'active', 0) if user_stats else 0
        user_stats_inactive = getattr(user_stats, 'inactive', 0) if user_stats else 0
        user_stats_admins = getattr(user_stats, 'admins', 0) if user_stats else 0
        user_stats_managers = getattr(user_stats, 'managers', 0) if user_stats else 0
        user_stats_officers = getattr(user_stats, 'officers', 0) if user_stats else 0
        user_stats_viewers = getattr(user_stats, 'viewers', 0) if user_stats else 0
        
        dept_stats_total = getattr(dept_stats, 'total', 0) if dept_stats else 0
        dept_stats_active = getattr(dept_stats, 'active', 0) if dept_stats else 0
        
        branch_stats_total = getattr(branch_stats, 'total', 0) if branch_stats else 0
        branch_stats_active = getattr(branch_stats, 'active', 0) if branch_stats else 0
        
        file_stats_total = getattr(file_stats, 'total', 0) if file_stats else 0
        file_stats_total_size = getattr(file_stats, 'total_size', 0) if file_stats else 0

        return {
            "applications": {
                "total": app_stats_total or 0,
                "draft": app_stats_draft or 0,
                "submitted": app_stats_submitted or 0,
                "pending": (app_stats_submitted or 0) + (app_stats_under_review or 0),
                "under_review": app_stats_under_review or 0,
                "approved": app_stats_approved or 0,
                "rejected": app_stats_rejected or 0,
            },
            "users": {
                "total": user_stats_total or 0,
                "active": user_stats_active or 0,
                "inactive": user_stats_inactive or 0,
                "admins": user_stats_admins or 0,
                "managers": user_stats_managers or 0,
                "officers": user_stats_officers or 0,
                "viewers": user_stats_viewers or 0,
            },
            "departments": {
                "total": dept_stats_total or 0,
                "active": dept_stats_active or 0,
            },
            "branches": {
                "total": branch_stats_total or 0,
                "active": branch_stats_active or 0,
            },
            "files": {
                "total": file_stats_total or 0,
                "total_size": int(file_stats_total_size or 0),
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard statistics: {str(e)}"
        )

@router.get("/recent-applications")
async def get_recent_applications(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get recent applications for dashboard
    """
    try:
        query = select(CustomerApplication).order_by(desc(CustomerApplication.created_at)).limit(limit)
        
        # Filter by user role
        if str(current_user.role) == 'officer':
            query = query.where(CustomerApplication.user_id == current_user.id)
        elif str(current_user.role) == 'manager' and current_user.department_id is not None:
            # Manager can see applications from their department
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            query = query.where(CustomerApplication.user_id.in_(dept_user_ids))
        
        result = await db.execute(query)
        applications = result.scalars().all()
        
        return [
            {
                "id": str(app.id),
                "full_name_latin": app.full_name_latin,
                "full_name_khmer": app.full_name_khmer,
                "requested_amount": float(str(app.requested_amount)) if app.requested_amount is not None else None,
                "status": app.status,
                "created_at": app.created_at.isoformat(),
                "user_id": str(app.user_id),
            }
            for app in applications
        ]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recent applications: {str(e)}"
        )

@router.get("/activity-timeline")
async def get_activity_timeline(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get activity timeline for dashboard
    """
    try:
        # Get date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get applications created in the date range
        app_query = select(CustomerApplication).where(
            and_(
                CustomerApplication.created_at >= start_date,
                CustomerApplication.created_at <= end_date
            )
        ).order_by(desc(CustomerApplication.created_at))
        
        # Filter by user role
        if str(current_user.role) == 'officer':
            app_query = app_query.where(CustomerApplication.user_id == current_user.id)
        elif str(current_user.role) == 'manager' and current_user.department_id is not None:
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            app_query = app_query.where(CustomerApplication.user_id.in_(dept_user_ids))
        
        app_result = await db.execute(app_query)
        applications = app_result.scalars().all()
        
        # Get users created in the date range (admin/manager only)
        users = []
        if str(current_user.role) in ['admin', 'manager']:
            user_query = select(User).where(
                and_(
                    User.created_at >= start_date,
                    User.created_at <= end_date
                )
            ).order_by(desc(User.created_at))
            
            if str(current_user.role) == 'manager' and current_user.department_id is not None:
                user_query = user_query.where(User.department_id == current_user.department_id)
            
            user_result = await db.execute(user_query)
            users = user_result.scalars().all()
        
        # Combine activities
        activities = []
        
        for app in applications:
            # Handle Decimal conversion properly
            requested_amount = 0.0
            if app.requested_amount is not None:
                requested_amount = float(str(app.requested_amount))
                
            activities.append({
                "id": str(app.id),
                "type": "application",
                "action": "created",
                "title": f"New application from {app.full_name_latin or app.full_name_khmer or 'Unknown'}",
                "description": f"Loan application for ${requested_amount:,.2f}",
                "status": app.status,
                "timestamp": app.created_at.isoformat(),
                "user_id": str(app.user_id),
            })
        
        for user in users:
            activities.append({
                "id": str(user.id),
                "type": "user",
                "action": "created",
                "title": f"New user: {user.first_name} {user.last_name}",
                "description": f"Role: {user.role.title()}",
                "status": user.status,
                "timestamp": user.created_at.isoformat(),
                "user_id": str(user.id),
            })
        
        # Sort by timestamp (most recent first)
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return activities[:20]  # Return top 20 activities
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching activity timeline: {str(e)}"
        )

@router.get("/performance-metrics")
async def get_performance_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get performance metrics for dashboard
    """
    try:
        # Calculate metrics for the last 30 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        # Applications processed in last 30 days
        processed_query = select(func.count(CustomerApplication.id)).where(
            and_(
                CustomerApplication.updated_at >= start_date,
                CustomerApplication.status.in_(['approved', 'rejected'])
            )
        )
        
        # Filter by user role
        if str(current_user.role) == 'officer':
            processed_query = processed_query.where(CustomerApplication.user_id == current_user.id)
        elif str(current_user.role) == 'manager' and current_user.department_id is not None:
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            processed_query = processed_query.where(CustomerApplication.user_id.in_(dept_user_ids))
        
        processed_result = await db.execute(processed_query)
        processed_count = processed_result.scalar() or 0
        
        # Average processing time (mock calculation)
        avg_processing_time = 5.2  # days (this would be calculated from actual data)
        
        # Approval rate
        approved_query = select(func.count(CustomerApplication.id)).where(
            and_(
                CustomerApplication.updated_at >= start_date,
                CustomerApplication.status == 'approved'
            )
        )
        
        # Define dept_user_ids for manager role
        dept_user_ids = []
        if str(current_user.role) == 'manager' and current_user.department_id is not None:
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
        
        if str(current_user.role) == 'officer':
            approved_query = approved_query.where(CustomerApplication.user_id == current_user.id)
        elif str(current_user.role) == 'manager' and current_user.department_id is not None:
            approved_query = approved_query.where(CustomerApplication.user_id.in_(dept_user_ids))
        
        approved_result = await db.execute(approved_query)
        approved_count = approved_result.scalar() or 0
        
        approval_rate = (approved_count / processed_count * 100) if processed_count > 0 else 0
        
        return {
            "applications_processed_30d": processed_count,
            "average_processing_time_days": avg_processing_time,
            "approval_rate_percentage": round(approval_rate, 1),
            "active_users_today": 0,  # This would require session tracking
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching performance metrics: {str(e)}"
        )