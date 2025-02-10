import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local authentication guard for Passport.
 * Validates user credentials against the local strategy.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
