'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, LogIn, RefreshCw } from 'lucide-react';

interface ActivityTrendsChartProps {
  data?: {
    user_creation: Array<{ date: string; count: number }>;
    login_activity: Array<{ date: string; count: number }>;
    status_changes: Array<{ date: string; count: number }>;
  };
  isLoading: boolean;
  timeRange: number;
}

const TREND_COLORS = {
  user_creation: '#3B82F6',
  login_activity: '#10B981',
  status_changes: '#F59E0B'
};

const TREND_ICONS = {
  user_creation: Users,
  login_activity: LogIn,
  status_changes: RefreshCw
};

export default function ActivityTrendsChart({ data, isLoading, timeRange }: ActivityTrendsChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Activity Trends</h3>
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No trend data available</p>
        </div>
      </div>
    );
  }

  // Debug logging to understand data structure
  console.log('ActivityTrendsChart data:', {
    user_creation: data.user_creation,
    login_activity: data.login_activity,
    status_changes: data.status_changes,
    hasUserCreation: !!data.user_creation,
    userCreationType: typeof data.user_creation,
    userCreationLength: data.user_creation?.length || 0
  });

  // Prepare chart data with null checks
  const chartData = (data.user_creation || []).map((item, index) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    'User Creation': item.count,
    'Login Activity': (data.login_activity || [])[index]?.count || 0,
    'Status Changes': (data.status_changes || [])[index]?.count || 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.dataKey}:</span>
              <span className="text-sm font-medium text-gray-900">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatLegendValue = (value: string) => {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Activity Trends</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4" />
          <span>Last {timeRange} days</span>
        </div>
      </div>
      
      <div className="h-80">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={formatLegendValue}
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Line
                type="monotone"
                dataKey="User Creation"
                stroke={TREND_COLORS.user_creation}
                strokeWidth={2}
                dot={{ fill: TREND_COLORS.user_creation, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Login Activity"
                stroke={TREND_COLORS.login_activity}
                strokeWidth={2}
                dot={{ fill: TREND_COLORS.login_activity, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Status Changes"
                stroke={TREND_COLORS.status_changes}
                strokeWidth={2}
                dot={{ fill: TREND_COLORS.status_changes, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No chart data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        {Object.entries(data).map(([key, values]) => {
          // Skip if values is not an array or is empty
          if (!Array.isArray(values) || values.length === 0) {
            return null;
          }

          const Icon = TREND_ICONS[key as keyof typeof TREND_ICONS];
          // Ensure Icon is defined before using it
          if (!Icon) {
            console.warn(`Icon not found for key: ${key}`);
            return null;
          }

          const total = values.reduce((sum, item) => sum + (item?.count || 0), 0);
          const average = values.length > 0 ? total / values.length : 0;

          return (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Icon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {formatLegendValue(key)}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500">Total ({average.toFixed(1)} avg/day)</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
