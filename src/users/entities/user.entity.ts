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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
