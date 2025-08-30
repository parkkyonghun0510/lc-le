'use client';

import { useTheme } from '@/providers/ThemeProvider';

interface ThemedDashboardCardProps {
  title: string;
  value: string | number;
  description: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export function ThemedDashboardCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue
}: ThemedDashboardCardProps) {
  const { theme, themeConfig } = useTheme();
  
  // Get theme colors based on current theme
  const backgroundColor = themeConfig?.colors[theme]?.surface || 
    (theme === 'dark' ? '#1E1E1E' : '#FFFFFF');
    
  const textColor = themeConfig?.colors[theme]?.text_primary || 
    (theme === 'dark' ? '#FFFFFF' : '#212121');
    
  const secondaryTextColor = themeConfig?.colors[theme]?.text_secondary || 
    (theme === 'dark' ? '#B3B3B3' : '#757575');
    
  const primaryColor = themeConfig?.colors[theme]?.primary || '#2196F3';
  
  const successColor = themeConfig?.colors[theme]?.success || '#4CAF50';
  const errorColor = themeConfig?.colors[theme]?.error || '#F44336';

  return (
    <div 
      className="rounded-xl p-6 shadow-sm transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor,
        border: `1px solid ${themeConfig?.colors[theme]?.divider || (theme === 'dark' ? '#373737' : '#E0E0E0')}`
      }}
    >
      <div className="flex items-start justify-between">
        {icon && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            {icon}
          </div>
        )}
        
        <div className="text-right">
          <p 
            className="text-2xl font-bold"
            style={{ color: textColor }}
          >
            {value}
          </p>
          {trend && trendValue && (
            <div className="flex items-center justify-end mt-1">
              <span 
                className="text-sm font-medium"
                style={{ 
                  color: trend === 'up' ? successColor : errorColor 
                }}
              >
                {trendValue}
              </span>
              {trend === 'up' ? (
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <h3 
          className="text-lg font-semibold"
          style={{ color: textColor }}
        >
          {title}
        </h3>
        <p 
          className="text-sm mt-1"
          style={{ color: secondaryTextColor }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}