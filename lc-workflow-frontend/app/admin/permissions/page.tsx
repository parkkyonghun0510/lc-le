'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PermissionMatrixTab from './components/PermissionMatrixTab';
import RolesTab from './components/RolesTab';
import TemplatesTab from './components/TemplatesTab';
import UsersTab from './components/UsersTab';
import AuditTrailTab from './components/AuditTrailTab';

type TabType = 'matrix' | 'roles' | 'templates' | 'users' | 'audit';

export default function PermissionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('matrix');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication and authorization
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user has admin role
      const hasAdminRole = user.role === 'admin';
      
      if (!hasAdminRole) {
        router.push('/unauthorized');
        return;
      }

      setIsAuthorized(true);
      setCheckingAuth(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  const tabs = [
    { id: 'matrix' as TabType, label: 'Permission Matrix', icon: '🔲' },
    { id: 'roles' as TabType, label: 'Roles', icon: '👥' },
    { id: 'templates' as TabType, label: 'Templates', icon: '📋' },
    { id: 'users' as TabType, label: 'User Permissions', icon: '👤' },
    { id: 'audit' as TabType, label: 'Audit Trail', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Permission Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage roles, permissions, templates, and audit trail
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3 text-sm font-medium rounded-t-lg transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'matrix' && <PermissionMatrixTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit' && <AuditTrailTab />}
      </div>
    </div>
  );
}
