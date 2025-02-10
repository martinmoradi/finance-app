import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UserService } from '@/user/user.service';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthJwtPayload, AuthUser, UserProfile } from '@repo/types';
import { hash, verify } from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user if the email isn't already taken.
   * @throws ConflictException when email is already registered.
   */
  async signup(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;
    const existingUser = await this.userService.findByEmail(userData.email);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await hash(password);
    const user = await this.userService.create({
      ...userData,
      password: hashedPassword,
    });

    return user;
  }

  /**
   * Validates user credentials for local authentication strategy.
   * @throws UnauthorizedException for invalid credentials.
   */
  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<UserProfile> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await verify(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  async signin(user: AuthUser) {
    const tokens = await this.generateJwtTokens(user.id);
    return { ...user, ...tokens };
  }

  private async generateJwtTokens(userId: string) {
    const payload: AuthJwtPayload = { sub: userId };
    const [accessToken] = await Promise.all([
      this.jwtService.signAsync(payload),
    ]);
    return { accessToken };
  }
}
