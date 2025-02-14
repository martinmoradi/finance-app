import { sessions } from '@/schema/sessions';
import {
  eq,
  InferInsertModel,
  InferSelectModel,
  relations,
  sql,
} from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Table definition
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      'valid_email',
      sql`${t.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`,
    ),
  ],
);

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
