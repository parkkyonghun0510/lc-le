'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplicationStats } from '@/hooks/useApplications';
import { useUserStats } from '@/hooks/useUsers';
import { 
  DocumentTextIcon, 
  UsersIcon, 
  BuildingOfficeIcon, 
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { data: applicationStats } = useApplicationStats();
  const { data: userStats } = useUserStats();

  const stats = [
    {
      name: 'Total Applications',
      value: (applicationStats as any)?.total || 0,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Pending Applications',
      value: (applicationStats as any)?.pending || 0,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      name: 'Approved Applications',
      value: (applicationStats as any)?.approved || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Rejected Applications',
      value: (applicationStats as any)?.rejected || 0,
      icon: XCircleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">
              Welcome to the LC Workflow Management System
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{stat.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Applications */}
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Recent Applications
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Latest loan applications submitted to the system.</p>
                </div>
                <div className="mt-5">
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent applications</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Applications will appear here as they are submitted.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Overview */}
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  System Overview
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Current system statistics and user activity.</p>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Total Users</span>
                    </div>
                    <span className="text-sm text-gray-600">{(userStats as any)?.total_users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Departments</span>
                    </div>
                    <span className="text-sm text-gray-600">{(userStats as any)?.total_departments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Branches</span>
                    </div>
                    <span className="text-sm text-gray-600">{(userStats as any)?.total_branches || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}