'use client';

import React, { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui';
import { Loader2, Send, Users, Building, MapPin, Globe } from 'lucide-react';
import { useSendNotificationToUsers, useSendNotificationToDepartment, useSendNotificationToBranch, useSendNotificationToAll } from '@/hooks/useNotifications';
import { useUsers } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useBranches } from '@/hooks/useBranches';
import { NotificationType, NotificationPriority } from '@/types/notifications';

interface NotificationSenderProps {
  onClose?: () => void;
}

const notificationTypes = [
  { value: NotificationType.USER_WELCOME, label: 'User Welcome' },
  { value: NotificationType.STATUS_CHANGE, label: 'Status Change' },
  { value: NotificationType.ONBOARDING_REMINDER, label: 'Onboarding Reminder' },
  { value: NotificationType.ONBOARDING_COMPLETE, label: 'Onboarding Complete' },
  { value: NotificationType.OFFBOARDING_INITIATED, label: 'Offboarding Initiated' },
  { value: NotificationType.MANAGER_TEAM_CHANGE, label: 'Manager Team Change' },
  { value: NotificationType.BULK_OPERATION_COMPLETE, label: 'Bulk Operation Complete' },
  { value: NotificationType.SYSTEM_MAINTENANCE, label: 'System Maintenance' },
  { value: NotificationType.PASSWORD_EXPIRY, label: 'Password Expiry' },
  { value: NotificationType.ACCOUNT_LOCKED, label: 'Account Locked' },
];

const priorityLevels = [
  { value: NotificationPriority.LOW, label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: NotificationPriority.NORMAL, label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: NotificationPriority.HIGH, label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: NotificationPriority.URGENT, label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export default function NotificationSender({ onClose }: NotificationSenderProps) {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [notificationType, setNotificationType] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [priority, setPriority] = useState<string>(NotificationPriority.NORMAL);
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [sendInApp, setSendInApp] = useState<boolean>(true);

  // Hooks
  const { data: usersData } = useUsers({ size: 1000 });
  const { data: departmentsData } = useDepartments({});
  const { data: branchesData } = useBranches({});

  const sendToUsers = useSendNotificationToUsers();
  const sendToDepartment = useSendNotificationToDepartment();
  const sendToBranch = useSendNotificationToBranch();
  const sendToAll = useSendNotificationToAll();

  const isLoading = sendToUsers.isPending || sendToDepartment.isPending || sendToBranch.isPending || sendToAll.isPending;

  const handleSendNotification = async () => {
    if (!notificationType || !title || !message) {
      return;
    }

    const notificationData = {
      notification_type: notificationType,
      title,
      message,
      priority,
      send_email: sendEmail,
      send_in_app: sendInApp,
    };

    try {
      switch (activeTab) {
        case 'users':
          if (selectedUsers.length === 0) return;
          await sendToUsers.mutateAsync({
            ...notificationData,
            user_ids: selectedUsers,
          });
          break;
        case 'department':
          if (!selectedDepartment) return;
          await sendToDepartment.mutateAsync({
            ...notificationData,
            department_id: selectedDepartment,
          });
          break;
        case 'branch':
          if (!selectedBranch) return;
          await sendToBranch.mutateAsync({
            ...notificationData,
            branch_id: selectedBranch,
          });
          break;
        case 'all':
          await sendToAll.mutateAsync(notificationData);
          break;
      }
      
      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      setSelectedDepartment('');
      setSelectedBranch('');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const canSend = () => {
    if (!notificationType || !title || !message) return false;
    
    switch (activeTab) {
      case 'users':
        return selectedUsers.length > 0;
      case 'department':
        return selectedDepartment !== '';
      case 'branch':
        return selectedBranch !== '';
      case 'all':
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Notification
        </CardTitle>
        <CardDescription>
          Send notifications to users, departments, branches, or all users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'department' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building className="h-4 w-4" />
            Department
          </button>
          <button
            onClick={() => setActiveTab('branch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'branch' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Branch
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="h-4 w-4" />
            All Users
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Users</label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {usersData?.items?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {user.first_name} {user.last_name} ({user.username})
                    </span>
                    <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {selectedUsers.length} user(s) selected
              </p>
            </div>
          </div>
        )}

        {activeTab === 'department' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a department</option>
                {departmentsData?.items?.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'branch' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a branch</option>
                {branchesData?.items?.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'all' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will send the notification to all active users in the system.
                Use with caution.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select notification type</option>
              {notificationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorityLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="send-email"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="send-email" className="text-sm font-medium text-gray-700">Send Email</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="send-in-app"
                checked={sendInApp}
                onChange={(e) => setSendInApp(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="send-in-app" className="text-sm font-medium text-gray-700">Send In-App</label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSendNotification}
              disabled={!canSend() || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Notification
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
