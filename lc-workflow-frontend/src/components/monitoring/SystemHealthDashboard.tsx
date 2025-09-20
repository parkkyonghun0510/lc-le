'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message: string;
  details: Record<string, any>;
  response_time_ms?: number;
  last_check?: string;
}

interface SystemMetrics {
  total_files: number;
  total_folders: number;
  total_applications: number;
  total_users: number;
  storage_usage_bytes: number;
  database_connections: Record<string, number>;
  uptime_seconds: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  timestamp: string;
  acknowledgments: string[];
}

interface HealthCheckResult {
  overall_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  check_duration_ms: number;
  components: ComponentHealth[];
  metrics: SystemMetrics;
  alerts: string[];
}

interface DashboardData {
  system_status: {
    overall_status: string;
    last_check?: string;
    components: ComponentHealth[];
  };
  metrics: {
    operations: {
      total_file_operations: number;
      total_folder_operations: number;
      file_error_rate_percent: number;
      folder_error_rate_percent: number;
      recent_activity_count: number;
    };
    performance: {
      avg_response_time_ms: number;
      slowest_operations: Array<{
        operation_name: string;
        avg_duration_ms: number;
        error_rate_percent: number;
      }>;
    };
    system: {
      uptime_seconds: number;
      memory_usage_mb?: number;
      total_files: number;
      total_applications: number;
    };
  };
  alerts: {
    active_count: number;
    critical_count: number;
    recent_alerts: Array<{
      title: string;
      severity: string;
      timestamp: string;
    }>;
  };
  timestamp: string;
}

const SystemHealthDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    }
  };

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/health/comprehensive', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to fetch health data:', err);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/alerts/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setActiveAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch active alerts:', err);
    }
  };

  const triggerHealthCheck = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/trigger-health-check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        // Refresh data after triggering health check
        setTimeout(() => {
          fetchHealthData();
          fetchDashboardData();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to trigger health check:', err);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/v1/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        fetchActiveAlerts();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/v1/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        fetchActiveAlerts();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchHealthData(),
      fetchActiveAlerts(),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800 bg-red-200';
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading system health dashboard...</div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Health Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={triggerHealthCheck} variant="outline">
            Trigger Health Check
          </Button>
          <Button onClick={refreshData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Last refresh info */}
      <div className="text-sm text-gray-600">
        Last refreshed: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dashboardData?.system_status.overall_status || 'unknown')}`}>
            {(dashboardData?.system_status.overall_status || 'unknown').toUpperCase()}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">Active Alerts</h3>
          <div className="text-2xl font-bold">
            {dashboardData?.alerts.active_count || 0}
            {(dashboardData?.alerts.critical_count || 0) > 0 && (
              <span className="text-red-600 text-sm ml-2">
                ({dashboardData?.alerts.critical_count} critical)
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">File Operations</h3>
          <div className="text-2xl font-bold">
            {dashboardData?.metrics.operations.total_file_operations || 0}
          </div>
          <div className="text-sm text-gray-600">
            {dashboardData?.metrics.operations.file_error_rate_percent?.toFixed(1) || 0}% error rate
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">System Uptime</h3>
          <div className="text-lg font-bold">
            {dashboardData?.metrics.system.uptime_seconds 
              ? formatUptime(dashboardData.metrics.system.uptime_seconds)
              : 'Unknown'
            }
          </div>
        </Card>
      </div>

      {/* Component Health */}
      {healthData && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Component Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthData.components.map((component) => (
              <div key={component.name} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium capitalize">
                    {component.name.replace('_', ' ')}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(component.status)}`}>
                    {component.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{component.message}</p>
                {component.response_time_ms && (
                  <p className="text-xs text-gray-500">
                    Response time: {component.response_time_ms.toFixed(0)}ms
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between">
                  <span>Average Response Time</span>
                  <span className="font-medium">
                    {dashboardData.metrics.performance.avg_response_time_ms.toFixed(0)}ms
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Total Files</span>
                  <span className="font-medium">
                    {dashboardData.metrics.system.total_files.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Total Applications</span>
                  <span className="font-medium">
                    {dashboardData.metrics.system.total_applications.toLocaleString()}
                  </span>
                </div>
              </div>
              {dashboardData.metrics.system.memory_usage_mb && (
                <div>
                  <div className="flex justify-between">
                    <span>Memory Usage</span>
                    <span className="font-medium">
                      {dashboardData.metrics.system.memory_usage_mb.toFixed(0)} MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Slowest Operations</h2>
            <div className="space-y-3">
              {dashboardData.metrics.performance.slowest_operations.map((op, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{op.operation_name.replace('_', ' ')}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {op.avg_duration_ms.toFixed(0)}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {op.error_rate_percent.toFixed(1)}% errors
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{alert.title}</h3>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SystemHealthDashboard;