import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Club } from './club.entity';

@Entity('club_wedge_details')
export class ClubWedgeDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @OneToOne(() => Club, (club) => club.wedgeDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar', length: 30, name: 'wedge_type' })
  wedgeType!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
