import { NewUser } from '@repo/types';
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters long'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be less than 100 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
}) satisfies z.ZodType<NewUser>;
