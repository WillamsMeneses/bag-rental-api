import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BagListing } from './bag-listing.entity';
import { ClubWoodDetail } from './club-wood-detail.entity';
import { ClubHybridDetail } from './club-hybrid-detail.entity';
import { ClubIronDetail } from './club-iron-detail.entity';
import { ClubWedgeDetail } from './club-wedge-detail.entity';
import { ClubPutterDetail } from './club-putter-detail.entity';

export enum ClubCategory {
  DRIVER = 'driver',
  WOOD = 'wood',
  HYBRID_RESCUE = 'hybrid_rescue',
  IRON = 'iron',
  WEDGE = 'wedge',
  PUTTER = 'putter',
}

export enum ClubFlex {
  LADIES = 'ladies',
  SENIOR = 'senior',
  REGULAR = 'regular',
  STIFF = 'stiff',
  X_STIFF = 'x_stiff',
  XX_STIFF = 'xx_stiff',
}

export enum ShaftType {
  STEEL = 'steel',
  GRAPHITE = 'graphite',
}

@Entity('clubs')
export class Club {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'bag_listing_id' })
  bagListingId!: string;

  @ManyToOne(() => BagListing, (listing) => listing.clubs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bag_listing_id' })
  bagListing!: BagListing;

  @Column({ type: 'enum', enum: ClubCategory })
  category!: ClubCategory;

  @Column({ type: 'varchar', length: 100 })
  brand!: string;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ type: 'enum', enum: ClubFlex })
  flex!: ClubFlex;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  loft!: number;

  @Column({
    type: 'enum',
    enum: ShaftType,
    nullable: true,
    name: 'shaft_type',
  })
  shaftType!: ShaftType | null;

  @Column({ type: 'int', nullable: true, name: 'display_order' })
  displayOrder!: number | null;

  // Relations to detail tables
  @OneToOne(() => ClubWoodDetail, (detail) => detail.club, { cascade: true })
  woodDetail?: ClubWoodDetail;

  @OneToOne(() => ClubHybridDetail, (detail) => detail.club, { cascade: true })
  hybridDetail?: ClubHybridDetail;

  @OneToOne(() => ClubIronDetail, (detail) => detail.club, { cascade: true })
  ironDetail?: ClubIronDetail;

  @OneToOne(() => ClubWedgeDetail, (detail) => detail.club, { cascade: true })
  wedgeDetail?: ClubWedgeDetail;

  @OneToOne(() => ClubPutterDetail, (detail) => detail.club, { cascade: true })
  putterDetail?: ClubPutterDetail;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
