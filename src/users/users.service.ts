import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthProvider, User } from './entities/user.entity';
import { StripeService } from 'src/stripe/stripe.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(
    email: string,
    password: string,
    authProvider: AuthProvider = AuthProvider.LOCAL,
  ): Promise<User> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // CORRECCIÓN: Usar null en lugar de undefined
    const hashedPassword: string | null = password
      ? await bcrypt.hash(password, 10)
      : null;

    const user = this.userRepository.create({
      email,
      password: hashedPassword, // ← SOLO null o string, NUNCA undefined
      authProvider,
    });

    return this.userRepository.save(user);
  }

  validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async findOrCreateOAuthUser(
    email: string,
    providerId: string,
    authProvider: AuthProvider,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { email, authProvider },
    });

    if (!user) {
      user = this.userRepository.create({
        email,
        providerId, // ← string o null, no undefined
        authProvider,
        emailVerified: true,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  async getStripeOnboardingLink(userId: string): Promise<{ url: string }> {
    const user = await this.findById(userId);

    // Si no tiene cuenta Stripe, crearla
    if (!user.stripeAccountId) {
      const account = await this.stripeService.createConnectAccount(user.email);
      user.stripeAccountId = account.id;
      await this.userRepository.save(user);
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    const accountLink = await this.stripeService.createAccountLink(
      user.stripeAccountId,
      `${frontendUrl}/stripe/refresh`, // si algo falla, vuelve acá
      `${frontendUrl}/stripe/return`, // cuando termina el onboarding
    );

    return { url: accountLink.url };
  }

  async getStripeStatus(
    userId: string,
  ): Promise<{ isConnected: boolean; stripeAccountId: string | null }> {
    const user = await this.findById(userId);
    return {
      isConnected: !!user.stripeAccountId,
      stripeAccountId: user.stripeAccountId,
    };
  }
}
