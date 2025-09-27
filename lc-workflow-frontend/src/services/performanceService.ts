/**
 * Frontend Performance Monitoring Service
 * Tracks and reports performance metrics for optimization
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'paint' | 'measure' | 'custom';
  url?: string;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    averageLoadTime: number;
    slowestPage: string;
    fastestPage: string;
  };
  recommendations: string[];
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializePerformanceObserver();
      this.trackPageLoad();
    }
  }

  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    // Track navigation timing
    const navObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          this.recordMetric({
            name: 'page_load_time',
            value: entry.duration,
            type: 'navigation',
            url: window.location.pathname,
          });
        }
      });
    });

    try {
      navObserver.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Navigation timing not supported:', error);
    }

    // Track paint timing
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'paint') {
          this.recordMetric({
            name: entry.name === 'first-contentful-paint' ? 'fcp' : 'lcp',
            value: entry.startTime,
            type: 'paint',
            url: window.location.pathname,
          });
        }
      });
    });

    try {
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Paint timing not supported:', error);
    }

    // Track largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric({
        name: 'lcp',
        value: lastEntry.startTime,
        type: 'paint',
        url: window.location.pathname,
      });
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP timing not supported:', error);
    }
  }

  private trackPageLoad(): void {
    if (typeof window === 'undefined') return;

    // Track when page becomes interactive
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordMetric({
            name: 'dom_content_loaded',
            value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            type: 'navigation',
            url: window.location.pathname,
          });

          this.recordMetric({
            name: 'dom_complete',
            value: navigation.domComplete - navigation.fetchStart,
            type: 'navigation',
            url: window.location.pathname,
          });
        }
      }, 0);
    });
  }

  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Log slow metrics
    if (metric.value > 1000) {
      console.warn(`Slow metric detected: ${metric.name} = ${metric.value}ms`);
    }
  }

  public measureCustom(name: string, fn: () => void): void {
    if (!this.isEnabled) return;

    const start = performance.now();
    fn();
    const end = performance.now();

    this.recordMetric({
      name,
      value: end - start,
      type: 'custom',
      url: window.location.pathname,
    });
  }

  public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();

    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      
      this.recordMetric({
        name,
        value: end - start,
        type: 'custom',
        url: window.location.pathname,
      });

      return result;
    } catch (error) {
      const end = performance.now();
      
      this.recordMetric({
        name: `${name}_error`,
        value: end - start,
        type: 'custom',
        url: window.location.pathname,
      });

      throw error;
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricsByPage(page: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.url === page);
  }

  public getSlowMetrics(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.value > threshold);
  }

  public generateReport(): PerformanceReport {
    const navigationMetrics = this.metrics.filter(m => m.type === 'navigation');
    const loadTimes = navigationMetrics
      .filter(m => m.name === 'page_load_time')
      .map(m => m.value);

    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;

    const pageMetrics = navigationMetrics.reduce((acc, metric) => {
      if (!metric.url) return acc;
      
      if (!acc[metric.url]) {
        acc[metric.url] = [];
      }
      acc[metric.url].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    const pageAverages = Object.entries(pageMetrics).map(([url, times]) => ({
      url,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    }));

    const slowestPage = pageAverages.reduce((slowest, current) => 
      current.averageTime > slowest.averageTime ? current : slowest, 
      { url: '', averageTime: 0 }
    );

    const fastestPage = pageAverages.reduce((fastest, current) => 
      current.averageTime < fastest.averageTime ? current : fastest, 
      { url: '', averageTime: Infinity }
    );

    const recommendations = this.generateRecommendations();

    return {
      metrics: this.metrics,
      summary: {
        totalMetrics: this.metrics.length,
        averageLoadTime: Math.round(averageLoadTime),
        slowestPage: slowestPage.url,
        fastestPage: fastestPage.url,
      },
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const slowMetrics = this.getSlowMetrics(1000);

    if (slowMetrics.length > 0) {
      recommendations.push(`Found ${slowMetrics.length} slow operations (>1s). Consider optimization.`);
    }

    const fcpMetrics = this.metrics.filter(m => m.name === 'fcp');
    const avgFCP = fcpMetrics.length > 0 
      ? fcpMetrics.reduce((sum, m) => sum + m.value, 0) / fcpMetrics.length 
      : 0;

    if (avgFCP > 1800) {
      recommendations.push('First Contentful Paint is slow (>1.8s). Consider code splitting and lazy loading.');
    }

    const lcpMetrics = this.metrics.filter(m => m.name === 'lcp');
    const avgLCP = lcpMetrics.length > 0 
      ? lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length 
      : 0;

    if (avgLCP > 2500) {
      recommendations.push('Largest Contentful Paint is slow (>2.5s). Optimize images and critical resources.');
    }

    const loadTimeMetrics = this.metrics.filter(m => m.name === 'page_load_time');
    const avgLoadTime = loadTimeMetrics.length > 0 
      ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length 
      : 0;

    if (avgLoadTime > 3000) {
      recommendations.push('Page load time is slow (>3s). Consider bundle optimization and caching.');
    }

    return recommendations;
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      report: this.generateReport(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// Create singleton instance
export const performanceService = new PerformanceService();

// Export types
export type { PerformanceMetric, PerformanceReport };
