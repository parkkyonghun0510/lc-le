'use client';

import { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

// Route loading wrapper with skeleton screens
interface RouteLoaderProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RouteLoader({ fallback, children }: RouteLoaderProps) {
  return (
    <Suspense
      fallback={fallback || (
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar skeleton */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Main content skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-3/4 mb-1" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </Suspense>
  );
}

// Generic route component loader
export function lazyLoadRoute<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  const LazyRouteWrapper = (props: React.ComponentProps<T>) => (
    <RouteLoader fallback={fallback}>
      <LazyComponent {...props} />
    </RouteLoader>
  );

  LazyRouteWrapper.displayName = 'LazyRouteWrapper';
  return LazyRouteWrapper;
}

// Preload route component
export function preloadRoute(importFunc: () => Promise<any>) {
  const promise = importFunc();
  return promise;
}

// Route-specific loading components
export const AnalyticsRouteLoader = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const UsersRouteLoader = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ApplicationsRouteLoader = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);