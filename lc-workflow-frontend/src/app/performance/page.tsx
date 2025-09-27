/**
 * Performance Monitoring Page
 * Displays comprehensive performance metrics and optimization insights
 */

'use client';

import React from 'react';
import { usePagePerformance } from '@/hooks/usePerformance';
import PerformanceDashboard from '@/components/performance/PerformanceDashboard';

export default function PerformancePage() {
  // Track page performance
  usePagePerformance('performance');

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Monitor application performance metrics and optimization recommendations
        </p>
      </div>

      <PerformanceDashboard />
    </div>
  );
}
