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
import { InstructorEntity } from './instructor.entity';
import { GolfSwingAnalysisEntity } from './golf-swing-analysis.entity';
import { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';
import { NoticeReadEntity } from './notice-read.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'center_id', nullable: true })
  centerId: number;

  @Index()
  @Column({ name: 'instructor_id' })
  instructorId: number;

  @Index()
  @Column({ name: 'phone_number', type: 'varchar', length: 20, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: ['M', 'F', 'Other'],
    nullable: true,
  })
  gender: 'M' | 'F' | 'Other';

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'deleted';

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CenterEntity, (center) => center.users, { nullable: true })
  @JoinColumn({ name: 'center_id' })
  center: CenterEntity;

  @ManyToOne(() => InstructorEntity, (instructor) => instructor.members)
  @JoinColumn({ name: 'instructor_id' })
  instructor: InstructorEntity;

  @OneToMany(() => GolfSwingAnalysisEntity, (analysis) => analysis.user)
  golfSwingAnalyses: GolfSwingAnalysisEntity[];

  @OneToMany(() => BodyPostureAnalysisEntity, (analysis) => analysis.user)
  bodyPostureAnalyses: BodyPostureAnalysisEntity[];

  @OneToMany(() => NoticeReadEntity, (noticeRead) => noticeRead.user)
  noticeReads: NoticeReadEntity[];
}
