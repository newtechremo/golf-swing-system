import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { NoticeEntity } from './notice.entity';
import { UserEntity } from './user.entity';

@Entity('notice_reads')
@Unique(['noticeId', 'userId'])
export class NoticeReadEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'notice_id' })
  noticeId: number;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'read_at' })
  readAt: Date;

  // Relations
  @ManyToOne(() => NoticeEntity, (notice) => notice.reads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notice_id' })
  notice: NoticeEntity;

  @ManyToOne(() => UserEntity, (user) => user.noticeReads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
