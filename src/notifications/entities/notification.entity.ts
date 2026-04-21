// src/notifications/entities/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Rental } from '../../rentals/entities/rental.entity';

export enum NotificationType {
  RENTAL_CONFIRMED = 'rental_confirmed',
  RENTAL_CANCELLED_BY_RENTER = 'rental_cancelled_by_renter',
  RENTAL_CANCELLED_BY_OWNER = 'rental_cancelled_by_owner',
  RENTAL_STARTED = 'rental_started',
  RENTAL_COMPLETED = 'rental_completed',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'rental_id', nullable: true })
  rentalId!: string | null;

  @ManyToOne(() => Rental, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'rental_id' })
  rental!: Rental;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
