import { sessions, sessionsRelations } from './sessions';
import { users, usersRelations } from './users';

export * from './sessions';
export * from './users';

export const tables = {
  users,
  sessions,
} as const;

export const schema = {
  users,
  usersRelations,
  sessions,
  sessionsRelations,
} as const;

export type Schema = typeof schema;
