import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint for Railway deployment
 * This endpoint doesn't check external dependencies to ensure quick startup
 * For detailed health monitoring, use /healthz instead
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'lc-workflow-frontend',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    }
  );
}
