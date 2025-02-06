import { z } from 'zod';

export const getRequiredEnvVar = (key: string): string => {
  return z
    .string()
    .min(1, `Environment variable ${key} is required but was empty`)
    .parse(process.env[key]);
};

export const createEnvSchema = <T extends z.ZodRawShape>(schema: T) => {
  return z.object(schema).parse(process.env);
};
