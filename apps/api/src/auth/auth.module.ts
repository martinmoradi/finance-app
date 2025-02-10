import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import jwtConfig from '@/config/jwt.config';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

/**
 * Module for handling authentication-related functionality.
 * Provides controllers and services for authentication operations.
 */
@Module({
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, UserRepository],
})
export class AuthModule {}
