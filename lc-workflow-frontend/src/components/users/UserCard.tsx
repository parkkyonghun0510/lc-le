'use client';

import React, { memo, useMemo } from 'react';
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
import { UserAvatar } from './OptimizedAvatar';

// Sub-components
interface UserHeaderProps {
  user: User;
  onEdit?: (userId: string) => void;
  onView?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  onLifecycle?: (userId: string) => void;
  showActions?: boolean;
}

interface UserContactInfoProps {
  user: User;
}

interface UserOrganizationInfoProps {
  user: User;
  departments?: any[];
  branches?: any[];
}

interface UserActivityInfoProps {
  user: User;
}

const UserHeader: React.FC<UserHeaderProps> = memo(function UserHeader({
  user,
  onEdit,
  onView,
  onDelete,
  onLifecycle,
  showActions = true
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <UserAvatar
            user={user}
            alt={`${user.first_name} ${user.last_name}`}
            size="lg"
            lazy={false}
            priority={true}
          />
          {/* Online status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 sm:h-4 sm:w-4 bg-green-400 border-2 border-white rounded-full"></div>
        </div>
        <div className="min-w-0 flex-1">
          <h3
            id={`user-${user.id}-name`}
            className="text-base sm:text-lg font-semibold text-gray-900 truncate"
          >
            {user.first_name} {user.last_name}
          </h3>
          <p className="text-sm text-gray-500 truncate" aria-label={`Username: ${user.username}`}>
            @{user.username}
          </p>
          {user.employee_id && (
            <p className="text-xs text-gray-400" aria-label={`Employee ID: ${user.employee_id}`}>
              ID: {user.employee_id}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-2">
        <UserStatusBadge status={user.status} size="sm" />
        {showActions && (
          <UserActions
            userId={user.id}
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
            onLifecycle={onLifecycle}
            variant="dropdown"
            size="sm"
          />
        )}
      </div>
    </div>
  );
});

const UserContactInfo: React.FC<UserContactInfoProps> = memo(function UserContactInfo({ user }) {
  const getRoleIcon = useMemo(() => {
    const RoleIcon = (role: string) => {
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
    return RoleIcon;
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate">{user.email}</span>
        </div>
        {user.phone_number && (
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600">{user.phone_number}</span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          {getRoleIcon(user.role)}
          <span className="text-sm text-gray-600 capitalize">{user.role}</span>
        </div>
        {user.position && (
          <div className="flex items-center space-x-3">
            <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{user.position.name}</span>
          </div>
        )}
      </div>
    </div>
  );
});

const UserOrganizationInfo: React.FC<UserOrganizationInfoProps> = memo(function UserOrganizationInfo({ user, departments = [], branches = [] }) {
  const department = useMemo(() => departments.find(d => d.id === user.department_id), [departments, user.department_id]);
  const branch = useMemo(() => branches.find(b => b.id === user.branch_id), [branches, user.branch_id]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="space-y-3">
        {department && (
          <div className="flex items-center space-x-3">
            <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{department.name}</span>
          </div>
        )}
        {branch && (
          <div className="flex items-center space-x-3">
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{branch.name}</span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {user.portfolio && (
          <div className="flex items-center space-x-3">
            <Users className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Portfolio Manager</div>
              <span className="text-sm text-gray-600 truncate">
                {user.portfolio.full_name_latin}
              </span>
            </div>
          </div>
        )}
        {user.line_manager && (
          <div className="flex items-center space-x-3">
            <Users className="h-4 w-4 text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Line Manager</div>
              <span className="text-sm text-gray-600 truncate">
                {user.line_manager.full_name_latin}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const UserActivityInfo: React.FC<UserActivityInfoProps> = memo(function UserActivityInfo({ user }) {
  const activityStatus = useMemo(() => {
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
  }, [user.last_activity_at]);

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className={`text-sm ${activityStatus.color}`}>{activityStatus.text}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate">
            {user.last_login_at
              ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
              : 'Never logged in'
            }
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate">
            Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Additional Status Information */}
      <div className="space-y-2">
        {(user.failed_login_attempts && user.failed_login_attempts > 0) && (
          <div className="flex items-center space-x-2 text-sm text-orange-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{user.failed_login_attempts} failed login attempts</span>
          </div>
        )}

        {user.onboarding_completed && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>Onboarding completed</span>
          </div>
        )}

        {user.status_reason && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Status reason:</span> {user.status_reason}
          </div>
        )}
      </div>
    </div>
  );
});

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

export const UserCard = memo(function UserCard({
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
  return (
    <article
      className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${className}`}
      role="article"
      aria-labelledby={`user-${user.id}-name`}
    >
      <UserHeader
        user={user}
        onEdit={onEdit}
        onView={onView}
        onDelete={onDelete}
        onLifecycle={onLifecycle}
        showActions={showActions}
      />

      <UserContactInfo user={user} />

      <UserOrganizationInfo
        user={user}
        departments={departments}
        branches={branches}
      />

      <UserActivityInfo user={user} />
    </article>
  );
});
