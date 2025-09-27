'use client';

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ActivityMetrics {
  overview: {
    total_users: number;
    active_last_7_days: number;
    active_last_30_days: number;
    dormant_users: number;
    never_logged_in: number;
    activity_rates: {
      active_7_day_rate: number;
      active_30_day_rate: number;
      dormancy_rate: number;
      never_logged_rate: number;
    };
  };
  role_distribution: {
    role_counts: { [key: string]: number };
    role_activity_metrics: { [key: string]: any };
  };
  activity_levels: {
    category_counts: { [key: string]: number };
  };
  onboarding_metrics: {
    completion_rate: number;
    average_onboarding_days: number;
    completed_onboarding: number;
    pending_onboarding: number;
  };
  geographic_distribution: {
    department_distribution: { [key: string]: any };
    branch_distribution: { [key: string]: any };
  };
  login_patterns: {
    average_logins_per_user: number;
    login_engagement_rate: number;
  };
}

interface UserActivityDashboardProps {
  className?: string;
}

export default function UserActivityDashboard({ className = '' }: UserActivityDashboardProps) {
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockMetrics: ActivityMetrics = {
        overview: {
          total_users: 150,
          active_last_7_days: 89,
          active_last_30_days: 134,
          dormant_users: 12,
          never_logged_in: 4,
          activity_rates: {
            active_7_day_rate: 59.3,
            active_30_day_rate: 89.3,
            dormancy_rate: 8.0,
            never_logged_rate: 2.7
          }
        },
        role_distribution: {
          role_counts: {
            officer: 98,
            manager: 32,
            admin: 20
          },
          role_activity_metrics: {
            officer: { activity_rate: 91.8, avg_logins: 45.2 },
            manager: { activity_rate: 87.5, avg_logins: 62.1 },
            admin: { activity_rate: 85.0, avg_logins: 78.5 }
          }
        },
        activity_levels: {
          category_counts: {
            highly_active: 89,
            moderately_active: 45,
            low_activity: 12,
            dormant: 12,
            never_logged_in: 4
          }
        },
        onboarding_metrics: {
          completion_rate: 87.3,
          average_onboarding_days: 5.2,
          completed_onboarding: 131,
          pending_onboarding: 19
        },
        geographic_distribution: {
          department_distribution: {
            'Credit Department': { total_users: 65, active_users: 58 },
            'Operations': { total_users: 42, active_users: 39 },
            'IT Department': { total_users: 25, active_users: 23 },
            'HR Department': { total_users: 18, active_users: 16 }
          },
          branch_distribution: {
            'Phnom Penh': { total_users: 89, active_users: 82 },
            'Siem Reap': { total_users: 35, active_users: 31 },
            'Battambang': { total_users: 26, active_users: 23 }
          }
        },
        login_patterns: {
          average_logins_per_user: 52.4,
          login_engagement_rate: 91.3
        }
      };
      
      setMetrics(mockMetrics);
      setIsLoading(false);
    }, 1000);
  }, [selectedPeriod, selectedDepartment]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getActivityColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getActivityIcon = (level: string) => {
    switch (level) {
      case 'highly_active':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />;
      case 'moderately_active':
        return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
      case 'low_activity':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-yellow-500" />;
      case 'dormant':
        return <ClockIcon className="h-5 w-5 text-orange-500" />;
      case 'never_logged_in':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <UsersIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded p-4 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4" />
          <p>Error loading analytics: {error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">User Activity Analytics</h2>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.overview.total_users}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active (7 days)</p>
                <p className="text-2xl font-bold text-green-900">{metrics.overview.active_last_7_days}</p>
                <p className="text-xs text-green-600">{formatPercentage(metrics.overview.activity_rates.active_7_day_rate)}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Dormant Users</p>
                <p className="text-2xl font-bold text-yellow-900">{metrics.overview.dormant_users}</p>
                <p className="text-xs text-yellow-600">{formatPercentage(metrics.overview.activity_rates.dormancy_rate)}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Onboarding Rate</p>
                <p className="text-2xl font-bold text-purple-900">{formatPercentage(metrics.onboarding_metrics.completion_rate)}</p>
                <p className="text-xs text-purple-600">{metrics.onboarding_metrics.average_onboarding_days} days avg</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Activity Levels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Levels</h3>
            <div className="space-y-3">
              {Object.entries(metrics.activity_levels.category_counts).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getActivityIcon(level)}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {level.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({formatPercentage((count / metrics.overview.total_users) * 100)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role Distribution</h3>
            <div className="space-y-3">
              {Object.entries(metrics.role_distribution.role_counts).map(([role, count]) => {
                const roleMetrics = metrics.role_distribution.role_activity_metrics[role];
                return (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserGroupIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{count} users</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getActivityColor(roleMetrics?.activity_rate || 0)}`}>
                        {formatPercentage(roleMetrics?.activity_rate || 0)} active
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2" />
              Department Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.geographic_distribution.department_distribution).map(([dept, data]: [string, any]) => (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{dept}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{data.total_users} users</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getActivityColor((data.active_users / data.total_users) * 100)}`}>
                      {data.active_users} active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2" />
              Branch Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.geographic_distribution.branch_distribution).map(([branch, data]: [string, any]) => (
                <div key={branch} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{branch}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{data.total_users} users</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getActivityColor((data.active_users / data.total_users) * 100)}`}>
                      {data.active_users} active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Login Patterns */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Login Engagement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{metrics.login_patterns.average_logins_per_user}</div>
              <div className="text-sm text-gray-600">Average logins per user</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{formatPercentage(metrics.login_patterns.login_engagement_rate)}</div>
              <div className="text-sm text-gray-600">Login engagement rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}