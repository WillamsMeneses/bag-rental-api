import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  // EXPLÍCITO: tipo PostgreSQL y nullable
  @Column({
    type: 'varchar',
    nullable: true,
    length: 255, // Para passwords hasheadas
  })
  password!: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 255,
  })
  providerId!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  emailVerified!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_account_id',
  })
  stripeAccountId!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'first_name',
  })
  firstName!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'last_name',
  })
  lastName!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  birthday!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phone!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  country!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'avatar_url',
  })
  avatarUrl!: string | null;
}
