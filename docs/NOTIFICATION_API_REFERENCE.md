# Notification System API Reference

## 📋 Quick Reference for Flutter Developers

### Base URL
```
https://your-domain.com/api/v1/users
```

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔔 Notification Types

| Type | Value | Description |
|------|-------|-------------|
| Welcome | `user_welcome` | New user account creation |
| Status Change | `status_change` | User account status updates |
| Onboarding | `onboarding_reminder` | Overdue onboarding alerts |
| Onboarding Complete | `onboarding_complete` | Onboarding completion |
| Offboarding | `offboarding_initiated` | User offboarding process |
| Team Change | `manager_team_change` | Team member notifications |
| Bulk Operation | `bulk_operation_complete` | Bulk operation results |
| System | `system_maintenance` | System maintenance alerts |
| Password | `password_expiry` | Password expiration warnings |
| Account Lock | `account_locked` | Account lockout notifications |

## 🚦 Priority Levels

| Priority | Value | Description |
|----------|-------|-------------|
| Low | `low` | Informational notifications |
| Normal | `normal` | Standard notifications |
| High | `high` | Important notifications |
| Urgent | `urgent` | Critical notifications |

## 🌐 API Endpoints

### 1. Get Notification Preferences
```http
GET /notifications/preferences
```

**Response:**
```json
{
  "user_id": "uuid",
  "preferences": {
    "email_notifications": {
      "user_welcome": true,
      "status_change": true,
      "onboarding_reminder": true
    },
    "in_app_notifications": {
      "user_welcome": true,
      "status_change": true,
      "onboarding_reminder": true
    },
    "notification_frequency": "immediate",
    "quiet_hours": {
      "enabled": false,
      "start_time": "22:00",
      "end_time": "08:00"
    }
  },
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 2. Update Notification Preferences
```http
PUT /notifications/preferences
Content-Type: application/json
```

**Request Body:**
```json
{
  "email_notifications": {
    "user_welcome": true,
    "status_change": false
  },
  "in_app_notifications": {
    "user_welcome": true,
    "status_change": true
  },
  "notification_frequency": "daily",
  "quiet_hours": {
    "enabled": true,
    "start_time": "22:00",
    "end_time": "08:00"
  }
}
```

### 3. Test Notification System
```http
POST /notifications/test
```
*Admin only*

**Response:**
```json
{
  "success": true,
  "email_test": {
    "success": true,
    "config_valid": true
  },
  "notification_test": {
    "total_users": 1,
    "email_sent": 1,
    "in_app_sent": 1
  }
}
```

### 4. Send Welcome Notification
```http
POST /{user_id}/notifications/welcome
```
*Admin/Manager only*

**Response:**
```json
{
  "total_users": 1,
  "email_sent": 1,
  "email_failed": 0,
  "in_app_sent": 1,
  "in_app_failed": 0,
  "errors": []
}
```

### 5. Send Onboarding Reminders
```http
POST /notifications/onboarding-reminders?days_threshold=7
```
*Admin/Manager only*

**Response:**
```json
{
  "total_users": 5,
  "email_notifications_sent": 5,
  "in_app_notifications_sent": 5,
  "days_threshold": 7,
  "cutoff_date": "2024-01-01T00:00:00Z"
}
```

### 6. Get Notification Summary
```http
GET /notifications/summary?days=30
```
*Admin/Manager only*

**Response:**
```json
{
  "period_days": 30,
  "total_notifications": 150,
  "email_notifications": 100,
  "in_app_notifications": 150,
  "notification_types": {
    "user_welcome": 25,
    "status_change": 50,
    "onboarding_reminder": 30
  },
  "generated_at": "2024-01-01T00:00:00Z"
}
```

## 🔧 Flutter Integration Examples

### HTTP Client Setup
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiClient {
  static const String baseUrl = 'https://your-domain.com/api/v1/users';
  
  static Future<Map<String, dynamic>> get(String endpoint, String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(response.body);
  }
  
  static Future<Map<String, dynamic>> put(String endpoint, String token, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(data),
    );
    return jsonDecode(response.body);
  }
}
```

### Usage Examples
```dart
// Get preferences
final prefs = await ApiClient.get('/notifications/preferences', token);

// Update preferences
await ApiClient.put('/notifications/preferences', token, {
  'email_notifications': {'user_welcome': true},
  'notification_frequency': 'daily'
});

// Test notifications (admin only)
final testResult = await ApiClient.post('/notifications/test', token, {});
```

## 📱 Real-time Integration

### WebSocket Connection
```dart
// Connect to real-time notifications
final channel = WebSocketChannel.connect(
  Uri.parse('wss://your-domain.com/ws/notifications/$userId?token=$token'),
);

// Listen for notifications
channel.stream.listen((data) {
  final notification = jsonDecode(data);
  // Handle incoming notification
});
```

### Push Notification Payload
```json
{
  "notification": {
    "title": "LC Workflow",
    "body": "You have a new notification"
  },
  "data": {
    "type": "user_welcome",
    "priority": "high",
    "user_id": "uuid",
    "action_url": "/profile"
  }
}
```

## 🔍 Error Handling

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format
```json
{
  "detail": "Error description",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🧪 Testing with cURL

```bash
# Get preferences
curl -H "Authorization: Bearer TOKEN" \
     https://your-domain.com/api/v1/users/notifications/preferences

# Update preferences  
curl -X PUT \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"notification_frequency":"daily"}' \
     https://your-domain.com/api/v1/users/notifications/preferences

# Test notifications (admin only)
curl -X POST \
     -H "Authorization: Bearer TOKEN" \
     https://your-domain.com/api/v1/users/notifications/test
```

## 📞 Support

For implementation questions or issues:
1. Check the main Flutter integration guide
2. Review the backend notification service code
3. Test API endpoints with the provided cURL examples
4. Verify authentication tokens and permissions