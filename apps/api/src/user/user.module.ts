import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';
import { LoggerModule } from '@/logger/logger.module';
import { UserController } from '@/user/user.controller';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { Module, forwardRef } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
/**
 * Module for managing user-related functionality.
 * Provides controllers and services for user operations.
 */
@Module({
  imports: [
    DatabaseModule,
    LoggerModule.forFeature('UserService'),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
