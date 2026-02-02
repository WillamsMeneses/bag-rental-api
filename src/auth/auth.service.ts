import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CheckEmailDto, RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async checkEmail(
    checkEmailDto: CheckEmailDto,
  ): Promise<{ exists: boolean; email: string }> {
    const user = await this.usersService.findByEmail(checkEmailDto.email);
    return {
      exists: !!user,
      email: checkEmailDto.email,
    };
  }

  async register(registerDto: RegisterDto): Promise<{
    user: { id: string; email: string };
    accessToken: string;
  }> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const user = await this.usersService.create(
      registerDto.email,
      registerDto.password,
    );

    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<{
    user: { id: string; email: string };
    accessToken: string;
  }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please use social login');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
