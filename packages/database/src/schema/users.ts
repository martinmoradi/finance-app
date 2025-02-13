import { sessions } from '@/schema/sessions';
import { eq, InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Table definition
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations;
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

// Types
export type DbUserSelect = InferSelectModel<typeof users>;
export type DbUserInsert = InferInsertModel<typeof users>;
export type DbUserUpdate = Partial<DbUserInsert>;

// Common queries
export const userQueries = {
  byId: (id: string) => ({
    where: eq(users.id, id),
  }),
  byEmail: (email: string) => ({
    where: eq(users.email, email),
  }),
  // Add more common queries as needed
};
