import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface HealthCheck {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  memory: {
    used: number;
    total: number;
    unit: string;
    percentage: number;
  };
  system: {
    platform: string;
    nodeVersion: string;
    pid: number;
  };
  checks: {
    database?: { status: string; responseTime?: number };
    api?: { status: string; responseTime?: number };
    externalServices?: { status: string; responseTime?: number };
  };
  errors?: string[];
  warnings?: string[];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic system information
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

    const healthCheck: HealthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        unit: 'MB',
        percentage: memoryPercentage,
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      },
      checks: {},
    };

    // Memory warning
    if (memoryPercentage > 85) {
      warnings.push(`High memory usage: ${memoryPercentage}%`);
      healthCheck.status = 'degraded';
    }

    // Uptime check
    if (process.uptime() < 60) {
      warnings.push('Application started recently, may need warmup time');
    }

    // API connectivity check
    try {
      const apiCheckStart = Date.now();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090';
      const apiResponse = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const apiResponseTime = Date.now() - apiCheckStart;

      healthCheck.checks.api = {
        status: apiResponse.ok ? 'ok' : 'error',
        responseTime: apiResponseTime,
      };

      if (!apiResponse.ok) {
        errors.push(`API health check failed: ${apiResponse.status}`);
        healthCheck.status = 'error';
      } else if (apiResponseTime > 2000) {
        warnings.push(`API response time is slow: ${apiResponseTime}ms`);
        if (healthCheck.status === 'ok') healthCheck.status = 'degraded';
      }
    } catch (apiError) {
      healthCheck.checks.api = {
        status: 'error',
        responseTime: Date.now() - startTime,
      };
      errors.push(`API connectivity check failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      healthCheck.status = 'error';
    }

    // External services check (if configured)
    if (process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_ENDPOINT) {
      try {
        const externalCheckStart = Date.now();
        const externalResponse = await fetch(process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'health_check' }),
          signal: AbortSignal.timeout(3000),
        });
        const externalResponseTime = Date.now() - externalCheckStart;

        healthCheck.checks.externalServices = {
          status: externalResponse.ok ? 'ok' : 'error',
          responseTime: externalResponseTime,
        };

        if (!externalResponse.ok) {
          warnings.push(`External logging service responded with status: ${externalResponse.status}`);
          if (healthCheck.status === 'ok') healthCheck.status = 'degraded';
        }
      } catch (externalError) {
        healthCheck.checks.externalServices = {
          status: 'error',
          responseTime: Date.now() - startTime,
        };
        warnings.push(`External logging service check failed: ${externalError instanceof Error ? externalError.message : 'Unknown error'}`);
        if (healthCheck.status === 'ok') healthCheck.status = 'degraded';
      }
    }

    // Add errors and warnings to response
    if (errors.length > 0) {
      healthCheck.errors = errors;
    }
    if (warnings.length > 0) {
      healthCheck.warnings = warnings;
    }

    // Log health check result
    const totalResponseTime = Date.now() - startTime;
    logger.info('Health check completed', {
      category: 'health_check',
      status: healthCheck.status,
      responseTime: totalResponseTime,
      memoryUsage: memoryPercentage,
      errorsCount: errors.length,
      warningsCount: warnings.length,
    });

    const statusCode = healthCheck.status === 'error' ? 503 : healthCheck.status === 'degraded' ? 200 : 200;

    return NextResponse.json(healthCheck, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
        'X-Response-Time': totalResponseTime.toString(),
      }
    });
  } catch (error) {
    const totalResponseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Health check failed', error as Error, {
      category: 'health_check_error',
      responseTime: totalResponseTime,
    });

    return NextResponse.json(
      {
        status: 'error' as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        memory: {
          used: Math.round((process.memoryUsage?.().heapUsed || 0) / 1024 / 1024),
          total: Math.round((process.memoryUsage?.().heapTotal || 0) / 1024 / 1024),
          unit: 'MB',
          percentage: 0,
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
        },
        checks: {},
        error: 'Health check failed',
        message: errorMessage,
        responseTime: totalResponseTime,
      } as HealthCheck,
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
          'X-Response-Time': totalResponseTime.toString(),
        }
      }
    );
  }
}