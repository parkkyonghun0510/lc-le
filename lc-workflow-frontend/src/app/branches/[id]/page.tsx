'use client';

import { useParams } from 'next/navigation';
import { useBranch } from '@/hooks/useBranches';
import { useUsers } from '@/hooks/useUsers';
import { ArrowLeft, MapPin, Building, Calendar, Users, Phone, Edit } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function BranchDetailPage() {
  const params = useParams();
  const branchId = params.id as string;
  
  const { data: branch, isLoading, error } = useBranch(branchId);
  const { data: usersData } = useUsers({ branch_id: branchId, size: 100 });

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

  if (error || !branch) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Branch not found</h2>
              <p className="text-gray-600 mt-2">The branch you're looking for doesn't exist.</p>
              <Link
                href="/branches"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Branches
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
                href="/branches"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Branches
              </Link>
            </div>
            <Link
              href={`/branches/${branchId}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Branch
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Branch Details</h1>
        </div>

        {/* Branch Overview Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
                <MapPin className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{branch.name}</h2>
                <p className="text-green-100 mt-1">
                  {branch.address || 'No address provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{usersData?.total || 0}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {usersData?.items?.filter(user => user.is_active).length || 0}
                </div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {usersData?.items?.filter(user => user.role === 'manager').length || 0}
                </div>
                <div className="text-sm text-gray-600">Managers</div>
              </div>
            </div>
          </div>

          {/* Branch Information */}
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Department</p>
                  <p className="text-sm text-gray-600">{department?.name || 'Loading...'}</p>
                </div>
              </div>
              {branch.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{branch.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">{formatDate(branch.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">{formatDate(branch.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Branch Users</h3>
              <Link
                href="/users/new"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Add User
              </Link>
            </div>
          </div>
          <div className="p-6">
            {usersData?.items?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No users found in this branch</p>
                <Link
                  href="/users/new"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add First User
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {usersData?.items?.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {user.role}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
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
                {(usersData?.total || 0) > 10 && (
                  <div className="text-center pt-4">
                    <Link
                      href={`/users?branch_id=${branchId}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View all {usersData?.total} users
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Branch ID:</span>
                <span className="ml-2 text-gray-600 font-mono">{branch.id}</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  </ProtectedRoute>
  );
}