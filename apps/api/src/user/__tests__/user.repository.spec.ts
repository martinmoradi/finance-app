import { userFixtures } from '@/user/__tests__/user.fixtures';
import { UserRepository } from '@/user/user.repository';
import { Test } from '@nestjs/testing';

const mockDb = {
  query: {
    users: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  delete: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/database/base.repository', () => {
  return {
    BaseRepository: class {
      protected get db(): typeof mockDb {
        return mockDb;
      }
    },
  };
});

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);

    // Reset and setup mocks before each test
    jest.clearAllMocks();
    mockDb.query.users.findMany.mockResolvedValue(userFixtures);
    mockDb.query.users.findFirst.mockResolvedValue(userFixtures[0]);
  });

  it('should find all users', async () => {
    const users = await userRepository.findAll();
    expect(users).toBeTruthy();
    expect(users?.[0]).toBeTruthy();
  });

  it('should find user by id', async () => {
    const user = await userRepository.findById('1');
    expect(user).toBeTruthy();
    expect(user?.id).toBe('1');
  });

  it('should return null when user not found', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const user = await userRepository.findById('999');
    expect(user).toBeNull();
  });

  it('should find user by email', async () => {
    const user = await userRepository.findByEmail('test@example.com');
    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@example.com');
  });

  it('should return null when user not found by email', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const user = await userRepository.findByEmail('nonexistent@example.com');
    expect(user).toBeNull();
  });

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

  it('should return null when user creation fails', async () => {
    mockDb.returning.mockResolvedValue([]);

    const createdUser = await userRepository.create({
      email: 'new@example.com',
      name: 'New User',
      password: 'hashedPassword',
    });
    expect(createdUser).toBeNull();
  });

  it('should delete a user', async () => {
    const userId = '1';
    mockDb.where.mockResolvedValue({ rowCount: 1 });

    await userRepository.delete(userId);

    // Assert
    expect(mockDb.delete).toHaveBeenCalledWith(expect.anything()); // Verifies delete was called
    expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // Verifies where clause was used
  });

  it('should handle non-existent user deletion gracefully', async () => {
    // Arrange
    const userId = 'nonexistent';
    mockDb.where.mockResolvedValue({ rowCount: 0 });

    // Act
    await userRepository.delete(userId);

    // Assert
    expect(mockDb.delete).toHaveBeenCalledWith(expect.anything());
    expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
  });
});
