import { sessions } from './sessions';
import { users } from './users';

export * from './users';
export * from './sessions';

export const schema = {
  users,
  sessions,
} as const;

export type Schema = typeof schema;
