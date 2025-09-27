'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  Settings,
  Archive,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'onboarding' | 'status_change' | 'role_change' | 'offboarding' | 'system';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  metadata?: Record<string, any>;
}

interface LifecycleTimelineProps {
  userId: string;
  userName: string;
}

const EVENT_ICONS = {
  onboarding: User,
  status_change: RefreshCw,
  role_change: Users,
  offboarding: Archive,
  system: Settings
};

const EVENT_COLORS = {
  onboarding: 'bg-blue-100 text-blue-600 border-blue-200',
  status_change: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  role_change: 'bg-purple-100 text-purple-600 border-purple-200',
  offboarding: 'bg-red-100 text-red-600 border-red-200',
  system: 'bg-gray-100 text-gray-600 border-gray-200'
};

export default function LifecycleTimeline({ userId, userName }: LifecycleTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLifecycleTimeline();
  }, [userId]);

  const fetchLifecycleTimeline = async () => {
    try {
      setLoading(true);
      
      // For now, we'll create mock data based on the user's onboarding status
      // In a real implementation, this would be fetched from the backend
      const mockEvents: TimelineEvent[] = [
        {
          id: '1',
          type: 'system',
          title: 'User Account Created',
          description: 'User account was created in the system',
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          metadata: {
            created_by: 'System Administrator'
          }
        },
        {
          id: '2',
          type: 'role_change',
          title: 'Initial Role Assignment',
          description: 'User was assigned the Officer role',
          timestamp: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(), // 29 days ago
          user: {
            id: 'admin-1',
            name: 'System Admin',
            role: 'admin'
          },
          metadata: {
            old_role: null,
            new_role: 'officer'
          }
        },
        {
          id: '3',
          type: 'onboarding',
          title: 'Onboarding Started',
          description: 'User onboarding process was initiated',
          timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days ago
          metadata: {
            department: 'Credit Department',
            line_manager: 'John Manager'
          }
        },
        {
          id: '4',
          type: 'status_change',
          title: 'Status Updated to Active',
          description: 'User status was changed from pending to active',
          timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
          user: {
            id: 'manager-1',
            name: 'John Manager',
            role: 'manager'
          },
          metadata: {
            old_status: 'pending',
            new_status: 'active',
            reason: 'Completed initial verification'
          }
        },
        {
          id: '5',
          type: 'onboarding',
          title: 'Onboarding Completed',
          description: 'User successfully completed the onboarding process',
          timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
          user: {
            id: 'manager-1',
            name: 'John Manager',
            role: 'manager'
          },
          metadata: {
            completion_days: 8,
            notes: 'All training modules completed successfully'
          }
        }
      ];

      setEvents(mockEvents);
      setError(null);
    } catch (error) {
      console.error('Error fetching lifecycle timeline:', error);
      setError('Failed to fetch lifecycle timeline');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Lifecycle Timeline</h3>
        </div>
        <span className="text-sm text-gray-500">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => {
            const IconComponent = EVENT_ICONS[event.type];
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="relative flex items-start space-x-4">
                {/* Event icon */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white ${EVENT_COLORS[event.type]}`}>
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_COLORS[event.type]}`}>
                          {event.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      
                      {/* Event metadata */}
                      {event.metadata && (
                        <div className="text-xs text-gray-500 space-y-1">
                          {event.type === 'role_change' && event.metadata.old_role && event.metadata.new_role && (
                            <div className="flex items-center space-x-2">
                              <span>{event.metadata.old_role || 'None'}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-medium">{event.metadata.new_role}</span>
                            </div>
                          )}
                          {event.type === 'status_change' && event.metadata.old_status && event.metadata.new_status && (
                            <div className="flex items-center space-x-2">
                              <span>{event.metadata.old_status}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-medium">{event.metadata.new_status}</span>
                              {event.metadata.reason && (
                                <span className="ml-2 text-gray-400">• {event.metadata.reason}</span>
                              )}
                            </div>
                          )}
                          {event.type === 'onboarding' && event.metadata.completion_days && (
                            <div>
                              Completed in {event.metadata.completion_days} days
                              {event.metadata.notes && (
                                <span className="ml-2 text-gray-400">• {event.metadata.notes}</span>
                              )}
                            </div>
                          )}
                          {event.metadata.department && (
                            <div>Department: {event.metadata.department}</div>
                          )}
                          {event.metadata.line_manager && (
                            <div>Line Manager: {event.metadata.line_manager}</div>
                          )}
                        </div>
                      )}

                      {/* Event performer */}
                      {event.user && (
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span>
                            by <span className="font-medium">{event.user.name}</span> ({event.user.role})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-xs text-gray-500 ml-4">
                      <div>{formatTimeAgo(event.timestamp)}</div>
                      <div className="text-gray-400">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {events.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Timeline Events</h4>
            <p className="text-gray-600">
              Lifecycle events for {userName} will appear here as they occur.
            </p>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {events.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">{events.length}</div>
              <div className="text-xs text-gray-500">Total Events</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {events.filter(e => e.type === 'onboarding').length}
              </div>
              <div className="text-xs text-gray-500">Onboarding</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {events.filter(e => e.type === 'status_change').length}
              </div>
              <div className="text-xs text-gray-500">Status Changes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {events.filter(e => e.type === 'role_change').length}
              </div>
              <div className="text-xs text-gray-500">Role Changes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}