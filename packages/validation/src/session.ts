import { SessionUpdate, NewSession } from '@repo/types';
import z from 'zod';

export const createSessionSchema = z.object({
  userId: z.string().uuid(),
  deviceId: z.string().min(1).max(255),
  token: z.string().min(1).max(255),
  expiresAt: z.date().refine((date) => date > new Date(), {
    message: 'Expires at must be in the future',
  }),
}) satisfies z.ZodType<NewSession>;

export type CreateSession = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
  lastUsedAt: z.date(),
  token: z.string().min(1).max(255).optional(),
  expiresAt: z
    .date()
    .refine((date) => date > new Date(), {
      message: 'Expires at must be in the future',
    })
    .optional(),
}) satisfies z.ZodType<SessionUpdate>;
