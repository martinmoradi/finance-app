import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { AccessTokenStrategy } from '@/auth/strategies/access-token.strategy';
import { CredentialsStrategy } from '@/auth/strategies/credentials.strategy';
import { RefreshTokenStrategy } from '@/auth/strategies/refresh-token.strategy';
import { createCsrfProvider } from '@/config/csrf.config';
import jwtConfig from '@/config/jwt.config';
import refreshJwtConfig from '@/config/refresh-jwt.config';
import { DatabaseModule } from '@/database/database.module';
import { LoggerModule } from '@/logger/logger.module';
import { SessionModule } from '@/session/session.module';
import { UserModule } from '@/user/user.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshJwtConfig),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    SessionModule,
    UserModule,
    DatabaseModule,
    LoggerModule.forFeature('AuthService'),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    CredentialsStrategy,
    {
      provide: 'CSRF_PROVIDER',
      useFactory: createCsrfProvider,
    },
  ],
})
export class AuthModule {}
