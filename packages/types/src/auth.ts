import { PublicUser } from '@/user';

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
