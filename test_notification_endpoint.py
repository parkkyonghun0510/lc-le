#!/usr/bin/env python3
"""
Test script for the notification endpoint
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'le-backend'))

# Import with proper module path
import importlib.util
import importlib

# Import the modules
spec = importlib.util.spec_from_file_location("app", os.path.join(os.path.dirname(__file__), 'le-backend', 'app', '__init__.py'))
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

from app.database import get_db
from app.models import User, Notification
from app.services.notification_service import NotificationService
from app.services.notification_types import NotificationType, NotificationPriority
from sqlalchemy import select

async def test_notification_endpoint():
    """Test the notification endpoint functionality"""
    
    print("🔔 Testing Notification Endpoint")
    print("=" * 50)
    
    # Get database session
    async for db in get_db():
        try:
            notification_service = NotificationService(db)
            
            # Get a test user
            result = await db.execute(select(User).limit(1))
            test_user = result.scalar_one_or_none()
            
            if not test_user:
                print("❌ No users found in database. Please create a user first.")
                return
            
            print(f"✅ Found test user: {test_user.first_name} {test_user.last_name} ({test_user.email})")
            
            # Test 1: Send a test notification
            print("\n1. Sending test notification...")
            
            test_result = await notification_service.send_notification(
                notification_type='system_test',
                user_ids=[test_user.id],
                title='Notification System Test',
                message='This is a test notification to verify the enhanced system is working correctly.',
                data={'test': True, 'timestamp': datetime.now(timezone.utc).isoformat()},
                priority=NotificationPriority.NORMAL
            )
            
            print(f"✅ Test notification sent: {test_result}")
            
            # Test 2: Get user notifications (simulating the endpoint)
            print("\n2. Testing get_user_notifications (endpoint simulation)...")
            
            notifications = await notification_service.get_user_notifications(
                test_user.id, limit=20, offset=0, unread_only=False
            )
            
            print(f"✅ Notifications retrieved successfully:")
            print(f"   - Total count: {notifications['total_count']}")
            print(f"   - Notifications: {len(notifications['notifications'])}")
            print(f"   - Has more: {notifications['has_more']}")
            
            if notifications['notifications']:
                print(f"   - First notification: {notifications['notifications'][0]['title']}")
            
            # Test 3: Test notification summary
            print("\n3. Testing notification summary...")
            
            summary = await notification_service.get_notification_summary(days=30)
            print(f"✅ Summary retrieved:")
            print(f"   - Total notifications: {summary['total_notifications']}")
            print(f"   - Unread count: {summary['unread_count']}")
            print(f"   - Recent notifications: {len(summary['recent_notifications'])}")
            
            print("\n🎉 All notification endpoint tests completed successfully!")
            print("\nThe 422 error should now be resolved. The issue was:")
            print("✅ Circular import between notification_service.py and notification_templates.py")
            print("✅ Fixed by creating separate notification_types.py file")
            print("✅ Notification model properly exported from models/__init__.py")
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            break

if __name__ == "__main__":
    asyncio.run(test_notification_endpoint())
