/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and optimization recommendations
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePerformanceMetrics } from '@/hooks/usePerformance';
import { PerformanceReport } from '@/services/performanceService';

interface PerformanceDashboardProps {
  className?: string;
}

export default function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const { getMetrics, getSlowMetrics, generateReport, clearMetrics } = usePerformanceMetrics();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'recommendations'>('overview');

  const refreshReport = async () => {
    setIsRefreshing(true);
    try {
      const newReport = generateReport();
      setReport(newReport);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshReport();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshReport, 30000);
    return () => clearInterval(interval);
  }, []);

  const slowMetrics = getSlowMetrics(1000);
  const allMetrics = getMetrics();

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Good</span>;
    if (value <= thresholds.warning) return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Warning</span>;
    return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Poor</span>;
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading performance data...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="space-x-2">
          <Button
            onClick={refreshReport}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={clearMetrics}
            variant="outline"
            size="sm"
          >
            Clear Data
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'metrics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('metrics')}
            >
              Detailed Metrics
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'recommendations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('recommendations')}
            >
              Recommendations
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalMetrics}</div>
                <p className="text-xs text-gray-500">Performance measurements</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Load Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getPerformanceColor(report.summary.averageLoadTime, { good: 1000, warning: 2000 })}`}>
                  {Math.round(report.summary.averageLoadTime)}ms
                </div>
                <p className="text-xs text-gray-500">Page load performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Slow Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{slowMetrics.length}</div>
                <p className="text-xs text-gray-500">Operations &gt; 1s</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Slowest Page</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium truncate">{report.summary.slowestPage || 'N/A'}</div>
                <p className="text-xs text-gray-500">Needs optimization</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Average Load Time</span>
                  <div className="flex items-center space-x-2">
                    <span className={getPerformanceColor(report.summary.averageLoadTime, { good: 1000, warning: 2000 })}>
                      {Math.round(report.summary.averageLoadTime)}ms
                    </span>
                    {getPerformanceBadge(report.summary.averageLoadTime, { good: 1000, warning: 2000 })}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Slow Operations</span>
                  <div className="flex items-center space-x-2">
                    <span className={slowMetrics.length > 0 ? 'text-red-600' : 'text-green-600'}>
                      {slowMetrics.length}
                    </span>
                    {slowMetrics.length === 0 ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Good</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Needs Attention</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Measurements</span>
                  <span className="text-gray-600">{report.summary.totalMetrics}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Slowest Page</span>
                  <span className="text-sm font-medium text-red-600">
                    {report.summary.slowestPage || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Fastest Page</span>
                  <span className="text-sm font-medium text-green-600">
                    {report.summary.fastestPage || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allMetrics.slice(-20).map((metric, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <span className="font-medium">{metric.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({metric.type})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-mono ${metric.value > 1000 ? 'text-red-600' : 'text-gray-600'}`}>
                        {Math.round(metric.value)}ms
                      </span>
                      {metric.value > 1000 && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Slow</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {report.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {report.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-green-600 text-4xl mb-2">✓</div>
                  <p>No performance issues detected!</p>
                  <p className="text-sm">Your application is performing well.</p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
