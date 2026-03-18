import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { AuthProvider } from 'src/users/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

interface GoogleUser {
  providerId: string;
  email: string;
  name: string;
  accessToken: string;
}

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser): Promise<{
    user: { id: string; email: string; authProvider: AuthProvider };
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, providerId } = googleUser;

    // Verificar si existe un usuario con ese email
    const existingUser = await this.usersService.findByEmail(email);

    // Si existe y es LOCAL, no permitir login con Google
    if (existingUser && existingUser.authProvider === AuthProvider.LOCAL) {
      throw new ConflictException(
        'This email is already registered with password. Please login using your password.',
      );
    }

    // Si existe y es GOOGLE, actualizar si es necesario
    if (existingUser && existingUser.authProvider === AuthProvider.GOOGLE) {
      const accessToken = this.generateAccessToken(
        existingUser.id,
        existingUser.email,
      );
      const refreshToken = await this.generateRefreshToken(existingUser.id);
      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          authProvider: existingUser.authProvider,
        },
        accessToken,
        refreshToken,
      };
    }

    // Crear nuevo usuario con Google
    const newUser = await this.usersService.findOrCreateOAuthUser(
      email,
      providerId,
      AuthProvider.GOOGLE,
    );

    const accessToken = this.generateAccessToken(newUser.id, newUser.email);
    const refreshToken = await this.generateRefreshToken(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        authProvider: newUser.authProvider,
      },
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const payload = { sub: userId, type: 'refresh' };
    const token = this.jwtService.sign(payload, { expiresIn: '30d' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({ token, userId, expiresAt }),
    );

    return token;
  }
}
