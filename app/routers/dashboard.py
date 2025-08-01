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
        if current_user.role == 'officer':
            app_stats_query = app_stats_query.where(CustomerApplication.user_id == current_user.id)
        elif current_user.role == 'manager' and current_user.department_id:
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
        if current_user.role == 'manager' and current_user.department_id:
            user_stats_query = user_stats_query.where(User.department_id == current_user.department_id)
        elif current_user.role == 'officer':
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
        if current_user.role == 'officer':
            file_stats_query = file_stats_query.where(File.uploaded_by == current_user.id)
        elif current_user.role == 'manager' and current_user.department_id:
            # Manager can see files from their department users
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            file_stats_query = file_stats_query.where(File.uploaded_by.in_(dept_user_ids))
        
        file_stats_result = await db.execute(file_stats_query)
        file_stats = file_stats_result.first()

        return {
            "applications": {
                "total": app_stats.total or 0,
                "draft": app_stats.draft or 0,
                "submitted": app_stats.submitted or 0,
                "pending": (app_stats.submitted or 0) + (app_stats.under_review or 0),
                "under_review": app_stats.under_review or 0,
                "approved": app_stats.approved or 0,
                "rejected": app_stats.rejected or 0,
            },
            "users": {
                "total": user_stats.total or 0,
                "active": user_stats.active or 0,
                "inactive": user_stats.inactive or 0,
                "admins": user_stats.admins or 0,
                "managers": user_stats.managers or 0,
                "officers": user_stats.officers or 0,
                "viewers": user_stats.viewers or 0,
            },
            "departments": {
                "total": dept_stats.total or 0,
                "active": dept_stats.active or 0,
            },
            "branches": {
                "total": branch_stats.total or 0,
                "active": branch_stats.active or 0,
            },
            "files": {
                "total": file_stats.total or 0,
                "total_size": file_stats.total_size or 0,
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
        if current_user.role == 'officer':
            query = query.where(CustomerApplication.user_id == current_user.id)
        elif current_user.role == 'manager' and current_user.department_id:
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
                "requested_amount": float(app.requested_amount) if app.requested_amount else None,
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
        if current_user.role == 'officer':
            app_query = app_query.where(CustomerApplication.user_id == current_user.id)
        elif current_user.role == 'manager' and current_user.department_id:
            dept_users_query = select(User.id).where(User.department_id == current_user.department_id)
            dept_users_result = await db.execute(dept_users_query)
            dept_user_ids = [row[0] for row in dept_users_result.fetchall()]
            app_query = app_query.where(CustomerApplication.user_id.in_(dept_user_ids))
        
        app_result = await db.execute(app_query)
        applications = app_result.scalars().all()
        
        # Get users created in the date range (admin/manager only)
        users = []
        if current_user.role in ['admin', 'manager']:
            user_query = select(User).where(
                and_(
                    User.created_at >= start_date,
                    User.created_at <= end_date
                )
            ).order_by(desc(User.created_at))
            
            if current_user.role == 'manager' and current_user.department_id:
                user_query = user_query.where(User.department_id == current_user.department_id)
            
            user_result = await db.execute(user_query)
            users = user_result.scalars().all()
        
        # Combine activities
        activities = []
        
        for app in applications:
            activities.append({
                "id": str(app.id),
                "type": "application",
                "action": "created",
                "title": f"New application from {app.full_name_latin or app.full_name_khmer or 'Unknown'}",
                "description": f"Loan application for ${app.requested_amount or 0:,.2f}",
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
        if current_user.role == 'officer':
            processed_query = processed_query.where(CustomerApplication.user_id == current_user.id)
        elif current_user.role == 'manager' and current_user.department_id:
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
        
        if current_user.role == 'officer':
            approved_query = approved_query.where(CustomerApplication.user_id == current_user.id)
        elif current_user.role == 'manager' and current_user.department_id:
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