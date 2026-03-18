import { Injectable, ConflictException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { AuthProvider } from 'src/users/entities/user.entity';
import { AuthService } from '../auth.service';

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
    private readonly authService: AuthService,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser): Promise<{
    user: { id: string; email: string; authProvider: AuthProvider };
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, providerId } = googleUser;

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser && existingUser.authProvider === AuthProvider.LOCAL) {
      throw new ConflictException(
        'This email is already registered with password. Please login using your password.',
      );
    }

    if (existingUser && existingUser.authProvider === AuthProvider.GOOGLE) {
      const accessToken = this.authService.generateAccessToken(
        existingUser.id,
        existingUser.email,
      );
      const refreshToken = await this.authService.generateRefreshToken(
        existingUser.id,
      );
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

    const newUser = await this.usersService.findOrCreateOAuthUser(
      email,
      providerId,
      AuthProvider.GOOGLE,
    );

    const accessToken = this.authService.generateAccessToken(
      newUser.id,
      newUser.email,
    );
    const refreshToken = await this.authService.generateRefreshToken(
      newUser.id,
    );

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
}
