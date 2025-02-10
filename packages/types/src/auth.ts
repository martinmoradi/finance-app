import { UserProfile } from '@/user';

type TokenPayload = {
  accessToken: string;
  refreshToken: string;
};

export type AuthJwtPayload = {
  sub: string;
};

export type AuthUser = UserProfile & TokenPayload;
