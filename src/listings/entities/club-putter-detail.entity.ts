import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Club } from './club.entity';

@Entity('club_putter_details')
export class ClubPutterDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId!: string;

  @OneToOne(() => Club, (club) => club.putterDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  // Ahora soporta múltiples tipos — e.g. ['blade', 'mallet']
  @Column({ type: 'text', array: true, name: 'putter_types', default: '{}' })
  putterTypes!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
