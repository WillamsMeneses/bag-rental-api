import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthProvider, User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    const hashedPassword: string | null = password
      ? await bcrypt.hash(password, 10)
      : null;

    const user = this.userRepository.create({
      email,
      password: hashedPassword ?? undefined,
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
        providerId: providerId ?? undefined,
        authProvider,
        emailVerified: true,
      });
      await this.userRepository.save(user);
    }

    return user;
  }
}
