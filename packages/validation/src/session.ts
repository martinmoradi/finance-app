import { SessionUpdate, NewSession } from '@repo/types';
import z from 'zod';

export const createSessionSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  token: z.string().min(1).max(255),
  tokenId: z.string().uuid(),
  expiresAt: z.date().refine((date) => date > new Date(), {
    message: 'Expires at must be in the future',
  }),
}) satisfies z.ZodType<NewSession>;

export type CreateSession = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
  lastUsedAt: z.date(),
  token: z.string().min(1).max(255),
  tokenId: z.string().uuid(),
  expiresAt: z.date().refine((date) => date > new Date(), {
    message: 'Expires at must be in the future',
  }),
}) satisfies z.ZodType<SessionUpdate>;

export const refreshSessionSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  token: z.string().min(1).max(255),
  tokenId: z.string().uuid(),
}) satisfies z.ZodType<SessionUpdate>;

export const validateSessionSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  refreshToken: z.string().min(1).max(255),
}) satisfies z.ZodType<SessionUpdate>;

export const selectSessionSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
}) satisfies z.ZodType<SessionUpdate>;
