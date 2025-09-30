'use client';

import { User } from '@/types/models';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Users, 
  Calendar,
  Clock,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserStatusBadge } from './UserStatusBadge';
import { UserActions } from './UserActions';

interface UserCardProps {
  user: User;
  departments?: any[];
  branches?: any[];
  onEdit?: (userId: string) => void;
  onView?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  onLifecycle?: (userId: string) => void;
  showActions?: boolean;
  className?: string;
}

export function UserCard({ 
  user, 
  departments = [], 
  branches = [], 
  onEdit, 
  onView, 
  onDelete, 
  onLifecycle,
  showActions = true,
  className = ''
}: UserCardProps) {
  const department = departments.find(d => d.id === user.department_id);
  const branch = branches.find(b => b.id === user.branch_id);
  const position = user.position;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'manager':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'officer':
        return <UserIcon className="h-4 w-4 text-green-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityStatus = () => {
    if (!user.last_activity_at) return { status: 'inactive', text: 'Never active', color: 'text-gray-500' };
    
    const lastActivity = new Date(user.last_activity_at);
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActivity <= 1) {
      return { status: 'active', text: 'Active today', color: 'text-green-600' };
    } else if (daysSinceActivity <= 7) {
      return { status: 'recent', text: `${daysSinceActivity} days ago`, color: 'text-yellow-600' };
    } else {
      return { status: 'inactive', text: `${daysSinceActivity} days ago`, color: 'text-red-600' };
    }
  };

  const activityStatus = getActivityStatus();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-sm text-gray-500">@{user.username}</p>
            {user.employee_id && (
              <p className="text-xs text-gray-400">ID: {user.employee_id}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <UserStatusBadge status={user.status} />
          {showActions && (
            <UserActions
              userId={user.id}
              onEdit={onEdit}
              onView={onView}
              onDelete={onDelete}
              onLifecycle={onLifecycle}
            />
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{user.email}</span>
          </div>
          {user.phone_number && (
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{user.phone_number}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            {getRoleIcon(user.role)}
            <span className="text-gray-600 capitalize">{user.role}</span>
          </div>
          {position && (
            <div className="flex items-center space-x-2 text-sm">
              <Building className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{position.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Organization Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          {department && (
            <div className="flex items-center space-x-2 text-sm">
              <Building className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{department.name}</span>
            </div>
          )}
          {branch && (
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{branch.name}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {user.portfolio && (
            <div className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-gray-600">
                Portfolio: {user.portfolio.first_name} {user.portfolio.last_name}
              </span>
            </div>
          )}
          {user.line_manager && (
            <div className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4 text-green-400" />
              <span className="text-gray-600">
                Manager: {user.line_manager.first_name} {user.line_manager.last_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Activity and Status Information */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-gray-400" />
            <span className={activityStatus.color}>{activityStatus.text}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {user.last_login_at 
                ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                : 'Never logged in'
              }
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Additional Status Information */}
        {(user.failed_login_attempts && user.failed_login_attempts > 0) && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span>{user.failed_login_attempts} failed login attempts</span>
          </div>
        )}

        {user.onboarding_completed && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Onboarding completed</span>
          </div>
        )}

        {user.status_reason && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Status reason:</span> {user.status_reason}
          </div>
        )}
      </div>
    </div>
  );
}
