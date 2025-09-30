'use client';

import { 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  MoreVertical,
  User,
  Settings
} from 'lucide-react';
import { useState } from 'react';

interface UserActionsProps {
  userId: string;
  onEdit?: (userId: string) => void;
  onView?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  onLifecycle?: (userId: string) => void;
  onProfile?: (userId: string) => void;
  onSettings?: (userId: string) => void;
  variant?: 'dropdown' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserActions({
  userId,
  onEdit,
  onView,
  onDelete,
  onLifecycle,
  onProfile,
  onSettings,
  variant = 'inline',
  size = 'md',
  className = ''
}: UserActionsProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const actions = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: () => onView?.(userId),
      className: 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
    },
    {
      label: 'Edit User',
      icon: Edit,
      onClick: () => onEdit?.(userId),
      className: 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'
    },
    {
      label: 'Profile',
      icon: User,
      onClick: () => onProfile?.(userId),
      className: 'text-green-600 hover:text-green-900 hover:bg-green-50'
    },
    {
      label: 'Lifecycle Management',
      icon: Calendar,
      onClick: () => onLifecycle?.(userId),
      className: 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => onSettings?.(userId),
      className: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    },
    {
      label: 'Delete User',
      icon: Trash2,
      onClick: () => onDelete?.(userId),
      className: 'text-red-600 hover:text-red-900 hover:bg-red-50'
    }
  ].filter(action => {
    // Only show actions that have corresponding handlers
    switch (action.label) {
      case 'View Details': return !!onView;
      case 'Edit User': return !!onEdit;
      case 'Profile': return !!onProfile;
      case 'Lifecycle Management': return !!onLifecycle;
      case 'Settings': return !!onSettings;
      case 'Delete User': return !!onDelete;
      default: return false;
    }
  });

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`
            ${sizeClasses[size]}
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            rounded-full transition-colors
          `}
          title="More actions"
        >
          <MoreVertical className={iconSizes[size]} />
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick();
                        setShowDropdown(false);
                      }}
                      className={`
                        w-full px-4 py-2 text-left text-sm flex items-center space-x-3
                        hover:bg-gray-50 transition-colors
                        ${action.className}
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              ${sizeClasses[size]}
              rounded-full transition-colors
              ${action.className}
            `}
            title={action.label}
          >
            <Icon className={iconSizes[size]} />
          </button>
        );
      })}
    </div>
  );
}
