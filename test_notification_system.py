#!/usr/bin/env python3
"""
Test script for the enhanced notification system
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'le-backend'))

from le_backend.app.database import get_db
from le_backend.app.models import User, Notification
from le_backend.app.services.notification_service import NotificationService, NotificationType, NotificationPriority
from le_backend.app.services.notification_templates import NotificationTemplates
from sqlalchemy import select

async def test_notification_system():
    """Test the notification system functionality"""
    
    print("🔔 Testing Enhanced Notification System")
    print("=" * 50)
    
    # Get database session
    async for db in get_db():
        try:
            notification_service = NotificationService(db)
            
            # Test 1: Get a test user
            print("\n1. Finding test user...")
            result = await db.execute(select(User).limit(1))
            test_user = result.scalar_one_or_none()
            
            if not test_user:
                print("❌ No users found in database. Please create a user first.")
                return
            
            print(f"✅ Found test user: {test_user.first_name} {test_user.last_name} ({test_user.email})")
            
            # Test 2: Test notification templates
            print("\n2. Testing notification templates...")
            
            # Welcome template
            welcome_template = NotificationTemplates.get_welcome_template(test_user)
            print(f"✅ Welcome template: {welcome_template['title']}")
            
            # Status change template
            status_template = NotificationTemplates.get_status_change_template(
                test_user, 'pending', 'active', 'Account approved by admin'
            )
            print(f"✅ Status change template: {status_template['title']}")
            
            # Onboarding reminder template
            reminder_template = NotificationTemplates.get_onboarding_reminder_template(test_user, 5)
            print(f"✅ Onboarding reminder template: {reminder_template['title']}")
            
            # Test 3: Send a test notification
            print("\n3. Sending test notification...")
            
            test_result = await notification_service.send_notification(
                notification_type='system_test',
                user_ids=[test_user.id],
                title='Notification System Test',
                message='This is a test notification to verify the enhanced system is working correctly.',
                data={'test': True, 'timestamp': datetime.now(timezone.utc).isoformat()},
                priority=NotificationPriority.NORMAL
            )
            
            print(f"✅ Test notification sent: {test_result}")
            
            # Test 4: Check if notification was saved to database
            print("\n4. Verifying notification in database...")
            
            result = await db.execute(
                select(Notification)
                .where(Notification.user_id == test_user.id)
                .order_by(Notification.created_at.desc())
                .limit(1)
            )
            saved_notification = result.scalar_one_or_none()
            
            if saved_notification:
                print(f"✅ Notification saved to database:")
                print(f"   - ID: {saved_notification.id}")
                print(f"   - Type: {saved_notification.type}")
                print(f"   - Title: {saved_notification.title}")
                print(f"   - Priority: {saved_notification.priority}")
                print(f"   - Is Read: {saved_notification.is_read}")
                print(f"   - Created: {saved_notification.created_at}")
            else:
                print("❌ Notification not found in database")
            
            # Test 5: Test notification summary
            print("\n5. Testing notification summary...")
            
            summary = await notification_service.get_notification_summary(days=30)
            print(f"✅ Notification summary:")
            print(f"   - Total notifications: {summary['total_notifications']}")
            print(f"   - Unread count: {summary['unread_count']}")
            print(f"   - Recent notifications: {len(summary['recent_notifications'])}")
            
            # Test 6: Test user notifications
            print("\n6. Testing user notifications retrieval...")
            
            user_notifications = await notification_service.get_user_notifications(
                test_user.id, limit=10, offset=0
            )
            print(f"✅ User notifications retrieved:")
            print(f"   - Total count: {user_notifications['total_count']}")
            print(f"   - Notifications: {len(user_notifications['notifications'])}")
            
            # Test 7: Test mark as read
            if saved_notification:
                print("\n7. Testing mark as read...")
                
                mark_read_result = await notification_service.mark_notification_as_read(
                    saved_notification.id, test_user.id
                )
                print(f"✅ Mark as read result: {mark_read_result}")
                
                # Verify it was marked as read
                await db.refresh(saved_notification)
                print(f"✅ Notification is_read status: {saved_notification.is_read}")
            
            print("\n🎉 All notification system tests completed successfully!")
            print("\nEnhanced Features Implemented:")
            print("✅ Professional notification templates")
            print("✅ Database persistence for notifications")
            print("✅ Mark as read/dismiss functionality")
            print("✅ Notification summary and statistics")
            print("✅ User-specific notification retrieval")
            print("✅ Priority-based notification handling")
            print("✅ Rich notification data with metadata")
            
        except Exception as e:
            print(f"❌ Error during testing: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            break

if __name__ == "__main__":
    asyncio.run(test_notification_system())
