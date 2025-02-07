import { z } from 'zod';

/**
 * Retrieves and validates a required environment variable.
 *
 * @param {string} key - The name of the environment variable to retrieve
 * @returns {string} The value of the environment variable
 * @throws {ZodError} If the environment variable is empty or undefined
 *
 * @example
 * const PORT = getRequiredEnvVar('PORT');
 */
export const getRequiredEnvVar = (key: string): string => {
  return z
    .string()
    .min(1, `Environment variable ${key} is required but was empty`)
    .parse(process.env[key]);
};
