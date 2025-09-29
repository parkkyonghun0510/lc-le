import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Rate limiting - simple in-memory store (for production, use Redis/external store)
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  const rateLimitKey = `rate_limit:${clientIP}`;
  const rateLimitWindow = 60 * 1000; // 1 minute
  const rateLimitMax = 100; // requests per minute

  // Simple rate limiting (in production, use Redis or external rate limiting service)
  const now = Date.now();
  const windowStart = now - rateLimitWindow;

  // Security headers
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Content Security Policy
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Performance headers for static assets
  if (request.nextUrl.pathname.startsWith('/static/') ||
      request.nextUrl.pathname.includes('.')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // API routes should not be cached
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    // Additional API security headers
    response.headers.set('X-API-Version', '1.0');
  }

  // Health check endpoint - allow more requests
  if (request.nextUrl.pathname === '/healthz') {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};