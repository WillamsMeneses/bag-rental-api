import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CheckEmailDto, RegisterDto, LoginDto } from './dto/auth.dto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
    refreshToken: string;
  }> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const user = await this.usersService.create(
      registerDto.email,
      registerDto.password,
    );

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto): Promise<{
    user: { id: string; email: string };
    accessToken: string;
    refreshToken: string;
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

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    };
  }

  async refresh(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Buscar el token en la DB
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token, isRevoked: false },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verificar expiración
    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepository.update(storedToken.id, {
        isRevoked: true,
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revocar el token usado — rotation strategy
    await this.refreshTokenRepository.update(storedToken.id, {
      isRevoked: true,
    });

    // Generar nuevos tokens
    const accessToken = this.generateAccessToken(
      storedToken.user.id,
      storedToken.user.email,
    );
    const refreshToken = await this.generateRefreshToken(storedToken.user.id);

    return { accessToken, refreshToken };
  }

  async logout(token: string): Promise<void> {
    // Revocar el refresh token al hacer logout
    await this.refreshTokenRepository.update(
      { token, isRevoked: false },
      { isRevoked: true },
    );
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private generateAccessToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
    // Expiration is set in JwtModule config (e.g. 15m)
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Refresh token is also a JWT but with longer expiration
    const payload = { sub: userId, type: 'refresh' };
    const token = this.jwtService.sign(payload, { expiresIn: '30d' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token,
        userId,
        expiresAt,
      }),
    );

    return token;
  }
}
