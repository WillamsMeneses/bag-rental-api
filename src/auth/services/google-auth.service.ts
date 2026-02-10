import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { AuthProvider } from 'src/users/entities/user.entity';

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
  ) {}

  async validateGoogleUser(googleUser: GoogleUser): Promise<{
    user: { id: string; email: string; authProvider: AuthProvider };
    accessToken: string;
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
      const accessToken = this.generateToken(
        existingUser.id,
        existingUser.email,
      );
      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          authProvider: existingUser.authProvider,
        },
        accessToken,
      };
    }

    // Crear nuevo usuario con Google
    const newUser = await this.usersService.findOrCreateOAuthUser(
      email,
      providerId,
      AuthProvider.GOOGLE,
    );

    const accessToken = this.generateToken(newUser.id, newUser.email);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        authProvider: newUser.authProvider,
      },
      accessToken,
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
