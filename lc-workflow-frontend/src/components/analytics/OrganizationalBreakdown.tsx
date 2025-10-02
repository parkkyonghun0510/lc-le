'use client';

import { Building2, MapPin, Briefcase, Users, TrendingUp } from 'lucide-react';

interface OrganizationalBreakdownProps {
  data?: {
    summary: {
      total_departments: number;
      total_branches: number;
      total_positions: number;
      average_users_per_department: number;
      average_users_per_branch: number;
    };
    department_breakdown: Array<{
      department_id: string;
      department_name: string;
      user_count: number;
      active_users: number;
      completion_rate: number;
    }>;
    branch_breakdown: Array<{
      branch_id: string;
      branch_name: string;
      user_count: number;
      active_users: number;
      completion_rate: number;
    }>;
    position_breakdown: Array<{
      position_id: string;
      position_name: string;
      user_count: number;
      active_users: number;
      completion_rate: number;
    }>;
  };
  isLoading: boolean;
}

export default function OrganizationalBreakdown({ data, isLoading }: OrganizationalBreakdownProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Organizational Breakdown</h3>
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No organizational data available</p>
        </div>
      </div>
    );
  }

  // Debug logging to identify the source of undefined values
  console.log('OrganizationalBreakdown Debug:', {
    average_users_per_department: data.summary.average_users_per_department,
    average_users_per_branch: data.summary.average_users_per_branch,
    summary: data.summary
  });

  const summaryMetrics = [
    {
      label: 'Total Departments',
      value: data.summary.total_departments,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Total Branches',
      value: data.summary.total_branches,
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Total Positions',
      value: data.summary.total_positions,
      icon: Briefcase,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Avg Users/Dept',
      value: data.summary.average_users_per_department?.toFixed(1) || '0.0',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Avg Users/Branch',
      value: data.summary.average_users_per_branch?.toFixed(1) || '0.0',
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  const renderBreakdownTable = (title: string, items: any[], type: string) => {
    // Debug logging for completion_rate values and items structure
    console.log(`${title} data:`, {
      items,
      itemsType: typeof items,
      itemsLength: items?.length || 0,
      firstItem: items?.[0]
    });

    // Handle case where items is undefined or null
    if (!items || !Array.isArray(items) || items.length === 0) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900">{title}</h4>
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No data available</p>
          </div>
        </div>
      );
    }

    // Debug logging for completion_rate values
    console.log(`${title} completion_rate values:`, items.map(item => ({
      name: item[`${type}_name`],
      completion_rate: item.completion_rate,
      completion_rate_type: typeof item.completion_rate
    })));

    return (
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900">{title}</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Users
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Users
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.slice(0, 5).map((item) => (
                <tr key={item[`${type}_id`]}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item[`${type}_name`]}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {item.user_count}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {item.active_users}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${item.completion_rate || 0}%` }}
                        />
                      </div>
                      <span>{(item.completion_rate || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 5 && (
            <p className="text-sm text-gray-500 mt-2">
              Showing top 5 of {items.length} {type}s
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Organizational Breakdown</h3>
      
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {summaryMetrics.map((metric) => {
          const Icon = metric.icon;
          
          return (
            <div key={metric.label} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderBreakdownTable('Departments', data.department_breakdown, 'department')}
        {renderBreakdownTable('Branches', data.branch_breakdown, 'branch')}
        {renderBreakdownTable('Positions', data.position_breakdown, 'position')}
      </div>
    </div>
  );
}
