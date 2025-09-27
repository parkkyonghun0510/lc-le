'use client';

import { Users, UserPlus, UserCheck, UserX, UserMinus } from 'lucide-react';

interface ActivityOverviewProps {
  data?: {
    total_users: number;
    active_users: number;
    new_users: number;
    dormant_users: number;
    never_logged_in: number;
  };
  isLoading: boolean;
}

export default function ActivityOverview({ data, isLoading }: ActivityOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No activity data available</p>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Users',
      value: data.total_users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Active Users',
      value: data.active_users,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'New Users',
      value: data.new_users,
      icon: UserPlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Dormant Users',
      value: data.dormant_users,
      icon: UserMinus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Never Logged In',
      value: data.never_logged_in,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Activity Overview</h3>
      
      <div className="space-y-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const percentage = data.total_users > 0 ? (metric.value / data.total_users) * 100 : 0;
          
          return (
            <div key={metric.label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                  <p className="text-xs text-gray-500">
                    {percentage.toFixed(1)}% of total users
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{metric.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
