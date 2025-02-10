import { DatabaseService } from '@/database/database.service';
import { Module } from '@nestjs/common';
import { UserController } from '@/user/user.controller';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';

/**
 * Module for managing user-related functionality
 * Provides controllers and services for user operations
 */
@Module({
  controllers: [UserController],
  providers: [UserRepository, UserService, DatabaseService],
})
export class UserModule {}
