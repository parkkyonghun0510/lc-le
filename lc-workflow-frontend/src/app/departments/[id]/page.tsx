'use client';

import { useParams } from 'next/navigation';
import { useDepartmentWithRelations } from '@/hooks/useDepartments';
import { ArrowLeft, Building, Calendar, Users, MapPin, Edit } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DepartmentDetailPage() {
  const params = useParams();
  const departmentId = params.id as string;
  
  const { data: department, isLoading, error } = useDepartmentWithRelations(departmentId);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !department) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Department not found</h2>
              <p className="text-gray-600 mt-2">The department you're looking for doesn't exist.</p>
              <Link
                href="/departments"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Departments
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/departments"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Departments
              </Link>
            </div>
            <Link
              href={`/departments/${departmentId}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Department
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Department Details</h1>
        </div>

        {/* Department Overview Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
                <Building className="h-10 w-10 text-blue-600" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{department.name}</h2>
                <p className="text-blue-100 mt-1">
                  {department.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{department.user_count || 0}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{department.branch_count || 0}</div>
                <div className="text-sm text-gray-600">Branches</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {department.active_user_count || 0}
                </div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
            </div>
          </div>

          {/* Department Information */}
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">{formatDate(department.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">{formatDate(department.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Branches and Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Branches */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Branches</h3>
                <Link
                  href="/branches/new"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Add Branch
                </Link>
              </div>
            </div>
            <div className="p-6">
              {(!department.branches || department.branches.length === 0) ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No branches found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {department.branches.slice(0, 5).map((branch) => (
                    <div key={branch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                          <p className="text-xs text-gray-500">{branch.address || 'No address'}</p>
                        </div>
                      </div>
                      <Link
                        href={`/branches/${branch.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                  {department.branches.length > 5 && (
                    <div className="text-center pt-4">
                      <Link
                        href={`/branches?department_id=${departmentId}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View all {department.branches.length} branches
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                <Link
                  href="/users/new"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Add User
                </Link>
              </div>
            </div>
            <div className="p-6">
              {(!department.users || department.users.length === 0) ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No users found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {department.users.slice(0, 5).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <Link
                          href={`/users/${user.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                  {department.users.length > 5 && (
                    <div className="text-center pt-4">
                      <Link
                        href={`/users?department_id=${departmentId}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View all {department.users.length} users
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Department ID:</span>
                <span className="ml-2 text-gray-600 font-mono">{department.id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Name:</span>
                <span className="ml-2 text-gray-600">{department.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  </ProtectedRoute>
  );
}