import { BaseRepository } from '@/database/base.repository';
import { Injectable } from '@nestjs/common';
import type { Schema } from '@repo/database';
import { InferSelectModel } from 'drizzle-orm';

@Injectable()
export class UsersRepository extends BaseRepository {
  async findAll(): Promise<InferSelectModel<Schema['users']>[]> {
    return await this.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
