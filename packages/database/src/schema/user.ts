import { eq } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
// export const usersRelations = relations(users, ({ many }) => ({
//   posts: many(posts),
// }));

// We can export common queries
export const queries = {
  byId: (id: string) => ({
    where: eq(users.id, id),
  }),
  // Add more common queries as needed
};
