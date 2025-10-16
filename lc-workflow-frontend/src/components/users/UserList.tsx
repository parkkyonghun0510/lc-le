'use client';

import { useState } from 'react';
import { User } from '@/types/models';
import { DataTable, Column } from '@/components/ui/DataTable';
import { UserCard } from './UserCard';
import { UserStatusBadge } from './UserStatusBadge';
import { UserActions } from './UserActions';
import { UserAvatar, getInitials } from './OptimizedAvatar';
import { 
  Grid3X3, 
  List, 
  Table,
  Users as UsersIcon,
  Building,
  MapPin,
  Calendar,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserListProps {
  users: User[];
  departments?: any[];
  branches?: any[];
  positions?: any[];
  loading?: boolean;
  error?: string | null;
  
  // Pagination
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  
  // Selection
  selectedUsers: string[];
  onSelectAll: () => void;
  onSelectUser: (userId: string) => void;
  
  // Actions
  onEdit?: (userId: string) => void;
  onView?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  onLifecycle?: (userId: string) => void;
  onProfile?: (userId: string) => void;
  onSettings?: (userId: string) => void;
  
  // Search and filters
  search?: {
    value: string;
    onChange: (value: string) => void;
    onSearch?: () => void;
  };
  
  filters?: {
    showFilters: boolean;
    onToggleFilters: () => void;
    children: React.ReactNode;
  };
  
  // Additional actions
  onAdd?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onRefresh?: () => void;
  onClearFilters?: () => void;
  
  className?: string;
}

export function UserList({
  users,
  departments = [],
  branches = [],
  positions = [],
  loading = false,
  error = null,
  pagination,
  selectedUsers,
  onSelectAll,
  onSelectUser,
  onEdit,
  onView,
  onDelete,
  onLifecycle,
  onProfile,
  onSettings,
  search,
  filters,
  onAdd,
  onExport,
  onImport,
  onRefresh,
  onClearFilters,
  className = ''
}: UserListProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'list'>('table');

  // Table columns configuration
  const columns: Column<User>[] = [
    {
      key: 'user',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center">
          <UserAvatar
            user={user}
            alt={`${user.first_name} ${user.last_name}`}
            size="md"
            lazy={true}
          />
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400">@{user.username}</div>
            {user.employee_id && (
              <div className="text-xs text-gray-400">ID: {user.employee_id}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            user.role === 'admin' 
              ? 'bg-purple-100 text-purple-800'
              : user.role === 'manager'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {user.role}
          </span>
          {user.position && (
            <span className="text-xs text-gray-500">{user.position.name}</span>
          )}
        </div>
      )
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (user: User) => {
        const department = departments.find(d => d.id === user.department_id);
        const branch = branches.find(b => b.id === user.branch_id);
        
        return (
          <div className="space-y-1">
            {department && (
              <div className="flex items-center space-x-1 text-sm">
                <Building className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{department.name}</span>
              </div>
            )}
            {branch && (
              <div className="flex items-center space-x-1 text-sm">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{branch.name}</span>
              </div>
            )}
            {!department && !branch && (
              <span className="text-gray-400 text-sm">Not assigned</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'managers',
      label: 'Managers',
      render: (user: User) => (
        <div className="space-y-1">
          {user.portfolio && (
            <div className="text-sm">
              <span className="text-blue-600 font-medium">Portfolio:</span>
              <div className="text-xs text-gray-600">
                {user.portfolio.full_name_latin}
              </div>
            </div>
          )}
          {user.line_manager && (
            <div className="text-sm">
              <span className="text-green-600 font-medium">Line:</span>
              <div className="text-xs text-gray-600">
                {user.line_manager.full_name_latin}
              </div>
            </div>
          )}
          {!user.portfolio && !user.line_manager && (
            <span className="text-gray-400 text-sm">Not assigned</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user: User) => (
        <div className="space-y-1">
          <UserStatusBadge status={user.status} size="sm" />
          {user.status_reason && (
            <div className="text-xs text-gray-500 max-w-32 truncate" title={user.status_reason}>
              {user.status_reason}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'activity',
      label: 'Activity',
      sortable: true,
      render: (user: User) => {
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
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm">
              <Activity className="h-3 w-3 text-gray-400" />
              <span className={activityStatus.color}>{activityStatus.text}</span>
            </div>
            <div className="text-xs text-gray-500">
              Last login: {user.last_login_at 
                ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                : 'Never'
              }
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <UserActions
          userId={user.id}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onLifecycle={onLifecycle}
          onProfile={onProfile}
          onSettings={onSettings}
          variant="dropdown"
          size="sm"
        />
      )
    }
  ];

  // Card renderer for card view
  const cardRenderer = (user: User, index: number) => (
    <UserCard
      key={user.id}
      user={user}
      departments={departments}
      branches={branches}
      onEdit={onEdit}
      onView={onView}
      onDelete={onDelete}
      onLifecycle={onLifecycle}
      showActions={true}
    />
  );

  // List renderer for list view
  const listRenderer = (user: User, index: number) => (
    <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <UserAvatar
            user={user}
            alt={`${user.first_name} ${user.last_name}`}
            size="md"
            lazy={true}
          />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400">@{user.username}</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <UserStatusBadge status={user.status} size="sm" />
          <UserActions
            userId={user.id}
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
            onLifecycle={onLifecycle}
            onProfile={onProfile}
            onSettings={onSettings}
            variant="inline"
            size="sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* View Mode Toggle */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Table className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        error={error}
        emptyMessage="No users found"
        emptyIcon={<UsersIcon className="h-12 w-12 text-gray-400 mx-auto" />}
        pagination={pagination}
        selection={{
          selectedItems: selectedUsers,
          onSelectAll,
          onSelectItem: onSelectUser,
          getItemId: (user) => user.id
        }}
        actions={{
          onAdd,
          onExport,
          onImport,
          onRefresh,
          onClearFilters
        }}
        search={search}
        filters={filters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        cardRenderer={cardRenderer}
        listRenderer={listRenderer}
      />
    </div>
  );
}
