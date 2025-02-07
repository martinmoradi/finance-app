import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { DatabaseService } from '@/database/database.service';
import { ConfigModule } from '@nestjs/config';

describe('UsersController', () => {
  let controller: UsersController;
  let repository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [UsersController],
      providers: [
        UsersRepository,
        {
          provide: DatabaseService,
          useValue: {
            db: {
              query: {
                users: {
                  findMany: jest.fn().mockResolvedValue([]),
                  findFirst: jest.fn().mockResolvedValue(null),
                },
              },
            },
            onModuleInit: jest.fn(),
            onModuleDestroy: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return an array of users', async () => {
    const mockUsers = [
      {
        id: '1', // string instead of number
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    jest.spyOn(repository, 'findAll').mockResolvedValue(mockUsers);

    const result = await controller.findAll();
    expect(result).toEqual(mockUsers);
  });
});
