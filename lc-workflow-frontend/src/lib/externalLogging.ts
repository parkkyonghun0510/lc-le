// External logging service integration
import { logger, LogEntry, LogLevel } from './logger';

export interface ExternalLoggingConfig {
  enabled: boolean;
  endpoint?: string;
  baseUrl?: string;
  apiKey?: string;
  environment: string;
  service: string;
}

class ExternalLoggingService {
  private config: ExternalLoggingConfig;
  private initialized = false;
  private userContext: { id: string; email?: string; name?: string } | null = null;

  constructor(config: ExternalLoggingConfig) {
    this.config = config;
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('External logging service disabled', {
        category: 'external_logging_disabled',
      });
      return;
    }

    try {
      this.initialized = true;
      logger.info('External logging service initialized', {
        category: 'external_logging_init',
        service: this.config.service,
        environment: this.config.environment,
      });
    } catch (error) {
      logger.error('Failed to initialize external logging service', error as Error, {
        category: 'external_logging_init_error',
      });
    }
  }

  private buildEndpointUrl(endpoint?: string): string | null {
    // If a full endpoint is provided, use it directly
    if (this.config.endpoint && !this.config.baseUrl) {
      return this.config.endpoint;
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

    // Fallback to the direct endpoint
    return this.config.endpoint || null;
  }

  // Method to capture exceptions
  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.initialized || !this.config.enabled) return;

    try {
      // Enhanced error logging with user context
      logger.error('External exception captured', error, {
        category: 'external_exception',
        service: this.config.service,
        userId: this.userContext?.id,
        ...context,
      });

      // Send to external endpoint if configured
      if (this.config.endpoint) {
        this.sendToEndpoint({
          timestamp: new Date().toISOString(),
          level: LogLevel.ERROR,
          message: `Exception: ${error.message}`,
          context: {
            category: 'external_exception',
            service: this.config.service,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            userId: this.userContext?.id,
            ...context,
          },
          error,
          environment: this.config.environment,
        });
      }
    } catch (reportingError) {
      logger.error('Failed to report exception to external service', reportingError as Error);
    }
  }

  // Method to capture messages
  captureMessage(message: string, level: LogLevel = LogLevel.INFO, context?: Record<string, any>): void {
    if (!this.initialized || !this.config.enabled) return;

    try {
      // Log the message using public methods
      switch (level) {
        case LogLevel.DEBUG:
          logger.debug(`External message: ${message}`, {
            category: 'external_message',
            service: this.config.service,
            userId: this.userContext?.id,
            ...context,
          });
          break;
        case LogLevel.INFO:
          logger.info(`External message: ${message}`, {
            category: 'external_message',
            service: this.config.service,
            userId: this.userContext?.id,
            ...context,
          });
          break;
        case LogLevel.WARN:
          logger.warn(`External message: ${message}`, {
            category: 'external_message',
            service: this.config.service,
            userId: this.userContext?.id,
            ...context,
          });
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          logger.error(`External message: ${message}`, undefined, {
            category: 'external_message',
            service: this.config.service,
            userId: this.userContext?.id,
            ...context,
          });
          break;
      }

      // Send to external endpoint if configured
      if (this.config.endpoint) {
        this.sendToEndpoint({
          timestamp: new Date().toISOString(),
          level,
          message: `External: ${message}`,
          context: {
            category: 'external_message',
            service: this.config.service,
            userId: this.userContext?.id,
            ...context,
          },
          environment: this.config.environment,
        });
      }
    } catch (reportingError) {
      logger.error('Failed to report message to external service', reportingError as Error);
    }
  }

  // Method to send data to external endpoint
  private async sendToEndpoint(entry: LogEntry): Promise<void> {
    const endpointUrl = this.buildEndpointUrl();
    if (!endpointUrl) return;

    // Check if fetch is available
    if (typeof fetch !== 'function') {
      logger.error('Fetch API not available for external logging');
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
      logger.error('Failed to send log entry to external endpoint', error as Error);
    }
  }

  // Method to set user context
  setUserContext(user: { id: string; email?: string; name?: string }): void {
    this.userContext = user;

    logger.info('User context set for external logging', {
      category: 'user_context_set',
      userId: user.id,
      service: this.config.service,
    });
  }

  // Method to clear user context
  clearUserContext(): void {
    this.userContext = null;

    logger.info('User context cleared for external logging', {
      category: 'user_context_cleared',
      service: this.config.service,
    });
  }

  // Get initialization status
  isInitialized(): boolean {
    return this.initialized;
  }

  // Get current user context
  getUserContext(): { id: string; email?: string; name?: string } | null {
    return this.userContext;
  }

  // Test connection with external logging endpoint
  async testConnection(endpoint?: string): Promise<boolean> {
    const testUrl = this.buildEndpointUrl(endpoint || 'healthz');
    if (!testUrl) {
      logger.error('No endpoint URL available for external logging connection test');
      return false;
    }

    // Check if fetch is available
    if (typeof fetch !== 'function') {
      logger.error('Fetch API not available for external logging connection test');
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
      logger.info(`External logging connection test to ${testUrl}: ${success ? 'SUCCESS' : 'FAILED'} (${response.status})`, {
        category: 'external_logging_connection_test',
        service: this.config.service,
        status: response.status,
      });
      return success;
    } catch (error) {
      logger.error(`External logging connection test to ${testUrl} failed:`, error as Error, {
        category: 'external_logging_connection_test_error',
        service: this.config.service,
      });
      return false;
    }
  }

  // Get the current endpoint URL for testing
  getEndpointUrl(endpoint?: string): string | null {
    return this.buildEndpointUrl(endpoint);
  }
}

// Create default external logging service instance
export const externalLogging = new ExternalLoggingService({
  enabled: !!process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_BASE_URL || !!process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_ENDPOINT,
  baseUrl: process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_BASE_URL,
  endpoint: process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_EXTERNAL_LOGGING_API_KEY,
  environment: process.env.NODE_ENV || 'development',
  service: 'lc-workflow-frontend',
});

export default externalLogging;