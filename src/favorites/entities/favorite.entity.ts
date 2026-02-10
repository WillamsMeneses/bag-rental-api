import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BagListing } from '../../listings/entities/bag-listing.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId!: string;

  @ManyToOne(() => BagListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: BagListing;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
