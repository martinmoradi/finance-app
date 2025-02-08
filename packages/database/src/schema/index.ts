import { users } from './users';
export * from './users';

export const schema = {
  users,
} as const;

export type Schema = typeof schema;
