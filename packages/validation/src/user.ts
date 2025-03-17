import { NewUser, SigninCredentials } from '@repo/types';
import { z } from 'zod';

// Server schema
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters long')
    .toLowerCase(),
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

// Frontend schema with i18n keys for messages
export const signupFormSchema = z
  .object({
    email: z
      .string()
      .email('validation.email.invalid')
      .min(1, 'validation.email.required')
      .max(255, 'validation.email.maxLength')
      .toLowerCase(),
    name: z
      .string()
      .min(2, 'validation.name.minLength')
      .max(100, 'validation.name.maxLength'),
    password: z
      .string()
      .min(8, 'validation.password.minLength')
      .max(100, 'validation.password.maxLength')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
        'validation.password.pattern',
      ),
    confirmPassword: z
      .string()
      .min(8, 'validation.confirmPassword.minLength')
      .max(100, 'validation.confirmPassword.maxLength'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordMatch',
    path: ['confirmPassword'],
  });

export const signinFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'validation.password.minLength'),
}) satisfies z.ZodType<SigninCredentials>;
