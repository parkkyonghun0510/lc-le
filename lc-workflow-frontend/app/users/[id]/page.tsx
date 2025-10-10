'use client';

import { useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUsers';
import { ArrowLeft, Mail, Phone, Calendar, Shield, IdCardLanyard, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DepartmentBadge, BranchBadge, PositionBadge, UserManagerBadge } from '@/components/organization';

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const { data: user, isLoading, error } = useUser(userId);

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

  if (error || !user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
              <p className="text-gray-600 mt-2">The user you're looking for doesn't exist.</p>
              <Link
                href="/users"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Users
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'officer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/users"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Back to Users
                </Link>
              </div>
              <Link
                href={`/users/${userId}/edit`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit User
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">User Details</h1>
          </div>

          {/* User Profile Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
              <div className="flex items-center space-x-4">
                <div className="relative h-20 w-20 bg-white rounded-full flex items-center justify-center">
                  {user.profile_image_url ? (
                    <img
                      src={user.profile_image_url}
                      alt={`${user.first_name} ${user.last_name}`}
                      className="h-18 w-18 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-18 w-18 text-blue-600" />
                  )}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">
                    {user.first_name} {user.last_name}
                  </h2>
                  <p className="text-blue-100">@{user.username}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    {user.phone_number && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm text-gray-600">{user.phone_number}</p>
                        </div>
                      </div>
                    )}
                    {user.employee_id && (
                      <div className="flex items-center space-x-3">
                        <IdCardLanyard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Employee ID</p>
                          <p className="text-sm text-gray-600">{user.employee_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organization Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Department</p>
                      <DepartmentBadge
                        department={user.department}
                        size="md"
                        showCode={true}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Branch</p>
                      <BranchBadge
                        branch={user.branch}
                        size="md"
                        showCode={true}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Position</p>
                      <PositionBadge
                        position={user.position}
                        size="md"
                        showCode={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Management Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Portfolio</p>
                      <UserManagerBadge
                        manager={user.portfolio}
                        type="portfolio"
                        size="md"
                        showPhone={true}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Line Manager</p>
                      <UserManagerBadge
                        manager={user.line_manager}
                        type="line_manager"
                        size="md"
                        showPhone={true}
                      />
                    </div>
                    {!user.portfolio && !user.line_manager && (
                      <div className="col-span-2 text-center py-4">
                        <p className="text-sm text-gray-500">No management assignments</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">{formatDate(user.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-sm text-gray-600">{formatDate(user.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">User ID:</span>
                      <span className="ml-2 text-gray-600 font-mono">{user.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Username:</span>
                      <span className="ml-2 text-gray-600">{user.username}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Role:</span>
                      <span className="ml-2 text-gray-600 capitalize">{user.role}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Status:</span>
                      <span className={`ml-2 ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
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