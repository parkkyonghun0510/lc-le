'use client';

import { useState } from 'react';
import { Shield, Unlock, AlertTriangle, Clock, Users, Search } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { User } from '@/types/models';
import toast from 'react-hot-toast';

interface AccountLockoutManagementProps {
  className?: string;
}

export default function AccountLockoutManagement({ className = '' }: AccountLockoutManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const { data: usersData, isLoading } = useUsers({ 
    size: 100,
    search: searchTerm || undefined
  });

  const users = usersData?.items || [];
  
  // Filter users with failed login attempts
  const lockedUsers = users.filter(user => (user.failed_login_attempts || 0) > 0);
  const fullyLockedUsers = users.filter(user => (user.failed_login_attempts || 0) >= 5);

  const handleUnlockAccount = async (userId: string) => {
    try {
      // TODO: Implement API call to reset failed login attempts
      // await apiClient.post(`/users/${userId}/unlock-account`);
      
      toast.success('Account unlocked successfully');
      // Refresh users data
      window.location.reload();
    } catch (error) {
      toast.error('Failed to unlock account');
    }
  };

  const handleResetAttempts = async (userId: string) => {
    try {
      // TODO: Implement API call to reset failed login attempts
      // await apiClient.post(`/users/${userId}/reset-login-attempts`);
      
      toast.success('Login attempts reset successfully');
      // Refresh users data
      window.location.reload();
    } catch (error) {
      toast.error('Failed to reset login attempts');
    }
  };

  const getLockoutStatus = (user: User) => {
    const failedAttempts = user.failed_login_attempts || 0;
    const lastActivity = user.last_activity_at;
    
    if (failedAttempts >= 5 && lastActivity) {
      const lockoutExpiry = new Date(lastActivity);
      lockoutExpiry.setMinutes(lockoutExpiry.getMinutes() + 30);
      
      if (new Date() < lockoutExpiry) {
        return {
          status: 'locked',
          message: 'Account is locked',
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      }
    }
    
    if (failedAttempts > 0) {
      return {
        status: 'warning',
        message: `${failedAttempts} failed attempts`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      };
    }
    
    return {
      status: 'normal',
      message: 'No issues',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    };
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Account Lockout Management</h2>
            <p className="text-gray-600">Manage user account lockouts and failed login attempts</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fully Locked</p>
              <p className="text-2xl font-bold text-gray-900">{fullyLockedUsers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
              <p className="text-2xl font-bold text-gray-900">{lockedUsers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Users with Login Issues</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {lockedUsers.length === 0 ? (
            <div className="p-6 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users with failed login attempts</p>
            </div>
          ) : (
            lockedUsers.map((user) => {
              const lockoutStatus = getLockoutStatus(user);
              
              return (
                <div key={user.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${lockoutStatus.bgColor}`}>
                        <Shield className={`h-5 w-5 ${lockoutStatus.color}`} />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-sm font-medium ${lockoutStatus.color}`}>
                          {lockoutStatus.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.failed_login_attempts || 0} failed attempts
                        </p>
                        {user.last_activity_at && (
                          <p className="text-xs text-gray-400">
                            Last activity: {new Date(user.last_activity_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {lockoutStatus.status === 'locked' && (
                          <button
                            onClick={() => handleUnlockAccount(user.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                          >
                            <Unlock className="h-3 w-3" />
                            <span>Unlock</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleResetAttempts(user.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                        >
                          <Clock className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
