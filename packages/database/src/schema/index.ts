import { users } from './user';

export { users };

export const schema = {
  users,
} as const;

export type Schema = typeof schema;
