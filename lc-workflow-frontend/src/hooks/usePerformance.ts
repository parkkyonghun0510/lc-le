/**
 * Performance Monitoring Hook
 * Provides performance tracking utilities for components
 */

import { useEffect, useCallback, useRef } from 'react';
import { performanceService, PerformanceMetric } from '../services/performanceService';

interface UsePerformanceOptions {
  trackMount?: boolean;
  trackRender?: boolean;
  trackInteractions?: boolean;
  componentName?: string;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    trackMount = true,
    trackRender = false,
    trackInteractions = true,
    componentName = 'Unknown',
  } = options;

  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  // Track component mount time
  useEffect(() => {
    if (trackMount) {
      mountTimeRef.current = performance.now();
      performanceService.recordMetric({
        name: `${componentName}_mount_start`,
        value: mountTimeRef.current,
        type: 'custom',
      });
    }

    return () => {
      if (trackMount && mountTimeRef.current > 0) {
        const mountDuration = performance.now() - mountTimeRef.current;
        performanceService.recordMetric({
          name: `${componentName}_mount_duration`,
          value: mountDuration,
          type: 'custom',
        });
      }
    };
  }, [trackMount, componentName]);

  // Track render count and duration
  useEffect(() => {
    if (trackRender) {
      renderCountRef.current += 1;
      performanceService.recordMetric({
        name: `${componentName}_render_count`,
        value: renderCountRef.current,
        type: 'custom',
      });
    }
  });

  // Track user interactions
  const trackInteraction = useCallback((interactionName: string, fn: () => void | Promise<void>) => {
    if (!trackInteractions) {
      fn();
      return;
    }

    performanceService.measureCustom(`${componentName}_${interactionName}`, fn);
  }, [trackInteractions, componentName]);

  // Track async operations
  const trackAsync = useCallback(async <T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    return performanceService.measureAsync(`${componentName}_${operationName}`, fn);
  }, [componentName]);

  // Track custom metrics
  const trackMetric = useCallback((name: string, value: number) => {
    performanceService.recordMetric({
      name: `${componentName}_${name}`,
      value,
      type: 'custom',
    });
  }, [componentName]);

  return {
    trackInteraction,
    trackAsync,
    trackMetric,
    renderCount: renderCountRef.current,
  };
}

/**
 * Hook for tracking page performance
 */
export function usePagePerformance(pageName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    performanceService.recordMetric({
      name: `${pageName}_page_start`,
      value: startTime,
      type: 'custom',
    });

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      performanceService.recordMetric({
        name: `${pageName}_page_duration`,
        value: duration,
        type: 'custom',
      });
    };
  }, [pageName]);
}

/**
 * Hook for tracking API call performance
 */
export function useApiPerformance() {
  const trackApiCall = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    return performanceService.measureAsync(`api_${apiName}`, apiCall);
  }, []);

  return { trackApiCall };
}

/**
 * Hook for tracking user interactions
 */
export function useInteractionTracking(componentName: string) {
  const trackClick = useCallback((action: string) => {
    performanceService.recordMetric({
      name: `${componentName}_click_${action}`,
      value: 0, // Click events don't have duration
      type: 'custom',
    });
  }, [componentName]);

  const trackHover = useCallback((element: string) => {
    performanceService.recordMetric({
      name: `${componentName}_hover_${element}`,
      value: 0,
      type: 'custom',
    });
  }, [componentName]);

  const trackFocus = useCallback((element: string) => {
    performanceService.recordMetric({
      name: `${componentName}_focus_${element}`,
      value: 0,
      type: 'custom',
    });
  }, [componentName]);

  return {
    trackClick,
    trackHover,
    trackFocus,
  };
}

/**
 * Hook for getting performance metrics
 */
export function usePerformanceMetrics() {
  const getMetrics = useCallback(() => {
    return performanceService.getMetrics();
  }, []);

  const getSlowMetrics = useCallback((threshold: number = 1000) => {
    return performanceService.getSlowMetrics(threshold);
  }, []);

  const getMetricsByPage = useCallback((page: string) => {
    return performanceService.getMetricsByPage(page);
  }, []);

  const generateReport = useCallback(() => {
    return performanceService.generateReport();
  }, []);

  const clearMetrics = useCallback(() => {
    performanceService.clearMetrics();
  }, []);

  return {
    getMetrics,
    getSlowMetrics,
    getMetricsByPage,
    generateReport,
    clearMetrics,
  };
}
