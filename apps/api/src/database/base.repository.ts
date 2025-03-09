import { DatabaseService } from '@/database/database.service';

/**
 * Abstract base class for all database repositories.
 * Provides access to the database service.
 */
export abstract class BaseRepository extends DatabaseService {}
