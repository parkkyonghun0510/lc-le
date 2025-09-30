export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  environment?: string;
  appVersion?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  baseUrl?: string;
  apiKey?: string;
  environment: string;
  appVersion: string;
  bufferSize: number;
  flushInterval: number;
}

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      environment: this.getEnvironment(),
      appVersion: this.getAppVersion(),
      bufferSize: 50,
      flushInterval: 5000,
      ...config,
    };

    this.sessionId = this.generateSessionId();

    if (this.config.enableRemote && this.config.flushInterval > 0) {
      this.startFlushTimer();
    }

    // Flush logs on page unload
    if (this.isBrowser() && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', () => {
        this.flush().catch(() => {
          // Ignore errors during page unload
        });
      });
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEnvironment(): string {
    // Use process.env if available (Node.js), otherwise default to development
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    return 'development';
  }

  private getAppVersion(): string {
    // Use process.env if available (Node.js), otherwise default to 1.0.0
    if (typeof process !== 'undefined' && process.env && process.env.npm_package_version) {
      return process.env.npm_package_version;
    }
    return '1.0.0';
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private isNode(): boolean {
    return typeof process !== 'undefined' && process.versions && !!process.versions.node;
  }

  private getUserAgent(): string | undefined {
    if (this.isBrowser() && typeof window.navigator !== 'undefined') {
      return window.navigator.userAgent;
    }
    return undefined;
  }

  private getCurrentUrl(): string | undefined {
    if (this.isBrowser() && typeof window.location !== 'undefined') {
      return window.location.href;
    }
    return undefined;
  }

  private getLocalStorageItem(key: string): string | null {
    if (this.isBrowser() && typeof Storage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        // localStorage might not be available in some environments
        return null;
      }
    }
    return null;
  }

  private buildEndpointUrl(endpoint?: string): string | null {
    // If a full remoteEndpoint is provided, use it directly
    if (this.config.remoteEndpoint && !this.config.baseUrl) {
      return this.config.remoteEndpoint;
    }

    // If baseUrl is provided, build the full URL
    if (this.config.baseUrl) {
      const baseUrl = this.config.baseUrl.endsWith('/')
        ? this.config.baseUrl.slice(0, -1)
        : this.config.baseUrl;

      const endpointPath = endpoint || '';
      const path = endpointPath.startsWith('/')
        ? endpointPath
        : `/${endpointPath}`;

      return `${baseUrl}${path}`;
    }

    // Fallback to the direct remoteEndpoint
    return this.config.remoteEndpoint || null;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      sessionId: this.sessionId,
      environment: this.config.environment,
      appVersion: this.config.appVersion,
    };

    // Add browser context if available
    entry.userAgent = this.getUserAgent();
    entry.url = this.getCurrentUrl();

    // Add user context if available
    const user = this.getLocalStorageItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        entry.userId = userData.id || userData.userId;
      } catch (e) {
        // Ignore invalid user data
      }
    }

    return entry;
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    const endpointUrl = this.buildEndpointUrl();
    if (!this.config.enableRemote || !endpointUrl) {
      return;
    }

    // Check if fetch is available
    if (typeof fetch !== 'function') {
      return;
    }

    try {
      await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to console if remote logging fails
    }
  }

  private async sendToRemoteBatch(entries: LogEntry[]): Promise<void> {
    const endpointUrl = this.buildEndpointUrl();
    if (!this.config.enableRemote || !endpointUrl) {
      return;
    }

    // Check if fetch is available
    if (typeof fetch !== 'function') {
      return;
    }

    try {
      await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({ logs: entries }),
      });
    } catch (error) {
      // Fallback to console if remote logging fails
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.timestamp}] ${levelName}:`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        break;
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entriesToFlush = [...this.buffer];
    this.buffer = [];

    if (this.config.enableRemote) {
      try {
        await this.sendToRemoteBatch(entriesToFlush);
      } catch (error) {
        // If remote logging fails, we could optionally re-queue the logs
        // For now, we just log the error and continue
      }
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.writeToConsole(entry);
    this.addToBuffer(entry);

    // Immediately flush errors for faster visibility
    if (this.config.enableRemote) {
      this.flush();
    }
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;

    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error);
    this.writeToConsole(entry);
    this.addToBuffer(entry);

    // Immediately flush fatal errors
    if (this.config.enableRemote) {
      this.flush();
    }
  }

  // Performance monitoring
  time(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.time(label);
  }

  timeEnd(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.timeEnd(label);
  }

  // Request/Response logging
  logApiRequest(method: string, url: string, context?: Record<string, any>): void {
    this.info(`API Request: ${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...context,
    });
  }

  logApiResponse(method: string, url: string, status: number, duration?: number, context?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `API Response: ${method} ${url} - ${status}`, {
      type: 'api_response',
      method,
      url,
      status,
      duration,
      ...context,
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(level, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  // Update configuration
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    const oldEnableRemote = this.config.enableRemote;
    this.config = { ...this.config, ...newConfig };

    if (!oldEnableRemote && this.config.enableRemote && this.config.flushInterval > 0) {
      this.startFlushTimer();
    } else if (oldEnableRemote && !this.config.enableRemote) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }
    }
  }

  // Get current session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Test connection with health check endpoint
  async testConnection(endpoint?: string): Promise<boolean> {
    const testUrl = this.buildEndpointUrl(endpoint || 'healthz');
    if (!testUrl) {
      return false;
    }

    // Check if fetch is available
    if (typeof fetch !== 'function') {
      return false;
    }

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
      });

      const success = response.ok;
      return success;
    } catch (error) {
      return false;
    }
  }

  // Get the current endpoint URL for testing
  getEndpointUrl(endpoint?: string): string | null {
    return this.buildEndpointUrl(endpoint);
  }

  // Cleanup method to prevent memory leaks
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    // Flush any remaining logs
    if (this.buffer.length > 0) {
      this.flush().catch(() => {
        // Ignore errors during cleanup
      });
    }
  }
}

// Create default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NEXT_PUBLIC_LOGGING_BASE_URL ? true : false,
  baseUrl: process.env.NEXT_PUBLIC_LOGGING_BASE_URL,
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_LOGGING_API_KEY,
});

export default logger;