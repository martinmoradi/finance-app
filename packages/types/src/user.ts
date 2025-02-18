import { DbUserSelect, DbUserInsert, DbUserUpdate } from '@repo/database';

// Database types
export type DatabaseUser = DbUserSelect; // Full user object from the database
export type NewUser = DbUserInsert; // Data needed to create a new user
export type UserUpdate = DbUserUpdate; // Data allowed to be updated

// Public user information
export type PublicUser = Pick<DatabaseUser, 'id' | 'email' | 'name'>;
