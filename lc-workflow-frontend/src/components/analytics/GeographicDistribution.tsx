'use client';

import { MapPin, Users } from 'lucide-react';

interface GeographicDistributionProps {
  data?: Record<string, number>;
  isLoading: boolean;
}

export default function GeographicDistribution({ data, isLoading }: GeographicDistributionProps) {
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

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No geographic data available</p>
        </div>
      </div>
    );
  }

  // Debug logging to understand the data structure
  console.log('GeographicDistribution data structure:', {
    data,
    dataType: typeof data,
    dataKeys: data ? Object.keys(data) : [],
    firstValue: data ? Object.values(data)[0] : null,
    firstValueType: data ? typeof Object.values(data)[0] : null
  });

  // Handle nested object structure from API
  let processedData: Record<string, number> = {};
  if (data) {
    const firstValue = Object.values(data)[0];
    if (firstValue && typeof firstValue === 'object' && !Array.isArray(firstValue)) {
      // Flatten nested structure: { "Department": { "City": count } } -> { "City": count }
      console.log('Detected nested structure, flattening...');
      Object.values(data).forEach((locationObj: any) => {
        if (locationObj && typeof locationObj === 'object') {
          Object.entries(locationObj).forEach(([city, count]) => {
            const numCount = typeof count === 'number' ? count : 0;
            processedData[city] = (processedData[city] || 0) + numCount;
          });
        }
      });
      console.log('Flattened data:', processedData);
    } else {
      // Data is already in the correct format
      processedData = data as Record<string, number>;
    }
  }

  const total = Object.values(processedData).reduce((sum: number, count: number) => sum + count, 0);
  const sortedData = Object.entries(processedData)
    .map(([location, count]: [string, number]) => ({
      location,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
      
      <div className="space-y-3">
        {sortedData.map((item, index) => (
          <div key={item.location} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">{item.location}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{item.count} users</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Total Locations</span>
          </div>
          <span className="text-lg font-bold text-gray-900">{Object.keys(data).length}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Total Users</span>
          </div>
          <span className="text-lg font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  );
}
