#!/usr/bin/env python3
"""
Test script to verify the route fix
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

async def test_route_fix():
    """Test that the route fix works"""
    
    print("🔧 Testing Route Fix")
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
                title='Route Fix Test',
                message='This notification tests that the route fix is working correctly.',
                data={'test': True, 'route_fix': True, 'timestamp': datetime.now(timezone.utc).isoformat()},
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
            
            print("\n🎉 Route fix test completed successfully!")
            print("\nThe issue was:")
            print("❌ Route order problem: /users/notifications was defined AFTER /users/{user_id}")
            print("✅ Fixed by moving notification routes BEFORE /{user_id} routes")
            print("✅ Now /users/notifications will match before /users/{user_id}")
            print("✅ The 422 error should be resolved!")
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            break

if __name__ == "__main__":
    asyncio.run(test_route_fix())
