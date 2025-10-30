import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AdminEntity } from './admin.entity';
import { NoticeReadEntity } from './notice-read.entity';

@Entity('notices')
export class NoticeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'author_id' })
  authorId: number;

  @Column({
    type: 'enum',
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  })
  priority: 'low' | 'normal' | 'high';

  @Index()
  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status: 'draft' | 'published' | 'archived';

  @Index()
  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => AdminEntity, (admin) => admin.notices)
  @JoinColumn({ name: 'author_id' })
  author: AdminEntity;

  @OneToMany(() => NoticeReadEntity, (noticeRead) => noticeRead.notice)
  reads: NoticeReadEntity[];
}
