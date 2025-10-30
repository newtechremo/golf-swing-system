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
import { CenterEntity } from './center.entity';
import { NoticeEntity } from './notice.entity';

@Entity('admins')
export class AdminEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['super_admin', 'center_admin'],
    default: 'center_admin',
  })
  role: 'super_admin' | 'center_admin';

  @Column({ name: 'center_id', nullable: true })
  centerId: number;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CenterEntity, (center) => center.admins, {
    nullable: true,
  })
  @JoinColumn({ name: 'center_id' })
  center: CenterEntity;

  @OneToMany(() => NoticeEntity, (notice) => notice.author)
  notices: NoticeEntity[];
}
