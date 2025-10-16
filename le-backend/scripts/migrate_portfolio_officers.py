#!/usr/bin/env python3
"""
Portfolio Officer Migration Script

Migrates legacy portfolio_officer_name values to structured employee assignments.

Usage:
    python scripts/migrate_portfolio_officers.py [--dry-run]

Options:
    --dry-run    Run migration without committing changes to database
"""
import asyncio
import argparse
import logging
import sys
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func
from fuzzywuzzy import fuzz

from app.database import AsyncSessionLocal
from app.models import CustomerApplication, Employee, ApplicationEmployeeAssignment, User
from app.services.employee_service import EmployeeService
from app.services.employee_assignment_service import EmployeeAssignmentService
from app.schemas import AssignmentRole

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PortfolioOfficerMigration:
    """Handles migration of portfolio officer names to employee assignments"""
    
    def __init__(self, db: AsyncSession, dry_run: bool = False):
        self.db = db
        self.dry_run = dry_run
        self.report: Dict[str, Any] = {
            'total': 0,
            'matched': 0,
            'created': 0,
            'failed': 0,
            'errors': []
        }
        self.system_user_id = None
        self.fuzzy_threshold = 80  # 80% similarity threshold
    
    async def get_system_user(self) -> User:
        """Get or create a system user for automated operations"""
        # Try to find an admin user
        query = await self.db.execute(
            select(User).where(User.role == 'admin').limit(1)
        )
        user = query.scalar_one_or_none()
        
        if user:
            logger.info(f"Using admin user {user.username} (ID: {user.id}) for migration")
            return user
        
        # If no admin found, use the first user
        query = await self.db.execute(select(User).limit(1))
        user = query.scalar_one_or_none()
        
        if user:
            logger.info(f"Using user {user.username} (ID: {user.id}) for migration")
            return user
        
        raise Exception("No users found in database. Cannot perform migration.")
    
    async def get_applications_to_migrate(self) -> List[CustomerApplication]:
        """Get all applications that need migration"""
        query = await self.db.execute(
            select(CustomerApplication).where(
                and_(
                    CustomerApplication.portfolio_officer_name.isnot(None),
                    CustomerApplication.portfolio_officer_name != '',
                    CustomerApplication.portfolio_officer_migrated == False
                )
            )
        )
        applications = query.scalars().all()
        logger.info(f"Found {len(applications)} applications to migrate")
        return list(applications)
    
    async def find_matching_employee(self, name: str) -> Employee:
        """
        Find matching employee using fuzzy matching
        
        Args:
            name: Portfolio officer name to match
            
        Returns:
            Matching Employee or None
        """
        # Get all active employees
        query = await self.db.execute(
            select(Employee).where(Employee.is_active == True)
        )
        employees = query.scalars().all()
        
        best_match = None
        best_score = 0
        
        for employee in employees:
            # Calculate fuzzy match scores for both Khmer and Latin names
            khmer_score = fuzz.ratio(name.lower(), employee.full_name_khmer.lower())
            latin_score = fuzz.ratio(name.lower(), employee.full_name_latin.lower())
            
            # Use the better score
            score = max(khmer_score, latin_score)
            
            if score > best_score and score >= self.fuzzy_threshold:
                best_score = score
                best_match = employee
        
        if best_match:
            logger.debug(
                f"Matched '{name}' to employee {best_match.employee_code} "
                f"({best_match.full_name_khmer} / {best_match.full_name_latin}) "
                f"with score {best_score}"
            )
        
        return best_match
    
    async def create_employee_from_name(self, name: str, year: int, sequential: int) -> Employee:
        """
        Create a new employee from portfolio officer name
        
        Args:
            name: Portfolio officer name
            year: Current year for employee code
            sequential: Sequential number for employee code
            
        Returns:
            Created Employee
        """
        employee_code = f"EMP-{year}-{sequential:04d}"
        
        # Check if code already exists (shouldn't happen, but be safe)
        existing = await EmployeeService.get_employee_by_code(self.db, employee_code, load_relationships=False)
        if existing:
            # Increment sequential number
            sequential += 1
            employee_code = f"EMP-{year}-{sequential:04d}"
        
        from app.schemas import EmployeeCreate
        
        employee_data = EmployeeCreate(
            employee_code=employee_code,
            full_name_khmer=name,
            full_name_latin=name,
            phone_number="N/A",  # Required field, but we don't have it
            is_active=True,
            notes=f"Auto-created during portfolio officer migration on {datetime.now().isoformat()}"
        )
        
        employee = await EmployeeService.create_employee(
            self.db,
            employee_data,
            created_by=self.system_user_id
        )
        
        logger.info(f"Created new employee {employee_code} for name '{name}'")
        return employee
    
    async def migrate_application(
        self,
        application: CustomerApplication,
        year: int,
        sequential_counter: Dict[str, int]
    ) -> bool:
        """
        Migrate a single application
        
        Args:
            application: Application to migrate
            year: Current year for employee code generation
            sequential_counter: Counter for sequential employee codes
            
        Returns:
            True if successful, False otherwise
        """
        try:
            portfolio_name = application.portfolio_officer_name.strip()
            logger.info(f"Migrating application {application.id} with portfolio officer '{portfolio_name}'")
            
            # Try to find matching employee
            employee = await self.find_matching_employee(portfolio_name)
            
            if employee:
                logger.info(f"Found matching employee: {employee.employee_code}")
                self.report['matched'] += 1
            else:
                # Create new employee
                sequential_counter['value'] += 1
                employee = await self.create_employee_from_name(
                    portfolio_name,
                    year,
                    sequential_counter['value']
                )
                self.report['created'] += 1
            
            # Check if assignment already exists
            existing_query = await self.db.execute(
                select(ApplicationEmployeeAssignment).where(
                    and_(
                        ApplicationEmployeeAssignment.application_id == application.id,
                        ApplicationEmployeeAssignment.employee_id == employee.id,
                        ApplicationEmployeeAssignment.assignment_role == AssignmentRole.PRIMARY_OFFICER.value
                    )
                )
            )
            existing_assignment = existing_query.scalar_one_or_none()
            
            if not existing_assignment:
                # Create assignment
                assignment = await EmployeeAssignmentService.assign_employee(
                    self.db,
                    application_id=application.id,
                    employee_id=employee.id,
                    role=AssignmentRole.PRIMARY_OFFICER,
                    assigned_by=self.system_user_id,
                    notes=f"Migrated from portfolio_officer_name: {portfolio_name}"
                )
                logger.info(f"Created assignment {assignment.id}")
            else:
                logger.info(f"Assignment already exists for application {application.id}")
            
            # Mark application as migrated
            application.portfolio_officer_migrated = True
            await self.db.flush()
            
            return True
            
        except Exception as e:
            error_msg = f"Failed to migrate application {application.id}: {str(e)}"
            logger.error(error_msg)
            self.report['errors'].append(error_msg)
            self.report['failed'] += 1
            return False
    
    async def run(self) -> Dict[str, Any]:
        """
        Run the migration
        
        Returns:
            Migration report dictionary
        """
        try:
            # Get system user
            system_user = await self.get_system_user()
            self.system_user_id = system_user.id
            
            # Get applications to migrate
            applications = await self.get_applications_to_migrate()
            self.report['total'] = len(applications)
            
            if self.report['total'] == 0:
                logger.info("No applications to migrate")
                return self.report
            
            # Get current year for employee code generation
            current_year = datetime.now().year
            
            # Get highest sequential number for this year
            query = await self.db.execute(
                select(Employee.employee_code).where(
                    Employee.employee_code.like(f"EMP-{current_year}-%")
                ).order_by(Employee.employee_code.desc()).limit(1)
            )
            last_code = query.scalar_one_or_none()
            
            sequential_start = 0
            if last_code:
                try:
                    # Extract sequential number from code like "EMP-2024-0001"
                    sequential_start = int(last_code.split('-')[-1])
                except (ValueError, IndexError):
                    sequential_start = 0
            
            sequential_counter = {'value': sequential_start}
            
            # Migrate each application
            logger.info(f"Starting migration of {self.report['total']} applications...")
            
            for i, application in enumerate(applications, 1):
                logger.info(f"Processing application {i}/{self.report['total']}")
                await self.migrate_application(application, current_year, sequential_counter)
            
            # Commit or rollback based on dry_run flag
            if self.dry_run:
                logger.info("DRY RUN: Rolling back all changes")
                await self.db.rollback()
            else:
                logger.info("Committing changes to database")
                await self.db.commit()
            
            return self.report
            
        except Exception as e:
            error_msg = f"Migration failed with error: {str(e)}"
            logger.error(error_msg)
            self.report['errors'].append(error_msg)
            await self.db.rollback()
            return self.report


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Migrate portfolio officer names to employee assignments'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run migration without committing changes'
    )
    args = parser.parse_args()
    
    logger.info("=" * 80)
    logger.info("Portfolio Officer Migration Script")
    logger.info("=" * 80)
    
    if args.dry_run:
        logger.info("Running in DRY RUN mode - no changes will be committed")
    
    # Create database session
    async with AsyncSessionLocal() as db:
        migration = PortfolioOfficerMigration(db, dry_run=args.dry_run)
        report = await migration.run()
    
    # Print final report
    logger.info("=" * 80)
    logger.info("Migration Report")
    logger.info("=" * 80)
    logger.info(f"Total applications processed: {report['total']}")
    logger.info(f"Matched to existing employees: {report['matched']}")
    logger.info(f"New employees created: {report['created']}")
    logger.info(f"Failed migrations: {report['failed']}")
    
    if report['errors']:
        logger.info("\nErrors:")
        for error in report['errors']:
            logger.error(f"  - {error}")
    
    logger.info("=" * 80)
    
    # Exit with error code if there were failures
    if report['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
