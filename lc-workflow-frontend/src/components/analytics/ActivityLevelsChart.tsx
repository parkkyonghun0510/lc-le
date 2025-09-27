'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Zap, Clock, UserX } from 'lucide-react';

interface ActivityLevelsChartProps {
  data?: {
    category_counts: Record<string, number>;
    highly_active: number;
    moderately_active: number;
    dormant: number;
    never_logged: number;
  };
  isLoading: boolean;
}

const ACTIVITY_LEVELS = [
  { key: 'highly_active', label: 'Highly Active', color: '#10B981', icon: Zap },
  { key: 'moderately_active', label: 'Moderately Active', color: '#3B82F6', icon: Activity },
  { key: 'dormant', label: 'Dormant', color: '#F59E0B', icon: Clock },
  { key: 'never_logged', label: 'Never Logged', color: '#EF4444', icon: UserX },
];

export default function ActivityLevelsChart({ data, isLoading }: ActivityLevelsChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Activity Levels</h3>
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No activity level data available</p>
        </div>
      </div>
    );
  }

  const chartData = ACTIVITY_LEVELS.map(level => {
    const value = data[level.key as keyof typeof data];
    return {
      name: level.label,
      value: typeof value === 'number' ? value : 0,
      color: level.color
    };
  });

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} users ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Activity Levels</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Bar key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {ACTIVITY_LEVELS.map((level) => {
          const Icon = level.icon;
          const value = data[level.key as keyof typeof data];
          const numericValue = typeof value === 'number' ? value : 0;
          const percentage = total > 0 ? ((numericValue / total) * 100).toFixed(1) : 0;
          
          return (
            <div key={level.key} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: level.color }}
              />
              <Icon className="h-4 w-4 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{level.label}</p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{numericValue}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
