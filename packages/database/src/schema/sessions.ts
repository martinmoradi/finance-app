import { users } from '@/schema/users';
import {
  and,
  eq,
  InferInsertModel,
  InferSelectModel,
  relations,
} from 'drizzle-orm';
import { index } from 'drizzle-orm/pg-core';
import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Table definition
export const sessions = pgTable(
  'sessions',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull(),
    token: text('token').notNull(),
    lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.deviceId] }),
    index('expires_at_idx').on(t.expiresAt),
  ],
);

// Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Types
export type DbSessionSelect = InferSelectModel<typeof sessions>;
export type DbSessionInsert = InferInsertModel<typeof sessions>;
export type DbSessionUpdate = Partial<DbSessionInsert>;

// Common queries
export const sessionQueries = {
  byUserId: (userId: string) => ({
    where: eq(sessions.userId, userId),
  }),
  byUserIdAndDeviceId: (userId: string, deviceId: string) => ({
    where: and(eq(sessions.userId, userId), eq(sessions.deviceId, deviceId)),
  }),
};
