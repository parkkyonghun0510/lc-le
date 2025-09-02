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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 sm:mb-8">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">ទិដ្ឋភាពទូទៅនៃប្រព័ន្ធ</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-4 lg:mb-0">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                    Welcome back, <span className="font-semibold text-gray-800 dark:text-gray-200">{user?.first_name}</span>! 
                    Here's your comprehensive overview of applications and system performance.
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Live Data</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 dark:border-gray-600">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Updated</div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => refetchStats()}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm w-full sm:w-auto"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Link key={stat.name} href={stat.href}>
                <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-1">
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className={`flex-shrink-0 rounded-lg sm:rounded-xl p-2 sm:p-3 ${stat.bgColor} dark:${stat.bgColor.replace('bg-', 'bg-').replace('-50', '-900')} group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color} dark:${stat.color.replace('text-', 'text-').replace('-600', '-400')}`} aria-hidden="true" />
                      </div>
                      {stat.change && (
                        <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900' : 
                          stat.changeType === 'negative' ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900' : 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {stat.changeType === 'positive' && '↗'}
                          {stat.changeType === 'negative' && '↘'}
                          {stat.change}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        {stat.name}
                      </h3>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
                        {statsLoading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-9 w-20 rounded-lg"></div>
                        ) : (
                          <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            {stat.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Hover indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-800 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Metrics</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Key performance indicators for the last 30 days</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-blue-600 bg-blue-200/50 px-2 py-1 rounded-full">30d</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Processed</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {metricsLoading ? (
                        <div className="animate-pulse bg-blue-200 h-7 w-16 rounded"></div>
                      ) : (
                        performanceMetrics.applications_processed_30d
                      )}
                    </p>
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <ClockIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-amber-600 bg-amber-200/50 px-2 py-1 rounded-full">Avg</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Processing Time</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {metricsLoading ? (
                        <div className="animate-pulse bg-amber-200 h-7 w-20 rounded"></div>
                      ) : (
                        `${performanceMetrics.average_processing_time_days}d`
                      )}
                    </p>
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-green-600 bg-green-200/50 px-2 py-1 rounded-full">Rate</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Approval Rate</p>
                    <div className="text-2xl font-bold text-green-900">
                      {metricsLoading ? (
                        <div className="animate-pulse bg-green-200 h-7 w-16 rounded"></div>
                      ) : (
                        `${performanceMetrics.approval_rate_percentage}%`
                      )}
                    </div>
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <FolderIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-purple-600 bg-purple-200/50 px-2 py-1 rounded-full">Total</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Storage Used</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-purple-200 h-7 w-20 rounded"></div>
                      ) : (
                        formatBytes(dashboardStats?.files.total_size || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Recent Applications */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 dark:from-gray-800 dark:via-gray-800/90 dark:to-gray-900/50 shadow-sm rounded-xl sm:rounded-2xl border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm">
                <div className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">ពាក្យសុំកម្ចីថ្មីៗ</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Recent loan applications</p>
                      </div>
                    </div>
                    <Link 
                      href="/applications" 
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      មើលទាំងអស់
                      <ArrowTrendingUpIcon className="ml-2 h-4 w-4" />
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
                    <div className="space-y-3">
                      {recentApplications.map((app) => (
                        <Link key={app.id} href={`/applications/${app.id}`}>
                          <div className="group relative bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-5 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900 dark:hover:to-indigo-900 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer hover:shadow-md">
                            {/* Hover indicator line */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="flex-shrink-0">
                                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-blue-800 dark:group-hover:to-indigo-800 rounded-2xl flex items-center justify-center transition-colors duration-300">
                                    <DocumentTextIcon className="h-7 w-7 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-300 truncate">
                                      {app.full_name_khmer || app.full_name_latin || 'មិនបានបញ្ជាក់ឈ្មោះ'}
                                    </h4>
                                    {app.full_name_khmer && app.full_name_latin && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">({app.full_name_latin})</span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-2">
                                        <CurrencyDollarIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                                      </div>
                                      <span className="font-medium">
                                        {app.requested_amount ? formatCurrency(app.requested_amount) : 'មិនបានបញ្ជាក់'}
                                      </span>
                                    </div>
                                    {app.phone && (
                                      <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                                        <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-2">
                                          <PhoneIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span>{app.phone}</span>
                                      </div>
                                    )}
                                    {app.portfolio_officer_name && (
                                      <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                                        <div className="w-5 h-5 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-2">
                                          <UserIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="truncate">{app.portfolio_officer_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 ml-4">
                                <div className="text-right">
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold ${getStatusColor(app.status)} shadow-sm`}>
                                    {app.status === 'draft' && 'ព្រាង'}
                                    {app.status === 'submitted' && 'បានដាក់ស្នើ'}
                                    {app.status === 'under_review' && 'កំពុងពិនិត្យ'}
                                    {app.status === 'approved' && 'អនុម័ត'}
                                    {app.status === 'rejected' && 'បដិសេធ'}
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                    {formatDate(app.created_at)}
                                  </p>
                                </div>
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 rounded-lg flex items-center justify-center transition-colors duration-300">
                                  <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-gray-800/50 dark:to-gray-900/30 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-2xl flex items-center justify-center mb-4">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">មិនមានពាក្យសុំថ្មី</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                        ពាក្យសុំនឹងបង្ហាញនៅទីនេះនៅពេលដែលត្រូវបានដាក់ស្នើ
                      </p>
                      <div className="mt-4">
                        <Link
                          href="/applications/new"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
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
            <div className="space-y-4 sm:space-y-6">
              {/* System Overview */}
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-600 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">ព័ត៌មានប្រព័ន្ធ</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ស្ថានភាពប្រព័ន្ធបច្ចុប្បន្ន</p>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                
                <div className="grid gap-4">
                  <div className="group relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">ស្ថានភាពប្រព័ន្ធ</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">ប្រព័ន្ធដំណើរការបានល្អ</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 shadow-sm">
                          ធម្មតា
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">99.9% uptime</p>
                      </div>
                    </div>
                  </div>
                  
                  {systemStats.map((stat) => (
                    <Link key={stat.name} href={stat.href}>
                      <div className="group relative bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-300 cursor-pointer">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 group-hover:from-blue-100 group-hover:to-indigo-100 dark:group-hover:from-blue-800 dark:group-hover:to-indigo-800 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                              <stat.icon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-300">{stat.name}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Active records</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-300">
                              {statsLoading ? (
                                <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-6 w-12 rounded"></div>
                              ) : (
                                stat.value.toLocaleString()
                              )}
                            </span>
                            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 rounded-lg flex items-center justify-center mt-1 transition-colors duration-300">
                              <ArrowTrendingUpIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-600 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                      <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">សកម្មភាពថ្មីៗ</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ប្រវត្តិសកម្មភាពចុងក្រោយ</p>
                    </div>
                  </div>
                </div>
                
                {activityLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                        <div className="rounded-2xl bg-gray-200 h-12 w-12"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activityTimeline && activityTimeline.length > 0 ? (
                  <div className="space-y-4">
                    {activityTimeline.slice(0, 5).map((activity, index) => {
                      const ActivityIcon = getActivityIcon(activity.type);
                      return (
                        <div key={activity.id} className="group relative">
                          {/* Timeline line */}
                          {index < activityTimeline.slice(0, 5).length - 1 && (
                            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent"></div>
                          )}
                          
                          <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-orange-200 dark:hover:border-orange-500 hover:from-orange-50 hover:to-red-50 dark:hover:from-orange-900/20 dark:hover:to-red-900/20 transition-all duration-300">
                            <div className="flex-shrink-0 relative z-10">
                              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-800 dark:to-red-800 group-hover:from-orange-200 group-hover:to-red-200 dark:group-hover:from-orange-700 dark:group-hover:to-red-700 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                                <ActivityIcon className="w-6 h-6 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors duration-300" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-orange-900 dark:group-hover:text-orange-100 transition-colors duration-300 mb-1">
                                    {activity.title}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{activity.description}</p>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                      {formatDate(activity.timestamp)}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 group-hover:bg-orange-100 dark:group-hover:bg-orange-900 rounded-lg flex items-center justify-center transition-colors duration-300">
                                  <ArrowTrendingUpIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-800 dark:to-red-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">មិនមានសកម្មភាពថ្មី</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">សកម្មភាពនឹងបង្ហាញនៅទីនេះនៅពេលមានការផ្លាស់ប្តូរ</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}