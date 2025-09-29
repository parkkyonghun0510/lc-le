import { logger } from './logger';

export interface NetworkDiagnostics {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface ConnectivityTestResult {
  success: boolean;
  url: string;
  responseTime?: number;
  error?: string;
  status?: number;
}

/**
 * Get comprehensive network diagnostics information
 */
export function getNetworkDiagnostics(): NetworkDiagnostics {
  const diagnostics: NetworkDiagnostics = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  // Add connection information if available
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      diagnostics.connectionType = connection.type;
      diagnostics.effectiveType = connection.effectiveType;
      diagnostics.downlink = connection.downlink;
      diagnostics.rtt = connection.rtt;
      diagnostics.saveData = connection.saveData;
    }
  }

  return diagnostics;
}

/**
 * Test connectivity to a specific URL
 */
export async function testConnectivity(url: string, timeout: number = 5000): Promise<ConnectivityTestResult> {
  const startTime = Date.now();

  try {
    logger.debug(`Testing connectivity to ${url}`, {
      category: 'connectivity_test',
      url,
      timeout,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // Avoid CORS issues for basic connectivity testing
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const result: ConnectivityTestResult = {
      success: true,
      url,
      responseTime,
    };

    logger.info(`Connectivity test successful`, {
      category: 'connectivity_test_success',
      url,
      responseTime,
      status: response.status,
    });

    return result;
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const result: ConnectivityTestResult = {
      success: false,
      url,
      responseTime,
      error: error.message,
    };

    logger.warn(`Connectivity test failed`, {
      category: 'connectivity_test_failed',
      url,
      responseTime,
      error: error.message,
      errorName: error.name,
    });

    return result;
  }
}

/**
 * Test connectivity to multiple common endpoints
 */
export async function testMultipleEndpoints(urls: string[]): Promise<ConnectivityTestResult[]> {
  logger.info(`Testing connectivity to ${urls.length} endpoints`, {
    category: 'connectivity_test_batch',
    urls,
  });

  const results = await Promise.allSettled(
    urls.map(url => testConnectivity(url))
  );

  const successfulTests = results.filter((result): result is PromiseFulfilledResult<ConnectivityTestResult> =>
    result.status === 'fulfilled'
  ).map(result => result.value);

  const failedTests = results.filter((result): result is PromiseRejectedResult =>
    result.status === 'rejected'
  ).map(result => result.reason);

  logger.info(`Connectivity test batch completed`, {
    category: 'connectivity_test_batch_complete',
    totalTests: urls.length,
    successfulTests: successfulTests.length,
    failedTests: failedTests.length,
  });

  return successfulTests;
}

/**
 * Monitor network status changes
 */
export function monitorNetworkStatus(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for server-side
  }

  const handleOnline = () => {
    logger.info('Network status changed to online', {
      category: 'network_status_change',
      isOnline: true,
      timestamp: new Date().toISOString(),
    });
    callback(true);
  };

  const handleOffline = () => {
    logger.warn('Network status changed to offline', {
      category: 'network_status_change',
      isOnline: false,
      timestamp: new Date().toISOString(),
    });
    callback(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Comprehensive network health check
 */
export async function performNetworkHealthCheck(): Promise<{
  diagnostics: NetworkDiagnostics;
  connectivityResults: ConnectivityTestResult[];
  overallHealth: 'good' | 'poor' | 'offline';
}> {
  logger.info('Performing comprehensive network health check', {
    category: 'network_health_check_start',
  });

  const diagnostics = getNetworkDiagnostics();

  // Test common endpoints including the actual API endpoint
  const testUrls = [
    'https://www.google.com/favicon.ico',
    'https://httpstat.us/200',
    'https://jsonplaceholder.typicode.com/posts/1',
    // Test the actual API endpoint that's failing
    'http://localhost:8090/api/v1/settings/theme',
  ];

  const connectivityResults = await testMultipleEndpoints(testUrls);

  // Determine overall health
  let overallHealth: 'good' | 'poor' | 'offline' = 'good';

  if (!diagnostics.isOnline) {
    overallHealth = 'offline';
  } else {
    const successfulTests = connectivityResults.filter(r => r.success).length;
    if (successfulTests === 0) {
      overallHealth = 'poor';
    } else if (successfulTests < testUrls.length) {
      overallHealth = 'poor';
    }
  }

  logger.info('Network health check completed', {
    category: 'network_health_check_complete',
    overallHealth,
    diagnostics,
    successfulTests: connectivityResults.filter(r => r.success).length,
    totalTests: testUrls.length,
  });

  return {
    diagnostics,
    connectivityResults,
    overallHealth,
  };
}

/**
 * Test the specific API endpoint that's causing issues
 */
export async function testApiEndpoint(): Promise<ConnectivityTestResult> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1';
  const testUrl = `${API_BASE_URL}/settings/theme`;

  logger.info('Testing specific API endpoint', {
    category: 'api_endpoint_test',
    url: testUrl,
    baseUrl: API_BASE_URL,
  });

  return await testConnectivity(testUrl, 10000); // 10 second timeout for API calls
}