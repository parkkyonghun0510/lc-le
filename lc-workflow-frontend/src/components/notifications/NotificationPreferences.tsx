'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Clock, Save, RotateCcw } from 'lucide-react';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotifications';
import type { NotificationPreferences } from '@/types/notifications';
import { NotificationType } from '@/types/notifications';
import toast from 'react-hot-toast';

const NOTIFICATION_TYPES = [
  { key: NotificationType.USER_WELCOME, label: 'User Welcome', description: 'New user account created' },
  { key: NotificationType.STATUS_CHANGE, label: 'Status Changes', description: 'User status updates' },
  { key: NotificationType.ONBOARDING_REMINDER, label: 'Onboarding Reminders', description: 'Overdue onboarding tasks' },
  { key: NotificationType.ONBOARDING_COMPLETE, label: 'Onboarding Complete', description: 'User completed onboarding' },
  { key: NotificationType.OFFBOARDING_INITIATED, label: 'Offboarding', description: 'User offboarding initiated' },
  { key: NotificationType.MANAGER_TEAM_CHANGE, label: 'Team Changes', description: 'Team member changes' },
  { key: NotificationType.BULK_OPERATION_COMPLETE, label: 'Bulk Operations', description: 'Bulk operation completion' },
  { key: NotificationType.SYSTEM_MAINTENANCE, label: 'System Maintenance', description: 'System maintenance alerts' },
  { key: NotificationType.PASSWORD_EXPIRY, label: 'Password Expiry', description: 'Password expiration warnings' },
  { key: NotificationType.ACCOUNT_LOCKED, label: 'Account Locked', description: 'Account lockout alerts' },
];

export default function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handlePreferenceChange = (channel: 'email_notifications' | 'in_app_notifications', type: NotificationType, enabled: boolean) => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => ({
      ...prev!,
      [channel]: {
        ...prev![channel],
        [type]: enabled
      }
    }));
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: 'immediate' | 'daily' | 'weekly') => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => ({
      ...prev!,
      notification_frequency: frequency
    }));
    setHasChanges(true);
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => ({
      ...prev!,
      quiet_hours: {
        ...prev!.quiet_hours,
        enabled
      }
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => ({
      ...prev!,
      quiet_hours: {
        ...prev!.quiet_hours,
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localPreferences) return;
    
    try {
      await updatePreferences.mutateAsync(localPreferences);
      setHasChanges(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  };

  if (isLoading || !localPreferences) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Reset changes"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || updatePreferences.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Notification Types</h4>
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h5 className="text-sm font-medium text-gray-900">{type.label}</h5>
                </div>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Email notifications */}
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localPreferences.email_notifications[type.key]}
                      onChange={(e) => handlePreferenceChange('email_notifications', type.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                </div>
                
                {/* In-app notifications */}
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-gray-400" />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localPreferences.in_app_notifications[type.key]}
                      onChange={(e) => handlePreferenceChange('in_app_notifications', type.key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Frequency */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Notification Frequency</h4>
        <div className="flex space-x-4">
          {[
            { value: 'immediate', label: 'Immediate' },
            { value: 'daily', label: 'Daily Digest' },
            { value: 'weekly', label: 'Weekly Digest' }
          ].map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value={option.value}
                checked={localPreferences.notification_frequency === option.value}
                onChange={(e) => handleFrequencyChange(e.target.value as any)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Quiet Hours</h4>
        <div className="flex items-center space-x-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localPreferences.quiet_hours.enabled}
              onChange={(e) => handleQuietHoursToggle(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable quiet hours</span>
          </label>
        </div>
        
        {localPreferences.quiet_hours.enabled && (
          <div className="flex items-center space-x-4 pl-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">From:</span>
              <input
                type="time"
                value={localPreferences.quiet_hours.start_time}
                onChange={(e) => handleTimeChange('start_time', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">To:</span>
              <input
                type="time"
                value={localPreferences.quiet_hours.end_time}
                onChange={(e) => handleTimeChange('end_time', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
