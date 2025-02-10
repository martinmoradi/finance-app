import { DbUserSelect, DbUserInsert, DbUserUpdate } from '@repo/database';

export type User = DbUserSelect;
export type UserInsert = DbUserInsert;
export type UserUpdate = DbUserUpdate;
export type UserProfile = Pick<User, 'id' | 'email' | 'name'>;
