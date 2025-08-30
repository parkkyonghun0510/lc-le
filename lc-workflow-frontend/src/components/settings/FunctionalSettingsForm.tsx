'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  useSettings, 
  useBulkUpdateSettings,
  useGeneralSettings,
  useSecuritySettings,
  useUserSettings,
  useApplicationSettings,
  useNotificationSettings
} from '@/hooks/useSettings';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SettingFormData {
  [key: string]: any;
}

interface FunctionalSettingsFormProps {
  category: string;
  title: string;
  description: string;
}

export function FunctionalSettingsForm({ category, title, description }: FunctionalSettingsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get settings data based on category
  const { data: settingsData, isLoading, error } = useSettings(category);
  const bulkUpdateMutation = useBulkUpdateSettings();

  const { register, handleSubmit, reset, watch, formState: { isDirty } } = useForm<SettingFormData>();

  // Watch for form changes
  const watchedValues = watch();

  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty, watchedValues]);

  // Reset form when data loads
  useEffect(() => {
    if (settingsData && settingsData[category]) {
      const formData: SettingFormData = {};
      Object.entries(settingsData[category]).forEach(([key, setting]: [string, any]) => {
        formData[key] = setting.value;
      });
      reset(formData);
    }
  }, [settingsData, category, reset]);

  const onSubmit = async (data: SettingFormData) => {
    try {
      await bulkUpdateMutation.mutateAsync(data);
      setIsEditing(false);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleCancel = () => {
    if (settingsData && settingsData[category]) {
      const formData: SettingFormData = {};
      Object.entries(settingsData[category]).forEach(([key, setting]: [string, any]) => {
        formData[key] = setting.value;
      });
      reset(formData);
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XMarkIcon className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              Failed to load settings: {error.message}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!settingsData || !settingsData[category]) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XMarkIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              No settings found for {category}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const settings = settingsData[category];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Edit Settings
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={bulkUpdateMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={!hasChanges || bulkUpdateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {bulkUpdateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {Object.entries(settings).map(([key, setting]: [string, any]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {setting.description || key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </label>
            
            {renderSettingInput(key, setting, register, isEditing)}
          </div>
        ))}
      </form>

      {hasChanges && isEditing && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function renderSettingInput(key: string, setting: any, register: any, isEditing: boolean) {
  const value = setting.value;
  const inputProps = {
    ...register(key),
    disabled: !isEditing,
    className: `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      !isEditing ? 'bg-gray-50 cursor-not-allowed' : ''
    }`
  };

  // Boolean settings
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          {...register(key)}
          disabled={!isEditing}
          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
            !isEditing ? 'cursor-not-allowed' : ''
          }`}
        />
        <span className="ml-2 text-sm text-gray-600">
          {setting.description || 'Enable this option'}
        </span>
      </div>
    );
  }

  // Number settings
  if (typeof value === 'number') {
    return (
      <input
        type="number"
        {...inputProps}
      />
    );
  }

  // Select options for specific settings
  if (key === 'default_language') {
    return (
      <select {...inputProps}>
        <option value="en">English</option>
        <option value="km">Khmer</option>
      </select>
    );
  }

  if (key === 'timezone') {
    return (
      <select {...inputProps}>
        <option value="Asia/Phnom_Penh">Asia/Phnom_Penh</option>
        <option value="UTC">UTC</option>
        <option value="Asia/Bangkok">Asia/Bangkok</option>
      </select>
    );
  }

  if (key === 'default_user_role') {
    return (
      <select {...inputProps}>
        <option value="officer">Officer</option>
        <option value="viewer">Viewer</option>
        <option value="manager">Manager</option>
      </select>
    );
  }

  // Text area for longer content
  if (key.includes('address') || key.includes('description')) {
    return (
      <textarea
        rows={3}
        {...inputProps}
      />
    );
  }

  // Default text input
  return (
    <input
      type="text"
      {...inputProps}
    />
  );
}