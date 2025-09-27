'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LazyAnalyticsDashboard } from '@/components/lazy/LazyComponents';
import { usePagePerformance } from '@/hooks/usePerformance';

export default function AnalyticsPage() {
  // Track page performance
  usePagePerformance('analytics');

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager']}>
      <Layout>
        <div className="p-6">
          <LazyAnalyticsDashboard />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
