import { Injectable, Logger } from '@nestjs/common';
import { getRequiredEnvVar } from '@repo/env-validation';

type LogContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

@Injectable()
export class LoggerService {
  private logger: Logger;
  private prefix: string;

  get isDev(): boolean {
    return getRequiredEnvVar('NODE_ENV') === 'development';
  }

  constructor(serviceName?: string) {
    this.prefix = serviceName ? `[${serviceName}]:` : '';
    this.logger = new Logger('Finance App', {
      timestamp: true,
    });
  }

  setContext(context: string): LoggerService {
    this.prefix = context ? `[${context}]:` : '';
    return this;
  }

  // Clone method to create a new instance with a different context
  forContext(context: string): LoggerService {
    return new LoggerService(context);
  }

  /**
   * Debug level for detailed troubleshooting information
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(
      `${this.prefix} ${message}`,
      this.sanitizeContext(context),
    );
  }

  /**
   * Info level for general application flow
   */
  info(message: string, context?: LogContext): void {
    this.logger.log(`${this.prefix} ${message}`, this.sanitizeContext(context));
  }

  /**
   * Warn level for potentially harmful situations or expected issues
   *
   * Examples:
   * - Invalid user input
   * - Deprecated feature usage
   * - Resource usage approaching limits
   * - Non-critical configuration issues
   * - Slow query performance
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(
      `${this.prefix} ${message}`,
      this.sanitizeContext(context),
    );
  }

  /**
   * Error level for error events that might still allow the application to continue running
   *
   * Examples:
   * - Failed API calls
   * - Database query errors
   * - Authentication/Authorization failures
   * - File system errors
   * - Non-critical service failures
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: this.isDev ? error.stack : undefined,
            ...context,
          }
        : {
            error,
            ...context,
          };

    this.logger.error(
      `${this.prefix} ${message}`,
      error instanceof Error ? error.stack : undefined,
      this.sanitizeContext(errorContext),
    );
  }

  /**
   * Fatal level for severe errors that prevent the application from working properly
   * and typically require immediate attention or cause application termination
   *
   * Examples:
   * - Failed application initialization
   * - Critical service failures
   * - Database connection failure during startup
   * - Corrupt application state
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack, // Always include stack for fatal errors
            ...context,
          }
        : {
            error,
            ...context,
          };

    this.logger.error(
      `${this.prefix} [FATAL] ${message}`,
      error instanceof Error ? error.stack : undefined,
      this.sanitizeContext(errorContext),
    );
  }

  /**
   * Sanitizes the context object to prevent sensitive data logging
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    if (this.isDev) return context;

    // Create a shallow copy of the context
    const sanitized = { ...context };

    // List of sensitive fields to mask
    const sensitiveFields = ['password', 'token', 'secret', 'credential'];

    // Mask sensitive data
    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
