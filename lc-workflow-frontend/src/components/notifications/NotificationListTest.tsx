'use client';

import { useState } from 'react';
import { useUserNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { RefreshCw, Filter, Eye, EyeOff } from 'lucide-react';

export default function NotificationListTest() {
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  const { data, isLoading, error, refetch } = useUserNotifications(limit, offset, unreadOnly);

  const handleRefresh = () => {
    refetch();
  };

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
  };

  const handleReset = () => {
    setOffset(0);
    setLimit(50);
    setUnreadOnly(false);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Notification List Test - Loading...</CardTitle>
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
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Notification List Test - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">
            <p>Error loading notifications:</p>
            <pre className="mt-2 p-2 bg-red-50 rounded text-sm">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notification List Test</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offset
              </label>
              <input
                type="number"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                <Filter className="h-4 w-4 mr-1" />
                Unread only
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={handleReset} variant="outline" size="sm">
                Reset
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Total Count</h3>
              <p className="text-2xl font-bold text-blue-600">{data?.total_count || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900">Loaded</h3>
              <p className="text-2xl font-bold text-green-600">{data?.notifications?.length || 0}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900">Has More</h3>
              <p className="text-2xl font-bold text-yellow-600">{data?.has_more ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {data?.notifications?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <EyeOff className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No notifications found</p>
                <p className="text-sm">Try adjusting the filters or offset</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      notification.is_read
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-white border-blue-500 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            notification.priority === 'urgent'
                              ? 'bg-red-100 text-red-800'
                              : notification.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : notification.priority === 'normal'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            notification.is_read
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {notification.is_read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Type: {notification.type}</span>
                          <span>Created: {new Date(notification.created_at).toLocaleString()}</span>
                          {notification.data && (
                            <span>Data: {JSON.stringify(notification.data)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Load More Button */}
          {data?.has_more && (
            <div className="text-center">
              <Button onClick={handleLoadMore} variant="outline">
                Load More ({limit} more)
              </Button>
            </div>
          )}

          {/* Debug Info */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Debug Info</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Current limit: {limit}</p>
              <p>Current offset: {offset}</p>
              <p>Unread only: {unreadOnly ? 'Yes' : 'No'}</p>
              <p>Total available: {data?.total_count || 0}</p>
              <p>Currently loaded: {data?.notifications?.length || 0}</p>
              <p>Has more data: {data?.has_more ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
