'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { 
  useDashboardStats, 
  useRecentApplications, 
  useActivityTimeline, 
  usePerformanceMetrics 
} from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import { 
  DocumentTextIcon, 
  UsersIcon, 
  BuildingOfficeIcon, 
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatBytes, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: recentApplications, isLoading: appsLoading } = useRecentApplications(5);
  const { data: activityTimeline, isLoading: activityLoading } = useActivityTimeline(7);
  const { data: performanceMetrics, isLoading: metricsLoading } = usePerformanceMetrics();

  const stats = [
    {
      name: 'Total Applications',
      value: dashboardStats?.applications.total || 0,
      change: '+12%',
      changeType: 'positive',
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/applications',
    },
    {
      name: 'Pending Applications',
      value: dashboardStats?.applications.pending || 0,
      change: '+5%',
      changeType: 'neutral',
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/applications?status=submitted',
    },
    {
      name: 'Approved Applications',
      value: dashboardStats?.applications.approved || 0,
      change: '+8%',
      changeType: 'positive',
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/applications?status=approved',
    },
    {
      name: 'Rejected Applications',
      value: dashboardStats?.applications.rejected || 0,
      change: '-2%',
      changeType: 'negative',
      icon: XCircleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/applications?status=rejected',
    },
  ];

  const systemStats = [
    {
      name: 'Total Users',
      value: dashboardStats?.users.total || 0,
      icon: UsersIcon,
      href: '/users',
    },
    {
      name: 'Departments',
      value: dashboardStats?.departments.total || 0,
      icon: BuildingOfficeIcon,
      href: '/departments',
    },
    {
      name: 'Branches',
      value: dashboardStats?.branches.total || 0,
      icon: MapPinIcon,
      href: '/branches',
    },
    {
      name: 'Files',
      value: dashboardStats?.files.total || 0,
      icon: FolderIcon,
      href: '/files',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'submitted': return 'text-blue-600 bg-blue-50';
      case 'under_review': return 'text-yellow-600 bg-yellow-50';
      case 'draft': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application': return DocumentTextIcon;
      case 'user': return UsersIcon;
      default: return DocumentTextIcon;
    }
  };

  if (statsError) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error loading dashboard</h2>
              <p className="text-gray-600 mb-4">Unable to load dashboard statistics</p>
              <button
                onClick={() => refetchStats()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-400">
                Welcome back, {user?.first_name}! Here's what's happening with your applications.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Link key={stat.name} href={stat.href}>
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow hover:shadow-md transition-shadow cursor-pointer sm:p-6">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-md p-3 ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {statsLoading ? (
                              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                            ) : (
                              stat.value.toLocaleString()
                            )}
                          </div>
                          {stat.change && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                              stat.changeType === 'positive' ? 'text-green-600' : 
                              stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {stat.change}
                            </div>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Processed (30d)</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metricsLoading ? (
                            <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                          ) : (
                            performanceMetrics.applications_processed_30d
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Avg. Processing</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metricsLoading ? (
                            <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                          ) : (
                            `${performanceMetrics.average_processing_time_days} days`
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Approval Rate</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metricsLoading ? (
                            <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                          ) : (
                            `${performanceMetrics.approval_rate_percentage}%`
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FolderIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Storage Used</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {statsLoading ? (
                            <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                          ) : (
                            formatBytes(dashboardStats?.files.total_size || 0)
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent Applications */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">ពាក្យសុំកម្ចីថ្មីៗ</h3>
                    <Link href="/applications" className="text-sm text-blue-600 hover:text-blue-800">
                      មើលទាំងអស់
                    </Link>
                  </div>
                  
                  {appsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4">
                          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentApplications && recentApplications.length > 0 ? (
                    <div className="space-y-4">
                      {recentApplications.map((app) => (
                        <Link key={app.id} href={`/applications/${app.id}`}>
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-all cursor-pointer">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {app.full_name_khmer || app.full_name_latin || 'មិនបានបញ្ជាក់ឈ្មោះ'}
                                  </p>
                                  {app.full_name_khmer && app.full_name_latin && (
                                    <span className="text-xs text-gray-500">({app.full_name_latin})</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                                    {app.requested_amount ? formatCurrency(app.requested_amount) : 'មិនបានបញ្ជាក់'}
                                  </span>
                                  {app.phone && (
                                    <span className="flex items-center">
                                      <PhoneIcon className="w-4 h-4 mr-1" />
                                      {app.phone}
                                    </span>
                                  )}
                                  {app.portfolio_officer_name && (
                                    <span className="flex items-center">
                                      <UserIcon className="w-4 h-4 mr-1" />
                                      {app.portfolio_officer_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                  {app.status === 'draft' && 'ព្រាង'}
                                  {app.status === 'submitted' && 'បានដាក់ស្នើ'}
                                  {app.status === 'under_review' && 'កំពុងពិនិត្យ'}
                                  {app.status === 'approved' && 'អនុម័ត'}
                                  {app.status === 'rejected' && 'បដិសេធ'}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDate(app.created_at)}
                                </p>
                              </div>
                              <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">មិនមានពាក្យសុំថ្មី</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        ពាក្យសុំនឹងបង្ហាញនៅទីនេះនៅពេលដែលត្រូវបានដាក់ស្នើ
                      </p>
                      <div className="mt-4">
                        <Link
                          href="/applications/new"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          បង្កើតពាក្យសុំថ្មី
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Overview & Activity */}
            <div className="space-y-6">
              {/* System Overview */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
                  <div className="space-y-4">
                    {systemStats.map((stat) => (
                      <Link key={stat.name} href={stat.href}>
                        <div className="flex items-center justify-between hover:bg-gray-50 p-2 rounded cursor-pointer">
                          <div className="flex items-center">
                            <stat.icon className="h-5 w-5 text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-900">{stat.name}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {statsLoading ? (
                              <div className="animate-pulse bg-gray-200 h-4 w-8 rounded"></div>
                            ) : (
                              stat.value.toLocaleString()
                            )}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  
                  {activityLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-start space-x-3">
                          <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activityTimeline && activityTimeline.length > 0 ? (
                    <div className="space-y-4">
                      {activityTimeline.slice(0, 5).map((activity) => {
                        const ActivityIcon = getActivityIcon(activity.type);
                        return (
                          <div key={activity.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <ActivityIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                              <p className="text-sm text-gray-500">{activity.description}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CalendarIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}