/**
 * Security utilities for input validation, sanitization, and protection
 */

// Input validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[0-9\s\-\(\)]{10,15}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^[0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_.@]+$/,
  khmerText: /^[\u1780-\u17FF\s]+$/,
  currency: /^\d+(\.\d{1,2})?$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  safeText: /^[a-zA-Z0-9\s\-_.,!?'"@#$%&*()[\]{}|\\:;]+$/,
} as const;

// Input sanitization functions
export class InputSanitizer {
  /**
   * Sanitize string input by removing potentially dangerous characters
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .slice(0, maxLength);
  }

  /**
   * Sanitize HTML content (basic)
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\-_.]/g, '_')
      .replace(/\.+/g, '.')
      .slice(0, 255);
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }

  /**
   * Escape SQL injection patterns
   */
  static escapeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }
}

// Input validation functions
export class InputValidator {
  /**
   * Validate email address
   */
  static isValidEmail(email: string): boolean {
    return ValidationPatterns.email.test(email) && email.length <= 254;
  }

  /**
   * Validate phone number
   */
  static isValidPhone(phone: string): boolean {
    return ValidationPatterns.phone.test(phone);
  }

  /**
   * Validate required field
   */
  static isNotEmpty(value: any): boolean {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  /**
   * Validate string length
   */
  static isValidLength(value: string, min: number = 0, max: number = 1000): boolean {
    const length = value?.length || 0;
    return length >= min && length <= max;
  }

  /**
   * Validate numeric range
   */
  static isValidRange(value: number, min: number, max: number): boolean {
    return !isNaN(value) && value >= min && value <= max;
  }

  /**
   * Validate file type
   */
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }

  /**
   * Validate file size
   */
  static isValidFileSize(size: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size > 0 && size <= maxSizeBytes;
  }

  /**
   * Check for potentially dangerous content
   */
  static containsDangerousContent(input: string): boolean {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /document\.cookie/gi,
      /document\.write/gi,
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
  }
}

// Rate limiting utility
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(key: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    const existing = this.requests.get(key);

    if (!existing || existing.resetTime < windowStart) {
      // New window or expired window
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (existing.count >= maxRequests) {
      return true; // Rate limited
    }

    existing.count++;
    return false;
  }

  /**
   * Get remaining requests for key
   */
  static getRemainingRequests(key: string, maxRequests: number = 100): number {
    const existing = this.requests.get(key);
    if (!existing) return maxRequests;

    return Math.max(0, maxRequests - existing.count);
  }

  /**
   * Get reset time for key
   */
  static getResetTime(key: string): number {
    const existing = this.requests.get(key);
    return existing?.resetTime || 0;
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }
}

// Content Security Policy utilities
export class CSPUtils {
  /**
   * Generate nonce for inline scripts
   */
  static generateNonce(): string {
    return Buffer.from(Math.random().toString()).toString('base64').slice(0, 16);
  }

  /**
   * Generate CSP header value
   */
  static generateCSPHeader(options: {
    nonce?: string;
    allowInlineStyles?: boolean;
    allowInlineScripts?: boolean;
    allowedDomains?: string[];
  } = {}): string {
    const {
      nonce,
      allowInlineStyles = false,
      allowInlineScripts = false,
      allowedDomains = []
    } = options;

    const directives = [
      "default-src 'self'",
      `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ''} ${allowInlineScripts ? "'unsafe-inline'" : ''}`,
      `style-src 'self' ${allowInlineStyles ? "'unsafe-inline'" : ''} https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' " + allowedDomains.join(' '),
      "frame-ancestors 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ];

    return directives.join('; ');
  }
}

// Security headers utility
export class SecurityHeaders {
  /**
   * Get all recommended security headers
   */
  static getHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
  }

  /**
   * Get CSP header
   */
  static getCSPHeader(nonce?: string): string {
    return CSPUtils.generateCSPHeader({ nonce });
  }
}

// Export commonly used validation functions
export const validateEmail = InputValidator.isValidEmail;
export const validatePhone = InputValidator.isValidPhone;
export const validateRequired = InputValidator.isNotEmpty;
export const validateLength = InputValidator.isValidLength;
export const sanitizeString = InputSanitizer.sanitizeString;
export const sanitizeHtml = InputSanitizer.sanitizeHtml;
export const checkRateLimit = RateLimiter.isRateLimited;