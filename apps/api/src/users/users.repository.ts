import { BaseRepository } from '@/database/base.repository';
import { Injectable } from '@nestjs/common';
import { queries } from '@repo/database';
import { User } from '@repo/types';

@Injectable()
export class UsersRepository extends BaseRepository {
  async findAll(): Promise<User[] | null> {
    const users = await this.db.query.users.findMany();
    return users?.length ? users : null;
  }
  async findById(id: string): Promise<User | null> {
    const user = await this.db.query.users.findFirst(queries.byId(id));
    return user ?? null;
  }
}
