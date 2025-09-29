'use client';

import { Suspense, lazy, ComponentType, useState, useEffect } from 'react';

// Lazy loaded components with Suspense wrapper
const AnalyticsDashboardComponent = lazy(() => import('@/components/analytics/AnalyticsDashboard'));
const AdvancedSearchModalComponent = lazy(() => import('@/components/users/AdvancedSearchModal'));

export const LazyAnalyticsDashboard = (props: any) => (
  <LazyWrapper>
    <AnalyticsDashboardComponent {...props} />
  </LazyWrapper>
);

export const LazyAdvancedSearchModal = (props: any) => (
  <LazyWrapper>
    <AdvancedSearchModalComponent {...props} />
  </LazyWrapper>
);

// Enhanced lazy loading wrapper with better error handling and loading states
interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: React.ReactNode;
}

export function LazyWrapper({ fallback, errorFallback, children }: LazyWrapperProps) {
  return (
    <Suspense
      fallback={fallback || (
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      )}
    >
      {children}
    </Suspense>
  );
}

// Generic lazy component loader
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  const LazyComponentWrapper = (props: React.ComponentProps<T>) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyWrapper>
  );

  LazyComponentWrapper.displayName = 'LazyComponentWrapper';
  return LazyComponentWrapper;
}

// Preload component for better UX
export function preloadComponent(importFunc: () => Promise<any>) {
  const promise = importFunc();
  return promise;
}

// Intersection Observer hook for lazy loading
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [elementRef, setElementRef] = useState<Element | null>(null);

  useEffect(() => {
    if (!elementRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(elementRef);

    return () => observer.disconnect();
  }, [elementRef, threshold]);

  return { isVisible, setElementRef };
}
