/**
 * ResponsivePermissionWrapper Component
 * 
 * Wrapper that renders mobile or desktop versions based on screen size
 */

'use client';

import React, { Suspense } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { TableSkeleton, MatrixSkeleton } from './SkeletonLoaders';

interface ResponsivePermissionWrapperProps {
  mobileComponent: React.ComponentType<any>;
  desktopComponent: React.ComponentType<any>;
  componentProps: any;
  loadingComponent?: React.ReactNode;
}

export default function ResponsivePermissionWrapper({
  mobileComponent: MobileComponent,
  desktopComponent: DesktopComponent,
  componentProps,
  loadingComponent,
}: ResponsivePermissionWrapperProps) {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={loadingComponent || <TableSkeleton />}>
      {isMobile ? (
        <MobileComponent {...componentProps} />
      ) : (
        <DesktopComponent {...componentProps} />
      )}
    </Suspense>
  );
}

/**
 * Hook to get responsive component
 */
export function useResponsiveComponent<T extends Record<string, any>>(
  mobileComponent: React.ComponentType<T>,
  desktopComponent: React.ComponentType<T>
): React.ComponentType<T> {
  const isMobile = useIsMobile();
  return isMobile ? mobileComponent : desktopComponent;
}

/**
 * Responsive container with proper padding for mobile navigation
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  hasMobileNav?: boolean;
}

export function ResponsiveContainer({
  children,
  className = '',
  hasMobileNav = false,
}: ResponsiveContainerProps) {
  return (
    <div
      className={`${className} ${hasMobileNav ? 'mobile-content-padding' : ''}`}
    >
      {children}
    </div>
  );
}

/**
 * Responsive grid that adjusts columns based on screen size
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = 4,
  className = '',
}: ResponsiveGridProps) {
  const gridClasses = `grid gap-${gap} grid-cols-${mobileColumns} md:grid-cols-${tabletColumns} lg:grid-cols-${desktopColumns}`;
  
  return <div className={`${gridClasses} ${className}`}>{children}</div>;
}

/**
 * Responsive card that adjusts layout for mobile
 */
interface ResponsiveCardProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  mobileFullWidth?: boolean;
}

export function ResponsiveCard({
  children,
  title,
  actions,
  className = '',
  mobileFullWidth = true,
}: ResponsiveCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow ${
        mobileFullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200">
          {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

/**
 * Responsive table wrapper that switches to cards on mobile
 */
interface ResponsiveTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T | string;
    label: string;
    render?: (item: T) => React.ReactNode;
  }>;
  renderMobileCard: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  renderMobileCard,
  loading = false,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading) {
    return isMobile ? (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg shadow p-4">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    ) : (
      <TableSkeleton rows={5} columns={columns.length} />
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item, index) => renderMobileCard(item, index))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render
                      ? column.render(item)
                      : String((item as any)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Responsive modal that becomes full-screen on mobile
 */
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-0 sm:p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative bg-white ${
            isMobile
              ? 'w-full h-full'
              : `w-full ${sizeClasses[size]} rounded-lg shadow-xl`
          } flex flex-col`}
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
          {actions && (
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                {actions}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
