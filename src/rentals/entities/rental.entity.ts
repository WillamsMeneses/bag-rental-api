import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BagListing } from '../../listings/entities/bag-listing.entity';

export enum RentalStatus {
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED_BY_RENTER = 'cancelled_by_renter',
  CANCELLED_BY_OWNER = 'cancelled_by_owner',
  EXPIRED = 'expired',
}

@Entity('rentals')
export class Rental {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Relations
  @Column({ type: 'uuid', name: 'listing_id' })
  listingId!: string;

  @ManyToOne(() => BagListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: BagListing;

  @Column({ type: 'uuid', name: 'renter_id' })
  renterId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'renter_id' })
  renter!: User;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  // Dates
  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  // Pricing
  @Column({ type: 'int', name: 'total_days' })
  totalDays!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_day' })
  pricePerDay!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount!: number;

  // Payment (preparado para futuro)
  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
    name: 'payment_status',
  })
  paymentStatus!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'payment_intent_id',
  })
  paymentIntentId!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'payment_method',
  })
  paymentMethod!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'paid_at' })
  paidAt!: Date | null;

  // Refund
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'refund_amount',
  })
  refundAmount!: number | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'refunded_at',
  })
  refundedAt!: Date | null;

  // Status
  @Column({
    type: 'enum',
    enum: RentalStatus,
    default: RentalStatus.PENDING_PAYMENT,
  })
  status!: RentalStatus;

  // Cancellation
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'cancelled_at',
  })
  cancelledAt!: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'cancelled_by' })
  cancelledBy!: string | null;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason!: string | null;

  // Expiration (para bloqueos temporales)
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'expires_at',
  })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
