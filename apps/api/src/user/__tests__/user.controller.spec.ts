import { LoggerModule } from '@/logger/logger.module';
import { UserController } from '@/user/user.controller';
import { UserRepository } from '@/user/user.repository';
import { UserService } from '@/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { DoubleCsrfUtilities } from 'csrf-csrf';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockUserService = {
      findByEmail: jest.fn(),
    };

    const mockCsrfProvider = {} as DoubleCsrfUtilities;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forFeature('UserService'),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
      ],
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: 'CSRF_PROVIDER', useValue: mockCsrfProvider },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('checkUserExists', () => {
    it('should return true when user exists', async () => {
      const testEmail = 'existing@example.com';
      jest
        .spyOn(userService, 'findByEmail')
        .mockResolvedValue({ id: '1', email: testEmail } as any);

      const result = await controller.checkUserExists(testEmail);

      expect(userService.findByEmail).toHaveBeenCalledWith(testEmail);
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const testEmail = 'nonexistent@example.com';
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      const result = await controller.checkUserExists(testEmail);

      expect(userService.findByEmail).toHaveBeenCalledWith(testEmail);
      expect(result).toBe(false);
    });

    it('should return false when findByEmail throws an error', async () => {
      const testEmail = 'error@example.com';
      jest
        .spyOn(userService, 'findByEmail')
        .mockRejectedValue(new Error('Database error'));

      await expect(controller.checkUserExists(testEmail)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
