import { getRequiredEnvVar } from '@repo/env-validation';

/**
 * Configuration for Cross-Origin Resource Sharing (CORS).
 * Defines allowed origins, methods, credentials, headers, and cache settings.
 */
const allowedOrigins = getRequiredEnvVar('ALLOWED_ORIGINS');
export const corsConfig = {
  // We'll read allowed origins from environment variables
  origins: allowedOrigins.split(','),

  // Specify which HTTP methods are allowed
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Since we are building a finance app, we need credentials
  credentials: true,

  // Allow these headers in requests
  allowedHeaders: ['Content-Type', 'Authorization'],

  // How long the browser should cache the CORS response
  maxAge: 86400, // 24 hours
};
