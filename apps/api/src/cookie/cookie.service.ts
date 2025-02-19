import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request, Response } from 'express';

@Injectable()
export class CookieService {
  generateDeviceId(): string {
    return crypto.randomUUID();
  }

  setDeviceIdCookie(res: Response, deviceId: string): void {
    res.cookie('deviceId', deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }

  clearAuthCookies(res: Response): void {
    // Clear deviceId
    res.clearCookie('deviceId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    // Clear CSRF
    const cookieKey =
      process.env.NODE_ENV === 'development' ? 'csrf' : '__Host-csrf';
    res.clearCookie(cookieKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
  }

  getOrCreateDeviceId(req: Request, res: Response): string {
    if (!req.cookies['deviceId']) {
      const deviceId = this.generateDeviceId();
      this.setDeviceIdCookie(res, deviceId);
      return deviceId;
    }
    return req.cookies['deviceId'];
  }
}
