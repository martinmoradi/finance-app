import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { AccessTokenStrategy } from '@/auth/strategies/access-token.strategy';
import { CredentialsStrategy } from '@/auth/strategies/credentials.strategy';
import { RefreshTokenStrategy } from '@/auth/strategies/refresh-token.strategy';
import jwtConfig from '@/config/jwt.config';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshJwtConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    UserRepository,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    CredentialsStrategy,
  ],
})
export class AuthModule {}
