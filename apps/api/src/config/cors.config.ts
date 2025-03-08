import { getRequiredEnvVar } from '@repo/env-validation';

/**
 * Configuration for Cross-Origin Resource Sharing (CORS).
 * Defines allowed origins, methods, credentials, headers, and cache settings.
 */
const allowedOriginsString = getRequiredEnvVar('ALLOWED_ORIGINS');
const allowedOriginsList = allowedOriginsString
  .split(',')
  .map((origin) => origin.trim());

// Create an origin handler function that supports wildcards
const originsHandler = (
  origin: string,
  callback: (err: Error | null, allow?: boolean) => void,
): void => {
  // Allow requests with no origin (like mobile apps, curl, etc)
  if (!origin) return callback(null, true);

  // Check if origin matches any patterns
  const isAllowed = allowedOriginsList.some((pattern) => {
    if (pattern.includes('*')) {
      // Convert wildcard pattern to regex pattern
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*/g, '.*'); // Replace * with .*
      return new RegExp(`^${regexPattern}$`).test(origin);
    }
    // Direct match
    return pattern === origin;
  });

  if (isAllowed) {
    callback(null, true);
  } else {
    callback(new Error(`CORS not allowed for origin: ${origin}`), false);
  }
};

export const corsConfig = {
  origin: originsHandler,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  maxAge: 86400, // 24 hours
};
