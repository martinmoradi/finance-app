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

/**
 * Creates a typed schema validator for environment variables.
 *
 * @template T - The shape of the environment schema
 * @param {T} schema - Zod schema object describing the expected environment variables
 * @returns {z.infer<z.ZodObject<T>>} Parsed and validated environment variables
 * @throws {ZodError} If any environment variables fail validation
 *
 * @example
 * const envSchema = createEnvSchema({
 *   NODE_ENV: z.enum(['development', 'production']),
 *   PORT: z.string().transform(Number),
 * });
 */
export const createEnvSchema = <T extends z.ZodRawShape>(schema: T) => {
  return z.object(schema).parse(process.env);
};
