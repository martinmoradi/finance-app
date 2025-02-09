import { Controller, Get, Param } from '@nestjs/common';
import { User } from '@repo/types';
import { UsersRepository } from '@/users/users.repository';

@Controller('users')
export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

  @Get()
  async findAll(): Promise<User[] | null> {
    return await this.usersRepository.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<User | null> {
    return await this.usersRepository.findById(id);
  }
}
