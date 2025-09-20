"""
Demo script showing how to use the Enhanced Audit Service
"""

import asyncio
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock

from app.services.audit_service import (
    AuditService, 
    UserActivityType, 
    ComplianceReportType
)
from app.models import BulkOperation


async def demo_enhanced_audit_service():
    """Demonstrate the enhanced audit service functionality"""
    
    print("🔍 Enhanced Audit Service Demo")
    print("=" * 50)
    
    # Create a mock database session for demo purposes
    mock_db = AsyncMock()
    mock_db.add = lambda obj: print(f"✅ Added {type(obj).__name__} to database")
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    # Create audit service instance
    audit_service = AuditService(mock_db)
    
    # Demo 1: Log User Activity
    print("\n1. 📝 Logging User Activity")
    print("-" * 30)
    
    user_id = uuid4()
    try:
        await audit_service.log_user_activity(
            user_id=user_id,
            activity_type=UserActivityType.LOGIN,
            details={
                "login_method": "password",
                "device": "desktop",
                "browser": "Chrome 91.0"
            },
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            session_id="session_abc123"
        )
        print("✅ User login activity logged successfully")
    except Exception as e:
        print(f"❌ Error logging user activity: {e}")
    
    # Demo 2: Log Bulk Operation
    print("\n2. 📊 Logging Bulk Operation")
    print("-" * 30)
    
    bulk_operation = BulkOperation(
        id=uuid4(),
        operation_type="bulk_status_update",
        performed_by=user_id,
        target_criteria={"department": "sales", "role": "officer"},
        changes_applied={"status": "inactive"},
        total_records=150,
        successful_records=145,
        failed_records=5,
        error_details={
            "summary": "5 records failed validation",
            "failed_records": [
                {"id": "user_123", "error": "Invalid email format"},
                {"id": "user_456", "error": "Missing required field"}
            ]
        },
        status="completed",
        progress_percentage=100
    )
    
    try:
        await audit_service.log_bulk_operation(
            operation=bulk_operation,
            performed_by=user_id,
            additional_details={"batch_size": 50, "processing_time_seconds": 45}
        )
        print("✅ Bulk operation logged successfully")
        print(f"   📈 Processed {bulk_operation.total_records} records")
        print(f"   ✅ Success: {bulk_operation.successful_records}")
        print(f"   ❌ Failed: {bulk_operation.failed_records}")
    except Exception as e:
        print(f"❌ Error logging bulk operation: {e}")
    
    # Demo 3: Activity Aggregations
    print("\n3. 📈 Activity Aggregations")
    print("-" * 30)
    
    # Mock the database response for aggregations
    mock_activity_result = AsyncMock()
    mock_activity_result.fetchall.return_value = [
        type('MockRow', (), {
            'period': datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
            'activity_type': 'login',
            'count': 25,
            'unique_users': 15
        })(),
        type('MockRow', (), {
            'period': datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
            'activity_type': 'profile_update',
            'count': 8,
            'unique_users': 6
        })()
    ]
    
    mock_login_result = AsyncMock()
    mock_login_result.fetchall.return_value = [
        type('MockRow', (), {
            'period': datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
            'total_logins': 25,
            'unique_users': 15,
            'avg_session_duration': 1800.0  # 30 minutes
        })()
    ]
    
    mock_db.execute.side_effect = [mock_activity_result, mock_login_result]
    
    try:
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        end_date = datetime.now(timezone.utc)
        
        aggregations = await audit_service.get_activity_aggregations(
            start_date=start_date,
            end_date=end_date,
            group_by="day",
            activity_types=["login", "profile_update"]
        )
        
        print("✅ Activity aggregations retrieved successfully")
        print(f"   📊 Total activities: {aggregations['summary']['total_activities']}")
        print(f"   👥 Unique users: {aggregations['summary']['unique_users']}")
        print(f"   📅 Group by: {aggregations['group_by']}")
        
        if aggregations['login_patterns']:
            login_pattern = aggregations['login_patterns'][0]
            print(f"   🔐 Login patterns:")
            print(f"      - Total logins: {login_pattern['total_logins']}")
            print(f"      - Unique users: {login_pattern['unique_users']}")
            if login_pattern['avg_session_duration_seconds']:
                duration_minutes = login_pattern['avg_session_duration_seconds'] / 60
                print(f"      - Avg session: {duration_minutes:.1f} minutes")
        
    except Exception as e:
        print(f"❌ Error getting activity aggregations: {e}")
    
    # Demo 4: Compliance Report
    print("\n4. 📋 Compliance Report")
    print("-" * 30)
    
    # Mock compliance report data
    mock_compliance_result = AsyncMock()
    mock_compliance_result.fetchall.return_value = [
        type('MockRow', (), {
            'user_id': user_id,
            'login_count': 45,
            'first_login': start_date,
            'last_login': end_date,
            'ip_addresses': ['192.168.1.100', '192.168.1.101', '10.0.0.50']
        })()
    ]
    
    mock_db.execute.return_value = mock_compliance_result
    
    try:
        report = await audit_service.get_compliance_report(
            report_type=ComplianceReportType.USER_ACCESS_REPORT,
            start_date=start_date,
            end_date=end_date,
            filters={"user_ids": [user_id]}
        )
        
        print("✅ Compliance report generated successfully")
        print(f"   📊 Report type: {report['report_type']}")
        print(f"   📅 Date range: {report['date_range']['start_date'][:10]} to {report['date_range']['end_date'][:10]}")
        print(f"   👤 Users analyzed: {len(report['data'])}")
        
        if report['data']:
            user_data = report['data'][0]
            print(f"   🔐 User access summary:")
            print(f"      - Login count: {user_data['login_count']}")
            print(f"      - Unique IPs: {user_data['unique_ip_addresses']}")
            print(f"      - IP addresses: {', '.join(user_data['ip_addresses'][:2])}...")
        
    except Exception as e:
        print(f"❌ Error generating compliance report: {e}")
    
    # Demo 5: Archive Old Data (Dry Run)
    print("\n5. 🗄️ Archive Old Audit Data")
    print("-" * 30)
    
    # Mock archive data counts
    mock_audit_count = AsyncMock()
    mock_audit_count.scalar.return_value = 5000
    
    mock_activity_count = AsyncMock()
    mock_activity_count.scalar.return_value = 25000
    
    mock_db.execute.side_effect = [mock_audit_count, mock_activity_count]
    
    try:
        archive_result = await audit_service.archive_old_audit_data(
            retention_days=365,
            archive_table_suffix="_archived_2024",
            dry_run=True
        )
        
        print("✅ Archive analysis completed (dry run)")
        print(f"   📊 Retention period: {archive_result['retention_days']} days")
        print(f"   📋 Audit logs to archive: {archive_result['records_to_archive']['audit_logs']:,}")
        print(f"   📝 User activities to archive: {archive_result['records_to_archive']['user_activities']:,}")
        print(f"   🏷️ Archive tables: {list(archive_result['archive_tables'].values())}")
        print(f"   ⚠️ Dry run mode: {archive_result['dry_run']}")
        
    except Exception as e:
        print(f"❌ Error analyzing archive data: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Enhanced Audit Service Demo Complete!")
    print("\nKey Features Demonstrated:")
    print("• 📝 User activity logging with detailed context")
    print("• 📊 Bulk operation tracking with success/failure metrics")
    print("• 📈 Activity aggregations for analytics dashboards")
    print("• 📋 Compliance reports for regulatory requirements")
    print("• 🗄️ Data archiving for long-term retention management")
    print("\nThe Enhanced Audit Service provides comprehensive")
    print("audit trails for user management operations! 🎉")


if __name__ == "__main__":
    asyncio.run(demo_enhanced_audit_service())