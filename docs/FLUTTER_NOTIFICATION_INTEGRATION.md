# Flutter Mobile App - Notification System Integration Guide

## 📋 Overview
Complete integration guide for Flutter developers to connect with the LC Workflow notification system.

## 🔧 Backend Notification System

### Notification Types
```dart
enum NotificationType {
  userWelcome('user_welcome'),
  statusChange('status_change'),
  onboardingReminder('onboarding_reminder'),
  onboardingComplete('onboarding_complete'),
  offboardingInitiated('offboarding_initiated'),
  managerTeamChange('manager_team_change'),
  bulkOperationComplete('bulk_operation_complete'),
  systemMaintenance('system_maintenance'),
  passwordExpiry('password_expiry'),
  accountLocked('account_locked');
}
```

### Priority Levels
```dart
enum NotificationPriority {
  low('low'), normal('normal'), high('high'), urgent('urgent');
}
```

## 🌐 API Endpoints

### Base Configuration
```dart
class ApiConfig {
  static const String baseUrl = 'https://your-domain.com/api/v1';
  static const String notificationEndpoint = '$baseUrl/users';
  
  static Map<String, String> getAuthHeaders(String token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }
}
```

### Key Endpoints
1. **GET /users/notifications/preferences** - Get user notification preferences
2. **PUT /users/notifications/preferences** - Update preferences
3. **POST /users/notifications/test** - Test notification system (Admin)
4. **POST /users/{id}/notifications/welcome** - Send welcome notification
5. **GET /users/notifications/summary** - Get notification statistics
6. **POST /users/notifications/onboarding-reminders** - Send onboarding reminders

## 📱 Flutter Implementation

### 1. Data Models
```dart
class NotificationPreferences {
  final Map<String, bool> emailNotifications;
  final Map<String, bool> inAppNotifications;
  final String notificationFrequency;
  final QuietHours quietHours;

  NotificationPreferences({
    required this.emailNotifications,
    required this.inAppNotifications,
    required this.notificationFrequency,
    required this.quietHours,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      emailNotifications: Map<String, bool>.from(json['preferences']['email_notifications']),
      inAppNotifications: Map<String, bool>.from(json['preferences']['in_app_notifications']),
      notificationFrequency: json['preferences']['notification_frequency'],
      quietHours: QuietHours.fromJson(json['preferences']['quiet_hours']),
    );
  }
}

class InAppNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final NotificationPriority priority;
  final DateTime createdAt;
  bool isRead;

  InAppNotification({
    required this.id, required this.type, required this.title,
    required this.message, required this.priority, required this.createdAt,
    this.isRead = false,
  });
}
```

### 2. Notification Service
```dart
class NotificationService {
  Future<NotificationPreferences?> getPreferences() async {
    try {
      final token = await _getAuthToken();
      final response = await http.get(
        Uri.parse('${ApiConfig.notificationEndpoint}/notifications/preferences'),
        headers: ApiConfig.getAuthHeaders(token),
      );
      
      if (response.statusCode == 200) {
        return NotificationPreferences.fromJson(jsonDecode(response.body));
      }
    } catch (e) {
      print('Error getting preferences: $e');
    }
    return null;
  }

  Future<bool> updatePreferences(NotificationPreferences preferences) async {
    try {
      final token = await _getAuthToken();
      final response = await http.put(
        Uri.parse('${ApiConfig.notificationEndpoint}/notifications/preferences'),
        headers: ApiConfig.getAuthHeaders(token),
        body: jsonEncode(preferences.toJson()),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error updating preferences: $e');
      return false;
    }
  }
}
```

### 3. Notification Bell Widget
```dart
class NotificationBell extends StatefulWidget {
  @override
  _NotificationBellState createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  List<InAppNotification> _notifications = [];
  int get _unreadCount => _notifications.where((n) => !n.isRead).length;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        IconButton(
          icon: Icon(Icons.notifications),
          onPressed: _showNotifications,
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 8, top: 8,
            child: Container(
              padding: EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _unreadCount > 9 ? '9+' : '$_unreadCount',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),
      ],
    );
  }
}
```

### 4. Preferences Screen
```dart
class NotificationPreferencesScreen extends StatefulWidget {
  @override
  _NotificationPreferencesScreenState createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  final NotificationService _service = NotificationService();
  NotificationPreferences? _preferences;
  bool _isLoading = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Notification Preferences')),
      body: _isLoading 
        ? Center(child: CircularProgressIndicator())
        : _buildPreferencesForm(),
    );
  }

  Widget _buildPreferencesForm() {
    return ListView(
      children: [
        _buildEmailSection(),
        _buildInAppSection(),
        _buildFrequencySection(),
        _buildQuietHoursSection(),
      ],
    );
  }
}
```

## 🔔 Push Notifications

### Firebase Setup
```dart
class PushNotificationService {
  static Future<void> initialize() async {
    await FirebaseMessaging.instance.requestPermission();
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    // Show local notification
    await FlutterLocalNotificationsPlugin().show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      NotificationDetails(),
    );
  }
}
```

## 🔗 Integration Checklist

### Backend (✅ Complete)
- ✅ Email Service with SMTP configuration
- ✅ NotificationService with multi-channel support
- ✅ 6 API endpoints for notification management
- ✅ 10 notification types with 4 priority levels
- ✅ User preference management
- ✅ Complete audit logging

### Flutter Implementation
- [ ] HTTP client setup and authentication
- [ ] Data models for notifications and preferences
- [ ] NotificationService class implementation
- [ ] Notification bell and preferences UI
- [ ] Firebase Cloud Messaging integration
- [ ] Local storage for offline support
- [ ] WebSocket for real-time updates
- [ ] Error handling and retry logic
- [ ] Unit and integration tests

### Security
- [ ] JWT token authentication
- [ ] Role-based access control
- [ ] Input validation and sanitization
- [ ] HTTPS communications
- [ ] Token refresh handling

## 🧪 Testing

### API Testing
```bash
# Test notification preferences
curl -X GET "https://your-domain.com/api/v1/users/notifications/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update preferences
curl -X PUT "https://your-domain.com/api/v1/users/notifications/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email_notifications": {"user_welcome": true}}'
```

### Flutter Unit Tests
```dart
void main() {
  group('NotificationService Tests', () {
    test('should fetch preferences', () async {
      final service = NotificationService();
      final prefs = await service.getPreferences();
      expect(prefs, isNotNull);
    });
  });
}
```

## 📖 Next Steps

1. **Set up Flutter project** with required dependencies
2. **Configure API endpoints** and authentication
3. **Implement data models** and service layer
4. **Build UI components** for notifications
5. **Add push notification support** with Firebase
6. **Test integration** with backend APIs
7. **Deploy and monitor** notification delivery

For detailed implementation examples and troubleshooting, refer to the complete codebase in the backend notification services.