import { eq, InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Table definition
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types
export type UserSelect = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserUpdate = Partial<UserInsert>;

// Relations
// export const usersRelations = relations(users, ({ many }) => ({
//   posts: many(posts),
// }));

// Common queries
export const queries = {
  byId: (id: string) => ({
    where: eq(users.id, id),
  }),
  // Add more common queries as needed
};
