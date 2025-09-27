/**
 * Lazy Loading Components
 * Dynamically import heavy components to improve initial bundle size
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@mui/material';

// Loading skeleton components
const TableSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
    <div className="text-gray-500">Loading chart...</div>
  </div>
);

const FormSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
);

// Generic lazy loading wrapper
interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <PageSkeleton />
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Analytics Components (Heavy - Charts)
export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('../analytics/AnalyticsDashboard'),
  <PageSkeleton />
);

export const LazyActivityOverview = createLazyComponent(
  () => import('../analytics/ActivityOverview'),
  <ChartSkeleton />
);

export const LazyRoleDistributionChart = createLazyComponent(
  () => import('../analytics/RoleDistributionChart'),
  <ChartSkeleton />
);

export const LazyActivityLevelsChart = createLazyComponent(
  () => import('../analytics/ActivityLevelsChart'),
  <ChartSkeleton />
);

export const LazyActivityTrendsChart = createLazyComponent(
  () => import('../analytics/ActivityTrendsChart'),
  <ChartSkeleton />
);

export const LazyOnboardingMetrics = createLazyComponent(
  () => import('../analytics/OnboardingMetrics'),
  <ChartSkeleton />
);

export const LazyOrganizationalBreakdown = createLazyComponent(
  () => import('../analytics/OrganizationalBreakdown'),
  <ChartSkeleton />
);

export const LazyGeographicDistribution = createLazyComponent(
  () => import('../analytics/GeographicDistribution'),
  <ChartSkeleton />
);

// User Management Components (Heavy - Tables)
export const LazyAdvancedSearchModal = createLazyComponent(
  () => import('../users/AdvancedSearchModal'),
  <FormSkeleton />
);

// Notification Components (Heavy - Real-time Updates)  
export const LazyNotificationDropdown = createLazyComponent(
  () => import('../notifications/NotificationDropdown'),
  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
);

export const LazyNotificationManagement = createLazyComponent(
  () => import('../notifications/NotificationManagement'),
  <PageSkeleton />
);

// Security Components (Heavy - Complex Logic)
export const LazyAccountLockoutManagement = createLazyComponent(
  () => import('../auth/AccountLockoutManagement'),
  <PageSkeleton />
);

// Export skeleton components for reuse
export {
  TableSkeleton,
  ChartSkeleton,
  FormSkeleton,
  PageSkeleton,
};
