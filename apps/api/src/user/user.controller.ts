import { UserRepository } from '@/user/user.repository';
import { Controller, Get, Param } from '@nestjs/common';
import { DatabaseUser } from '@repo/types';

@Controller('user')
export class UserController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get()
  async findAll(): Promise<DatabaseUser[] | null> {
    return await this.userRepository.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<DatabaseUser | null> {
    return await this.userRepository.findById(id);
  }
}
