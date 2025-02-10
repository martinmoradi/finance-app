/**
 * Tests for the UserRepository class which handles database operations for users
 */

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRepository } from '../user.repository';
import { mockedUsers } from './mocked-users';

// Mock database instance with spies for all required methods
const mockDb = {
  query: {
    users: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

/**
 * Mock the BaseRepository class to return our mock database instance
 */
vi.mock('@/database/base.repository', () => {
  return {
    BaseRepository: class {
      protected get db() {
        return mockDb;
      }
    },
  };
});

describe('UserRepository', () => {
  let userRepository: UserRepository;

  /**
   * Before each test:
   * 1. Create a new NestJS testing module with UserRepository
   * 2. Get an instance of UserRepository
   * 3. Reset all mocks and setup default mock responses
   */
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);

    // Reset and setup mocks before each test
    vi.clearAllMocks();
    mockDb.query.users.findMany.mockResolvedValue(mockedUsers);
  });

  /**
   * Test suite for findAll() method
   */
  it('should find all users', async () => {
    const users = await userRepository.findAll();
    expect(users).toBeTruthy();
    expect(users?.[0]).toBeTruthy();
    expect(users![0]?.email).toBe('test@example.com');
    expect(users).toHaveLength(5);
  });

  /**
   * Test suite for findById() method - successful case
   */
  it('should find user by id', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(mockedUsers[0]);

    const user = await userRepository.findById('1');
    expect(user).toBeTruthy();
    expect(user?.id).toBe('1');
    expect(user?.email).toBe('test@example.com');
  });

  /**
   * Test suite for findById() method - user not found case
   */
  it('should return null when user not found', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const user = await userRepository.findById('999');
    expect(user).toBeNull();
  });

  /**
   * Test suite for findByEmail() method - successful case
   */
  it('should find user by email', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(mockedUsers[0]);

    const user = await userRepository.findByEmail('test@example.com');
    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@example.com');
  });

  /**
   * Test suite for findByEmail() method - user not found case
   */
  it('should return null when user not found by email', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const user = await userRepository.findByEmail('nonexistent@example.com');
    expect(user).toBeNull();
  });

  /**
   * Test suite for create() method - successful case
   */
  it('should create a new user', async () => {
    const newUser = {
      email: 'new@example.com',
      name: 'New User',
      password: 'hashedPassword',
    };

    mockDb.returning.mockResolvedValue([
      {
        ...newUser,
        id: '6',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const createdUser = await userRepository.create(newUser);
    expect(createdUser).toBeTruthy();
    expect(createdUser?.email).toBe(newUser.email);
    expect(createdUser?.name).toBe(newUser.name);
  });

  /**
   * Test suite for create() method - failure case
   */
  it('should return null when user creation fails', async () => {
    mockDb.returning.mockResolvedValue([]);

    const newUser = {
      email: 'new@example.com',
      name: 'New User',
      password: 'hashedPassword',
    };

    const createdUser = await userRepository.create(newUser);
    expect(createdUser).toBeNull();
  });
});
