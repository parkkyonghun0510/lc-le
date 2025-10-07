'use client';

import { useState } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  Settings, 
  TestTube, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Info,
  BarChart3,
  Plus,
  Wifi
} from 'lucide-react';
import { useNotificationSummary, useTestNotificationSystem, useSendOnboardingReminders, useSendWelcomeNotification, useSendRealTimeNotification, useBroadcastNotification, useRealTimeNotifications } from '@/hooks/useNotifications';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import NotificationSender from './NotificationSender';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface NotificationManagementProps {
  className?: string;
}

export default function NotificationManagement({ className = '' }: NotificationManagementProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [daysThreshold, setDaysThreshold] = useState(7);
  const [showNotificationSender, setShowNotificationSender] = useState(false);
  
  const { data: summary, isLoading: summaryLoading } = useNotificationSummary();
  const { data: usersData } = useUsers({ size: 100 });
  const { user } = useAuth();
  const testNotification = useTestNotificationSystem();
  const sendOnboardingReminders = useSendOnboardingReminders();
  const sendWelcomeNotification = useSendWelcomeNotification();
  const sendRealTimeNotification = useSendRealTimeNotification();
  const broadcastNotification = useBroadcastNotification();
  const { isConnected: isWebSocketConnected } = useRealTimeNotifications();

  const handleTestNotification = async () => {
    try {
      await testNotification.mutateAsync();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendOnboardingReminders = async () => {
    try {
      await sendOnboardingReminders.mutateAsync(daysThreshold);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendWelcomeNotification = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    
    try {
      await sendWelcomeNotification.mutateAsync(selectedUserId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendRealTimeNotification = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    
    try {
      await sendRealTimeNotification.mutateAsync({
        user_id: selectedUserId,
        notification_type: 'test_realtime',
        title: 'Real-time Test Notification',
        message: 'This is a real-time notification test',
        priority: 'normal'
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleBroadcastNotification = async () => {
    try {
      await broadcastNotification.mutateAsync({
        pattern: 'department:all',
        notification_type: 'broadcast_test',
        title: 'Broadcast Test Notification',
        message: 'This is a broadcast notification test to all departments',
        priority: 'normal'
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const users = usersData?.items || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notification Management</h2>
            <p className="text-gray-600">Manage system notifications and user communications</p>
          </div>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setShowNotificationSender(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Send Notification</span>
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.total_notifications || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.unread_count || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Read</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(summary?.total_notifications || 0) - (summary?.unread_count || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Types</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(summary?.by_type || {}).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Notification */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <TestTube className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Test Notification System</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Send a test notification to verify the system is working correctly.
          </p>
          <button
            onClick={handleTestNotification}
            disabled={testNotification.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{testNotification.isPending ? 'Sending...' : 'Send Test Notification'}</span>
          </button>
        </div>

        {/* Send Welcome Notification */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Send Welcome Notification</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Send a welcome notification to a specific user.
          </p>
          <div className="space-y-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
            <div className="flex space-x-2">
              <button
                onClick={handleSendWelcomeNotification}
                disabled={!selectedUserId || sendWelcomeNotification.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{sendWelcomeNotification.isPending ? 'Sending...' : 'Send Welcome'}</span>
              </button>
              <button
                onClick={handleSendRealTimeNotification}
                disabled={!selectedUserId || sendRealTimeNotification.isPending || !isWebSocketConnected}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                title={!isWebSocketConnected ? 'WebSocket not connected' : 'Send real-time notification'}
              >
                <Wifi className="h-4 w-4" />
                <span>{sendRealTimeNotification.isPending ? 'Sending...' : 'Real-time'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Send Onboarding Reminders */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Send Onboarding Reminders</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Send reminders to users with overdue onboarding tasks.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days Threshold
              </label>
              <input
                type="number"
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(parseInt(e.target.value) || 7)}
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSendOnboardingReminders}
              disabled={sendOnboardingReminders.isPending}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{sendOnboardingReminders.isPending ? 'Sending...' : 'Send Reminders'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Broadcast Test */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Wifi className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Real-time Broadcast</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Test real-time notification broadcasting to all departments.
          </p>
          <div className="flex items-center space-x-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              WebSocket: {isWebSocketConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={handleBroadcastNotification}
            disabled={broadcastNotification.isPending || !isWebSocketConnected}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            title={!isWebSocketConnected ? 'WebSocket not connected' : 'Broadcast to all departments'}
          >
            <Wifi className="h-4 w-4" />
            <span>{broadcastNotification.isPending ? 'Broadcasting...' : 'Broadcast Test'}</span>
          </button>
        </div>

        {/* Notification Settings */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Configure global notification settings and preferences.
          </p>
          <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Open Settings</span>
          </button>
        </div>
      </div>

      {/* Notification Statistics */}
      {summary && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">By Type</h4>
              <div className="space-y-2">
                {Object.entries(summary.by_type || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Priority */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">By Priority</h4>
              <div className="space-y-2">
                {Object.entries(summary.by_priority || {}).map(([priority, count]) => (
                  <div key={priority} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{priority}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Sender Modal */}
      {showNotificationSender && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Send Notification</h3>
                <button
                  onClick={() => setShowNotificationSender(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <NotificationSender onClose={() => setShowNotificationSender(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
