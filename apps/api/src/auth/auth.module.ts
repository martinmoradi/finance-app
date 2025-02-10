import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { Module } from '@nestjs/common';

/**
 * Module for handling authentication-related functionality
 * Provides controllers and services for authentication operations
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, UserService, UserRepository],
})
export class AuthModule {}
