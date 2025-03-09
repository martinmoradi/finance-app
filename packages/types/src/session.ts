import {
  DbSessionSelect,
  DbSessionInsert,
  DbSessionUpdate,
} from '@repo/database';

// Database types
export type DatabaseSession = DbSessionSelect;
export type NewSession = DbSessionInsert;
export type SessionUpdate = DbSessionUpdate;
