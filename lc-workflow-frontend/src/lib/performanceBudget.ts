// Performance budget monitoring and enforcement
import { logger } from './logger';

export interface PerformanceBudget {
  // Bundle size budgets (in bytes)
  bundleSize: {
    warning: number;
    error: number;
  };

  // Core Web Vitals budgets (in milliseconds)
  coreWebVitals: {
    lcp: { warning: number; error: number };
    fid: { warning: number; error: number };
    cls: { warning: number; error: number };
  };

  // Custom performance budgets
  customMetrics: {
    [key: string]: { warning: number; error: number };
  };
}

export interface BudgetCheckResult {
  passed: boolean;
  violations: BudgetViolation[];
  warnings: BudgetWarning[];
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  severity: 'error';
}

export interface BudgetWarning {
  metric: string;
  actual: number;
  budget: number;
  severity: 'warning';
}

class PerformanceBudgetMonitor {
  private budget: PerformanceBudget;

  constructor(budget: PerformanceBudget) {
    this.budget = budget;
  }

  checkBundleSize(actualSize: number): BudgetCheckResult {
    const violations: BudgetViolation[] = [];
    const warnings: BudgetWarning[] = [];

    if (actualSize >= this.budget.bundleSize.error) {
      violations.push({
        metric: 'bundle_size',
        actual: actualSize,
        budget: this.budget.bundleSize.error,
        severity: 'error',
      });
    } else if (actualSize >= this.budget.bundleSize.warning) {
      warnings.push({
        metric: 'bundle_size',
        actual: actualSize,
        budget: this.budget.bundleSize.warning,
        severity: 'warning',
      });
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  checkCoreWebVitals(metrics: {
    lcp?: number;
    fid?: number;
    cls?: number;
  }): BudgetCheckResult {
    const violations: BudgetViolation[] = [];
    const warnings: BudgetWarning[] = [];

    // Check LCP
    if (metrics.lcp !== undefined) {
      if (metrics.lcp >= this.budget.coreWebVitals.lcp.error) {
        violations.push({
          metric: 'lcp',
          actual: metrics.lcp,
          budget: this.budget.coreWebVitals.lcp.error,
          severity: 'error',
        });
      } else if (metrics.lcp >= this.budget.coreWebVitals.lcp.warning) {
        warnings.push({
          metric: 'lcp',
          actual: metrics.lcp,
          budget: this.budget.coreWebVitals.lcp.warning,
          severity: 'warning',
        });
      }
    }

    // Check FID
    if (metrics.fid !== undefined) {
      if (metrics.fid >= this.budget.coreWebVitals.fid.error) {
        violations.push({
          metric: 'fid',
          actual: metrics.fid,
          budget: this.budget.coreWebVitals.fid.error,
          severity: 'error',
        });
      } else if (metrics.fid >= this.budget.coreWebVitals.fid.warning) {
        warnings.push({
          metric: 'fid',
          actual: metrics.fid,
          budget: this.budget.coreWebVitals.fid.warning,
          severity: 'warning',
        });
      }
    }

    // Check CLS
    if (metrics.cls !== undefined) {
      if (metrics.cls >= this.budget.coreWebVitals.cls.error) {
        violations.push({
          metric: 'cls',
          actual: metrics.cls,
          budget: this.budget.coreWebVitals.cls.error,
          severity: 'error',
        });
      } else if (metrics.cls >= this.budget.coreWebVitals.cls.warning) {
        warnings.push({
          metric: 'cls',
          actual: metrics.cls,
          budget: this.budget.coreWebVitals.cls.warning,
          severity: 'warning',
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  checkCustomMetric(metricName: string, actualValue: number): BudgetCheckResult {
    const budget = this.budget.customMetrics[metricName];
    if (!budget) {
      return { passed: true, violations: [], warnings: [] };
    }

    const violations: BudgetViolation[] = [];
    const warnings: BudgetWarning[] = [];

    if (actualValue >= budget.error) {
      violations.push({
        metric: metricName,
        actual: actualValue,
        budget: budget.error,
        severity: 'error',
      });
    } else if (actualValue >= budget.warning) {
      warnings.push({
        metric: metricName,
        actual: actualValue,
        budget: budget.warning,
        severity: 'warning',
      });
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  checkAllBudgets(bundleSize: number, webVitals: any, customMetrics: Record<string, number> = {}): BudgetCheckResult {
    const bundleResult = this.checkBundleSize(bundleSize);
    const vitalsResult = this.checkCoreWebVitals(webVitals);

    let allViolations = [...bundleResult.violations, ...vitalsResult.violations];
    let allWarnings = [...bundleResult.warnings, ...vitalsResult.warnings];

    // Check custom metrics
    for (const [metricName, value] of Object.entries(customMetrics)) {
      const customResult = this.checkCustomMetric(metricName, value);
      allViolations = allViolations.concat(customResult.violations);
      allWarnings = allWarnings.concat(customResult.warnings);
    }

    return {
      passed: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
    };
  }

  logBudgetResults(result: BudgetCheckResult): void {
    if (result.violations.length > 0) {
      logger.error('Performance budget violations detected', undefined, {
        category: 'performance_budget_violation',
        violations: result.violations,
      });
    }

    if (result.warnings.length > 0) {
      logger.warn('Performance budget warnings', {
        category: 'performance_budget_warning',
        warnings: result.warnings,
      });
    }

    if (result.passed) {
      logger.info('All performance budgets within limits', {
        category: 'performance_budget_ok',
      });
    }
  }

  getBudgetRecommendations(result: BudgetCheckResult): string[] {
    const recommendations: string[] = [];

    result.violations.forEach(violation => {
      switch (violation.metric) {
        case 'bundle_size':
          recommendations.push(
            'Bundle size exceeds budget. Consider code splitting, tree shaking, or reducing dependencies.'
          );
          break;
        case 'lcp':
          recommendations.push(
            'Largest Contentful Paint is too high. Optimize image loading, reduce render-blocking resources, or improve server response time.'
          );
          break;
        case 'fid':
          recommendations.push(
            'First Input Delay is too high. Reduce JavaScript execution time, avoid long tasks, or defer non-critical work.'
          );
          break;
        case 'cls':
          recommendations.push(
            'Cumulative Layout Shift is too high. Set dimensions for images and embeds, avoid inserting content above existing content.'
          );
          break;
        default:
          recommendations.push(
            `${violation.metric} exceeds budget. Review and optimize this metric.`
          );
      }
    });

    result.warnings.forEach(warning => {
      switch (warning.metric) {
        case 'bundle_size':
          recommendations.push(
            'Bundle size is approaching budget limit. Monitor and consider optimization if it continues to grow.'
          );
          break;
        case 'lcp':
          recommendations.push(
            'Largest Contentful Paint is approaching budget limit. Consider preloading critical resources.'
          );
          break;
        case 'fid':
          recommendations.push(
            'First Input Delay is approaching budget limit. Consider code splitting heavy JavaScript bundles.'
          );
          break;
        case 'cls':
          recommendations.push(
            'Cumulative Layout Shift is approaching budget limit. Review dynamic content loading.'
          );
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

// Default performance budget for production
export const defaultPerformanceBudget: PerformanceBudget = {
  bundleSize: {
    warning: 1024 * 1024, // 1MB
    error: 2 * 1024 * 1024, // 2MB
  },
  coreWebVitals: {
    lcp: { warning: 2500, error: 4000 }, // milliseconds
    fid: { warning: 100, error: 300 }, // milliseconds
    cls: { warning: 0.1, error: 0.25 }, // score
  },
  customMetrics: {
    page_load_time: { warning: 2000, error: 3000 },
    api_response_time: { warning: 500, error: 1000 },
    component_render_time: { warning: 100, error: 200 },
  },
};

// Create default budget monitor
export const performanceBudgetMonitor = new PerformanceBudgetMonitor(defaultPerformanceBudget);

// Utility functions
export function checkBundleSizeBudget(size: number): BudgetCheckResult {
  return performanceBudgetMonitor.checkBundleSize(size);
}

export function checkWebVitalsBudget(vitals: any): BudgetCheckResult {
  return performanceBudgetMonitor.checkCoreWebVitals(vitals);
}

export function checkCustomMetricBudget(metricName: string, value: number): BudgetCheckResult {
  return performanceBudgetMonitor.checkCustomMetric(metricName, value);
}

export function logPerformanceBudgetResults(result: BudgetCheckResult): void {
  performanceBudgetMonitor.logBudgetResults(result);
}

export function getBudgetRecommendations(result: BudgetCheckResult): string[] {
  return performanceBudgetMonitor.getBudgetRecommendations(result);
}