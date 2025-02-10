import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserService } from '@/user/user.service';
import { UserRepository } from '@/user/user.repository';

/**
 * Module for handling authentication-related functionality
 * Provides controllers and services for authentication operations
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, UserService, UserRepository],
})
export class AuthModule {}
