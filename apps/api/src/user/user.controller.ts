import { UserRepository } from '@/user/user.repository';
import { Controller, Get, Param } from '@nestjs/common';
import { User } from '@repo/types';

@Controller('user')
export class UserController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get()
  async findAll(): Promise<User[] | null> {
    return await this.userRepository.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }
}
