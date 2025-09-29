// Performance monitoring service
import { logger } from './logger';

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte

  // Custom metrics
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstByte?: number;
  networkLatency?: number;

  // Resource metrics
  resources?: {
    scripts?: number;
    stylesheets?: number;
    images?: number;
    totalSize?: number;
  };

  // Memory metrics
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface PerformanceConfig {
  enabled: boolean;
  trackCoreWebVitals: boolean;
  trackResourceTiming: boolean;
  trackMemoryUsage: boolean;
  sampleRate: number;
  endpoint?: string;
}

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private initialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      trackCoreWebVitals: true,
      trackResourceTiming: true,
      trackMemoryUsage: true,
      sampleRate: 1.0, // Sample 100% by default
      ...config,
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  private initialize(): void {
    if (typeof window === 'undefined' || !this.config.enabled) return;

    try {
      // Check if Performance API is available
      if (!window.performance) {
        logger.warn('Performance API not available', {
          category: 'performance_monitoring',
        });
        return;
      }

      this.initialized = true;

      // Track page load performance
      this.trackPageLoad();

      // Track Core Web Vitals
      if (this.config.trackCoreWebVitals) {
        this.trackCoreWebVitals();
      }

      // Track resource timing
      if (this.config.trackResourceTiming) {
        this.trackResourceTiming();
      }

      // Track memory usage
      if (this.config.trackMemoryUsage) {
        this.trackMemoryUsage();
      }

      // Track navigation timing
      this.trackNavigationTiming();

      logger.info('Performance monitoring initialized', {
        category: 'performance_monitoring',
        config: this.config,
      });
    } catch (error) {
      logger.error('Failed to initialize performance monitoring', error as Error, {
        category: 'performance_monitoring_error',
      });
    }
  }

  private trackPageLoad(): void {
    if (!window.performance.timing) return;

    const timing = window.performance.timing;

    // Calculate page load metrics
    const navigationStart = timing.navigationStart;
    const domContentLoaded = timing.domContentLoadedEventEnd - navigationStart;
    const loadComplete = timing.loadEventEnd - navigationStart;

    this.metrics = {
      ...this.metrics,
      pageLoadTime: loadComplete,
      domContentLoaded: domContentLoaded,
    };

    // Log page load performance
    logger.info('Page load performance', {
      category: 'page_load_performance',
      pageLoadTime: loadComplete,
      domContentLoaded: domContentLoaded,
      url: window.location.href,
    });
  }

  private trackCoreWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          this.metrics.lcp = lastEntry.startTime;
          this.reportMetric('LCP', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.reportMetric('FID', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Track Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
            this.reportMetric('CLS', clsValue);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      logger.error('Failed to track Core Web Vitals', error as Error);
    }
  }

  private trackResourceTiming(): void {
    if (!window.performance.getEntriesByType) return;

    try {
      const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const resourceMetrics = {
        scripts: resources.filter(r => r.name.includes('.js')).length,
        stylesheets: resources.filter(r => r.name.includes('.css')).length,
        images: resources.filter(r => r.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)).length,
        totalSize: resources.reduce((total, r) => total + (r.transferSize || 0), 0),
      };

      this.metrics.resources = resourceMetrics;

      logger.info('Resource timing metrics', {
        category: 'resource_timing',
        resources: resourceMetrics,
      });
    } catch (error) {
      logger.error('Failed to track resource timing', error as Error);
    }
  }

  private trackMemoryUsage(): void {
    if (!('memory' in window.performance)) return;

    try {
      const memory = (window.performance as any).memory;
      if (memory) {
        const memoryMetrics = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100),
        };

        this.metrics.memoryUsage = memoryMetrics;

        // Log memory usage periodically
        setInterval(() => {
          const currentMemory = (window.performance as any).memory;
          if (currentMemory) {
            const currentMetrics = {
              used: Math.round(currentMemory.usedJSHeapSize / 1024 / 1024),
              total: Math.round(currentMemory.totalJSHeapSize / 1024 / 1024),
              percentage: Math.round((currentMemory.usedJSHeapSize / currentMemory.totalJSHeapSize) * 100),
            };

            logger.info('Memory usage update', {
              category: 'memory_usage',
              memory: currentMetrics,
            });
          }
        }, 30000); // Every 30 seconds
      }
    } catch (error) {
      logger.error('Failed to track memory usage', error as Error);
    }
  }

  private trackNavigationTiming(): void {
    if (!window.performance.getEntriesByType) return;

    try {
      const navigationEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];

        this.metrics = {
          ...this.metrics,
          ttfb: nav.responseStart - nav.requestStart,
          firstByte: nav.responseStart - nav.startTime,
        };

        logger.info('Navigation timing', {
          category: 'navigation_timing',
          ttfb: nav.responseStart - nav.requestStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
          loadComplete: nav.loadEventEnd - nav.startTime,
        });
      }
    } catch (error) {
      logger.error('Failed to track navigation timing', error as Error);
    }
  }

  private reportMetric(name: string, value: number): void {
    // Only report based on sample rate
    if (Math.random() > this.config.sampleRate) return;

    logger.info(`Performance metric: ${name}`, {
      category: 'performance_metric',
      metricName: name,
      value,
      url: window.location.href,
      timestamp: Date.now(),
    });

    // Send to external endpoint if configured
    if (this.config.endpoint) {
      this.sendToEndpoint({
        name,
        value,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: window.navigator.userAgent,
      });
    }

    // Also record in performance service for dashboard
    if (typeof window !== 'undefined' && (window as any).performanceService) {
      (window as any).performanceService.recordMetric({
        name,
        value,
        type: 'web_vitals',
      });
    }
  }

  private async sendToEndpoint(data: any): Promise<void> {
    if (!this.config.endpoint) return;

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance_metric',
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      logger.error('Failed to send performance metric to endpoint', error as Error);
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get specific metric
  getMetric(name: keyof PerformanceMetrics): number | undefined {
    const value = this.metrics[name];
    return typeof value === 'number' ? value : undefined;
  }

  // Record custom metric
  recordMetric(name: string, value: number, category?: string): void {
    (this.metrics as any)[name] = value;

    logger.info(`Custom performance metric: ${name}`, {
      category: category || 'custom_metric',
      metricName: name,
      value,
    });
  }

  // Cleanup observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.initialized = false;
  }
}

// Create default performance monitor instance
export const performanceMonitor = new PerformanceMonitor({
  enabled: process.env.NODE_ENV === 'production',
  trackCoreWebVitals: true,
  trackResourceTiming: true,
  trackMemoryUsage: true,
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production, 100% in development
  endpoint: process.env.NEXT_PUBLIC_PERFORMANCE_ENDPOINT,
});

export default performanceMonitor;