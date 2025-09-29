'use client';

import { useState, Suspense, lazy } from 'react';
import {
  BarChart3,
  Users,
  TrendingUp,
  Activity,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { useAnalyticsSummary, useActivityMetrics, useOrganizationalMetrics } from '@/hooks/useAnalytics';
import { useDepartments } from '@/hooks/useDepartments';
import { useBranches } from '@/hooks/useBranches';

// Lazy load heavy chart components
const ActivityOverview = lazy(() => import('./ActivityOverview'));
const RoleDistributionChart = lazy(() => import('./RoleDistributionChart'));
const ActivityLevelsChart = lazy(() => import('./ActivityLevelsChart'));
const OnboardingMetrics = lazy(() => import('./OnboardingMetrics'));
const OrganizationalBreakdown = lazy(() => import('./OrganizationalBreakdown'));
const GeographicDistribution = lazy(() => import('./GeographicDistribution'));
const ActivityTrendsChart = lazy(() => import('./ActivityTrendsChart'));

interface AnalyticsDashboardProps {
  className?: string;
}

export default function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [timeRange, setTimeRange] = useState<number>(30);

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: activityMetrics, isLoading: activityLoading } = useActivityMetrics(
    timeRange,
    selectedDepartment || undefined,
    selectedBranch || undefined
  );
  const { data: orgMetrics, isLoading: orgLoading } = useOrganizationalMetrics();
  const { data: departmentsData } = useDepartments({ size: 100 });
  const { data: branchesData } = useBranches({ size: 100 });

  const departments = departmentsData?.items || [];
  const branches = branchesData?.items || [];

  const isLoading = summaryLoading || activityLoading || orgLoading;

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export analytics data');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600">User activity and organizational insights</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.activity_overview?.total_users || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.activity_overview?.active_users || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.activity_overview?.new_users || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.organizational_summary?.total_departments || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Overview */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          }>
            <ActivityOverview
              data={activityMetrics?.overview}
              isLoading={activityLoading}
            />
          </Suspense>
        </div>

        {/* Role Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          }>
            <RoleDistributionChart
              data={summary?.role_distribution}
              isLoading={summaryLoading}
            />
          </Suspense>
        </div>

        {/* Activity Levels */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          }>
            <ActivityLevelsChart
              data={activityMetrics?.activity_levels}
              isLoading={activityLoading}
            />
          </Suspense>
        </div>

        {/* Onboarding Metrics */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          }>
            <OnboardingMetrics
              data={activityMetrics?.onboarding_metrics}
              isLoading={activityLoading}
            />
          </Suspense>
        </div>
      </div>

      {/* Organizational Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        }>
          <OrganizationalBreakdown
            data={orgMetrics}
            isLoading={orgLoading}
          />
        </Suspense>
      </div>

      {/* Geographic Distribution */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        }>
          <GeographicDistribution
            data={activityMetrics?.geographic_distribution}
            isLoading={activityLoading}
          />
        </Suspense>
      </div>

      {/* Activity Trends */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        }>
          <ActivityTrendsChart
            data={activityMetrics?.trends}
            isLoading={activityLoading}
            timeRange={timeRange}
          />
        </Suspense>
      </div>
    </div>
  );
}
