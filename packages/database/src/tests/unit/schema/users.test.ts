import { DbUserInsert, userQueries, users } from '@/schema/users';
import { eq, getTableName } from 'drizzle-orm';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('Database Schema', () => {
  describe('User Table Schema', () => {
    // Test table definition
    it('should define the correct table name', () => {
      expect(getTableName(users)).toBe('users');
    });

    // Test column definitions
    describe('Columns', () => {
      it('should define id column correctly', () => {
        const idColumn = users.id;
        expect(idColumn.name).toBe('id');
        expect(idColumn.primary).toBe(true);
        expect(idColumn.columnType).toBe('PgUUID');
      });

      it('should define name column correctly', () => {
        const nameColumn = users.name;
        expect(nameColumn.name).toBe('name');
        expect(nameColumn.notNull).toBe(true);
        expect(nameColumn.columnType).toBe('PgText');
      });

      it('should define email column correctly', () => {
        const emailColumn = users.email;
        expect(emailColumn.name).toBe('email');
        expect(emailColumn.notNull).toBe(true);
        expect(emailColumn.isUnique).toBe(true);
        expect(emailColumn.columnType).toBe('PgText');
      });

      it('should define timestamp columns with default values', () => {
        // Check createdAt
        const createdAtColumn = users.createdAt;
        expect(createdAtColumn.name).toBe('created_at');
        expect(createdAtColumn.notNull).toBe(true);
        expect(createdAtColumn.hasDefault).toBe(true);

        // Check updatedAt
        const updatedAtColumn = users.updatedAt;
        expect(updatedAtColumn.name).toBe('updated_at');
        expect(updatedAtColumn.notNull).toBe(true);
        expect(updatedAtColumn.hasDefault).toBe(true);
      });

      // Test default values
      describe('Default values', () => {
        it('should have default UUID for id column', () => {
          const defaultValue = users.id.default;
          expect(defaultValue).toBeDefined();
        });

        it('should set current timestamp for created_at and updated_at', () => {
          expect(users.createdAt.default).toBeDefined();
          expect(users.updatedAt.default).toBeDefined();
        });
      });
    });

    // Test constraints
    describe('Constraints', () => {
      it('should have unique email constraint', () => {
        expect(users.email.isUnique).toBe(true);
      });
    });

    // Test query builders
    describe('Query Builders', () => {
      describe('userQueries.byId', () => {
        it('should build correct WHERE clause for ID query', () => {
          const testId = '123e4567-e89b-12d3-a456-426614174000';
          const query = userQueries.byId(testId);

          expect(query.where).toBeDefined();
          expect(query.where).toEqual(eq(users.id, testId));
        });
      });
    });

    // Test type definitions
    describe('Type Definitions', () => {
      it('should define correct type structure for DbUserInsert', () => {
        type ExpectedInsertType = {
          id?: string;
          name: string;
          email: string;
          password: string;
          createdAt?: Date;
          updatedAt?: Date;
        };

        expectTypeOf<ExpectedInsertType>().toEqualTypeOf<DbUserInsert>();
      });
    });
  });
});
