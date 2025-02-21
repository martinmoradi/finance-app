import { parseDuration } from '@/utils/parse-duration';
import { Injectable } from '@nestjs/common';
import { getRequiredEnvVar } from '@repo/env-validation';
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
  // Environment checks (basic utilities)
  /**
   * Checks if the current environment is production.
   *
   * @returns True if the environment is production, false otherwise
   */
  get isProd(): boolean {
    return getRequiredEnvVar('NODE_ENV') === 'production';
  }

  /**
   * Checks if the current environment is development.
   *
   * @returns True if the environment is development, false otherwise
   */
  get isDev(): boolean {
    return getRequiredEnvVar('NODE_ENV') === 'development';
  }

  // Device ID operations
  /**
   * Generates a random device ID.
   *
   * @returns A random UUID
   */
  generateDeviceId(): string {
    return crypto.randomUUID();
  }

  /**
   * Gets the common cookie options based on environment
   * @returns Cookie options appropriate for the current environment
   */
  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? ('none' as const) : ('lax' as const),
    };
  }

  /**
   * Sets the device ID cookie.
   *
   * @param res - Express response object
   * @param deviceId - The device ID to set
   */
  setDeviceIdCookie(res: Response, deviceId: string): void {
    const options: CookieOptions = {
      ...this.getCookieOptions(),
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    };
    res.cookie('deviceId', deviceId, options);
  }

  /**
   * Get or create a device ID cookie.
   * If the device ID cookie is not present, generate a new one and set it in the response.
   * Otherwise, return the existing device ID from the cookie.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns The device ID
   */
  getOrCreateDeviceId(req: Request, res: Response): string {
    if (!req.cookies['deviceId']) {
      const deviceId = this.generateDeviceId();
      this.setDeviceIdCookie(res, deviceId);
      return deviceId;
    }
    return req.cookies['deviceId'] as string;
  }

  // Authentication cookie operations
  /**
   * Sets the access and refresh token cookies.
   *
   * @param res - Express response object
   * @param accessToken - The access token to set
   * @param refreshToken - The refresh token to set
   */
  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
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
   * Clears all authentication-related cookies.
   * Removes deviceId, CSRF token, access token, and refresh token.
   *
   * @param res - Express response object
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
   * Extracts a token from cookies by name with type safety
   * @param req - Express request object with cookies
   * @param tokenName - Name of the cookie to extract
   * @returns The strongly typed token string or null if not found
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
