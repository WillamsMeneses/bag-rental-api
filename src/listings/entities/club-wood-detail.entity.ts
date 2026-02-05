import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Club } from './club.entity';

@Entity('club_wood_details')
export class ClubWoodDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @OneToOne(() => Club, (club) => club.woodDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar', length: 20, name: 'wood_type' })
  woodType!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
