import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Club } from './club.entity';

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum HandType {
  LEFT_HANDED = 'left_handed',
  RIGHT_HANDED = 'right_handed',
}

@Entity('bag_listings')
export class BagListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Listing Details
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_day' })
  pricePerDay!: number;

  // User preferences
  @Column({ type: 'enum', enum: UserGender })
  gender!: UserGender;

  @Column({ type: 'enum', enum: HandType })
  hand!: HandType;

  // Location
  @Column({ type: 'varchar', length: 255, nullable: true })
  street!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'zip_code' })
  zipCode!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  // Photos (preparado para Cloudflare)
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  photos!: string[];

  // Status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_published' })
  isPublished!: boolean;

  // Relations
  @OneToMany(() => Club, (club) => club.bagListing, { cascade: true })
  clubs!: Club[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
