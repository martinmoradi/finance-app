import { PublicUser } from '@/user';

export type AuthTokens = [accessToken: string, refreshToken: string];

export type SigninCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = {
  name: string;
  email: string;
  password: string;
};

export type JwtPayload = {
  sub: string;
  jti?: string;
};

export type AuthenticatedUser = PublicUser & AuthTokens;

export type CsrfTokenResponse = {
  token: string;
};

export interface SessionData {
  user: PublicUser | null;
  isAuthenticated: boolean;
  expiresSoon?: boolean;
  expiresAt?: number;
  refreshToken: string;
}

export type SessionCookie =
  | {
      isAuthenticated: true;
      user: PublicUser;
      isExpired: boolean;
      expiresSoon: boolean;
      refreshToken: string;
    }
  | {
      isAuthenticated: false;
    };
