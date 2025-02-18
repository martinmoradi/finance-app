import { PublicUser } from '@/user';
import {
  DbSessionInsert,
  DbSessionSelect,
  DbSessionUpdate,
} from '@repo/database';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type SigninCredentials = {
  email: string;
  password: string;
};

export type JwtPayload = {
  sub: string;
};

export type AuthenticatedUser = PublicUser & AuthTokens;

// Database types
export type DatabaseSession = DbSessionSelect; // Full  session object from the database
export type NewSession = DbSessionInsert; // Data needed to create a new  session
export type SessionUpdate = DbSessionUpdate; // Data allowed to be updated
