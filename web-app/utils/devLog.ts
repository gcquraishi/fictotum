/**
 * Development-only logging utilities
 *
 * These functions only log in development mode to avoid console pollution
 * and performance hits in production.
 *
 * Usage:
 *   import { devLog, devWarn, devError } from '@/utils/devLog';
 *   devLog('Debug info', data); // Only logs in development
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log message only in development
 */
export const devLog = isDevelopment
  ? console.log.bind(console)
  : () => {};

/**
 * Warn message only in development
 */
export const devWarn = isDevelopment
  ? console.warn.bind(console)
  : () => {};

/**
 * Error message only in development
 */
export const devError = isDevelopment
  ? console.error.bind(console)
  : () => {};

/**
 * Always log errors (for production error tracking)
 * Use this for critical errors that should be logged in production
 */
export const logError = console.error.bind(console);

/**
 * Conditional logging based on environment
 */
export const conditionalLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(message, data);
  }
};
