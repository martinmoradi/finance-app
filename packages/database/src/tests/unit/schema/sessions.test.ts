import { DbSessionInsert, sessionQueries, sessions } from '@/schema/sessions';
import { and, eq, getTableName } from 'drizzle-orm';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('Database Schema', () => {
  describe('Session Table Schema', () => {
    // Test table definition
    it('should define the correct table name', () => {
      expect(getTableName(sessions)).toBe('sessions');
    });

    // Test column definitions
    describe('Columns', () => {
      it('should define userId column correctly', () => {
        const userIdColumn = sessions.userId;
        expect(userIdColumn.name).toBe('user_id');
        expect(userIdColumn.notNull).toBe(true);
        expect(userIdColumn.columnType).toBe('PgUUID');
      });

      it('should define deviceId column correctly', () => {
        const deviceIdColumn = sessions.deviceId;
        expect(deviceIdColumn.name).toBe('device_id');
        expect(deviceIdColumn.notNull).toBe(true);
        expect(deviceIdColumn.columnType).toBe('PgText');
      });

      it('should define token column correctly', () => {
        const tokenColumn = sessions.token;
        expect(tokenColumn.name).toBe('token');
        expect(tokenColumn.notNull).toBe(true);
        expect(tokenColumn.columnType).toBe('PgText');
      });

      it('should define timestamp columns with default values', () => {
        // Check lastUsedAt
        const lastUsedAtColumn = sessions.lastUsedAt;
        expect(lastUsedAtColumn.name).toBe('last_used_at');
        expect(lastUsedAtColumn.notNull).toBe(true);
        expect(lastUsedAtColumn.hasDefault).toBe(true);

        // Check expiresAt
        const expiresAtColumn = sessions.expiresAt;
        expect(expiresAtColumn.name).toBe('expires_at');
        expect(expiresAtColumn.notNull).toBe(true);
        expect(expiresAtColumn.hasDefault).toBe(false);

        // Check createdAt
        const createdAtColumn = sessions.createdAt;
        expect(createdAtColumn.name).toBe('created_at');
        expect(createdAtColumn.notNull).toBe(true);
        expect(createdAtColumn.hasDefault).toBe(true);
      });
    });

    // Test query builders
    describe('Query Builders', () => {
      describe('sessionQueries.byUserId', () => {
        it('should build correct WHERE clause for userId query', () => {
          const testUserId = '123e4567-e89b-12d3-a456-426614174000';
          const query = sessionQueries.byUserId(testUserId);

          expect(query.where).toBeDefined();
          expect(query.where).toEqual(eq(sessions.userId, testUserId));
        });
      });

      describe('sessionQueries.byUserIdAndDeviceId', () => {
        it('should build correct WHERE clause for userId and deviceId query', () => {
          const testUserId = '123e4567-e89b-12d3-a456-426614174000';
          const testDeviceId = 'device123';
          const query = sessionQueries.byUserIdAndDeviceId(
            testUserId,
            testDeviceId,
          );

          expect(query.where).toBeDefined();
          expect(query.where).toEqual(
            and(
              eq(sessions.userId, testUserId),
              eq(sessions.deviceId, testDeviceId),
            ),
          );
        });
      });
    });

    // Test type definitions
    describe('Type Definitions', () => {
      it('should define correct type structure for DbSessionInsert', () => {
        type ExpectedInsertType = {
          userId: string;
          deviceId: string;
          token: string;
          lastUsedAt?: Date;
          expiresAt: Date;
          createdAt?: Date;
        };

        expectTypeOf<ExpectedInsertType>().toEqualTypeOf<DbSessionInsert>();
      });
    });
  });
});
