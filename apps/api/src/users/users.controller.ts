import { Controller, Get } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { InferSelectModel, Schema } from '@repo/database';

@Controller('users')
export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

  @Get()
  async findAll(): Promise<InferSelectModel<Schema['users']>[]> {
    return await this.usersRepository.findAll();
  }
}
