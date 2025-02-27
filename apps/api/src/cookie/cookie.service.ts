import { parseDuration } from '@/utils/parse-duration';
import { Injectable } from '@nestjs/common';
import { getRequiredEnvVar } from '@repo/env-validation';
import { AuthTokens } from '@repo/types';
import * as crypto from 'crypto';
import { CookieOptions, Request, Response } from 'express';

/**
 * Type for supported cookie token names
 */
export type TokenCookieName =
  | 'accessToken'
  | 'refreshToken'
  | 'deviceId'
  | 'csrf'
  | '__Host-csrf';

/**
 * Type for cookie contents based on token name
 */
export interface CookieContents {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  csrf: string;
  '__Host-csrf': string;
}

/**
 * Type for requests with cookies
 */
export type RequestWithCookies = Request & {
  cookies: Partial<CookieContents>;
};

@Injectable()
export class CookieService {
  /**
   * Checks if environment is production
   */
  get isProd(): boolean {
    return getRequiredEnvVar('NODE_ENV') === 'production';
  }

  /**
   * Checks if environment is development
   */
  get isDev(): boolean {
    return getRequiredEnvVar('NODE_ENV') === 'development';
  }

  /**
   * Generates a random device ID
   */
  generateDeviceId(): string {
    return crypto.randomUUID();
  }

  /**
   * Gets common cookie options for current environment
   */
  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? ('none' as const) : ('lax' as const),
    };
  }

  /**
   * Sets device ID cookie
   * @param res Express response
   * @param deviceId Device ID to set
   */
  setDeviceIdCookie(res: Response, deviceId: string): void {
    const options: CookieOptions = {
      ...this.getCookieOptions(),
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    };
    res.cookie('deviceId', deviceId, options);
  }

  /**
   * Gets existing device ID or creates new one
   * @param req Express request
   * @param res Express response
   */
  getOrCreateDeviceId(req: Request, res: Response): string {
    if (!req.cookies['deviceId']) {
      const deviceId = this.generateDeviceId();
      this.setDeviceIdCookie(res, deviceId);
      return deviceId;
    }
    return req.cookies['deviceId'] as string;
  }

  /**
   * Sets auth token cookies
   * @param res Express response
   * @param tokens Auth tokens to set
   */
  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const [accessToken, refreshToken] = tokens;

    // Set access token cookie
    const accessTokenOptions: CookieOptions = {
      ...this.getCookieOptions(),
      maxAge: parseDuration(getRequiredEnvVar('JWT_EXPIRES_IN')),
    };
    res.cookie('accessToken', accessToken, accessTokenOptions);

    // Set refresh token cookie
    const refreshTokenOptions: CookieOptions = {
      ...this.getCookieOptions(),
      maxAge: parseDuration(getRequiredEnvVar('REFRESH_TOKEN_EXPIRES_IN')),
      path: '/auth/refresh', // Restrict to only the refresh endpoint
    };
    res.cookie('refreshToken', refreshToken, refreshTokenOptions);
  }

  /**
   * Clears all auth cookies
   * @param res Express response
   */
  clearAuthCookies(res: Response): void {
    const options: CookieOptions = this.getCookieOptions();

    // Clear all cookies with environment-appropriate settings
    res.clearCookie('deviceId', options);
    res.clearCookie(this.isDev ? 'csrf' : '__Host-csrf', options);
    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);
  }

  /**
   * Extracts typed token from cookies
   * @param req Request with cookies
   * @param tokenName Cookie name to extract
   */
  extractTokenFromCookie<T extends TokenCookieName>(
    req: RequestWithCookies,
    tokenName: T,
  ): CookieContents[T] | null {
    if (req && req.cookies) {
      return req.cookies[tokenName] ?? null;
    }
    return null;
  }
}
