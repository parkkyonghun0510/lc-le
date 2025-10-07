'use client';

import { useNotificationSummary } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export default function NotificationSummaryTest() {
  const { data: summary, isLoading, error } = useNotificationSummary(30);

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Notification Summary Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Notification Summary Test - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">
            <p>Error loading notification summary:</p>
            <pre className="mt-2 p-2 bg-red-50 rounded text-sm">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Notification Summary Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Total Notifications</h3>
              <p className="text-2xl font-bold text-blue-600">{summary?.total_notifications || 0}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-red-900">Unread Count</h3>
              <p className="text-2xl font-bold text-red-600">{summary?.unread_count || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">By Type</h3>
              <div className="mt-2 space-y-1">
                {summary?.by_type && Object.entries(summary.by_type).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">By Priority</h3>
              <div className="mt-2 space-y-1">
                {summary?.by_priority && Object.entries(summary.by_priority).map(([priority, count]) => (
                  <div key={priority} className="flex justify-between text-sm">
                    <span className="capitalize">{priority}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900">Recent Notifications</h3>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {summary?.recent_notifications?.slice(0, 5).map((notification) => (
                <div key={notification.id} className="p-2 bg-white rounded border text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-gray-600 text-xs">{notification.message}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p className="capitalize">{notification.priority}</p>
                      <p>{notification.is_read ? 'Read' : 'Unread'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <p>Period: {summary?.period_days || 30} days</p>
            <p>Generated: {summary?.generated_at ? new Date(summary.generated_at).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
