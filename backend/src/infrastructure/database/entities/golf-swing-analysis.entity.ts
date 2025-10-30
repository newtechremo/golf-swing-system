import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SubjectEntity } from './subject.entity';
import { GolfSwingResultEntity } from './golf-swing-result.entity';
import { GolfSwingAngleEntity } from './golf-swing-angle.entity';
import { SwingTypeEntity } from './swing-type.entity';

/**
 * GolfSwingAnalysisEntity - 골프 스윙 분석 정보
 * 대상자(Subject)의 골프 스윙 분석 결과를 저장합니다.
 */
@Entity('golf_swing_analyses')
export class GolfSwingAnalysisEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'subject_id' })
  subjectId: number; // 분석 대상자 ID

  @Index()
  @Column({ name: 'user_id' })
  userId: number; // 담당 강사 ID

  @Index()
  @Column({ type: 'varchar', length: 100, unique: true })
  uuid: string;

  // 기본 정보
  @Index()
  @Column({ name: 'analysis_date', type: 'date' })
  analysisDate: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  height: string;

  @Column({ name: 'video_url', type: 'varchar', length: 500, nullable: true })
  videoUrl: string;

  @Column({ name: 'video_s3_key', type: 'varchar', length: 500, nullable: true })
  videoS3Key: string;

  // 분석 상태
  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ name: 'wait_time', type: 'int', nullable: true })
  waitTime: number;

  @Column({ name: 'credit_used', type: 'int', nullable: true })
  creditUsed: number;

  // 메모
  @Column({ type: 'text', nullable: true })
  memo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SubjectEntity, (subject) => subject.golfSwingAnalyses)
  @JoinColumn({ name: 'subject_id' })
  subject: SubjectEntity; // 분석 대상자

  @ManyToOne(() => UserEntity, (user) => user.golfSwingAnalyses)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity; // 담당 강사

  @OneToOne(() => GolfSwingResultEntity, (result) => result.analysis, {
    cascade: true,
  })
  result: GolfSwingResultEntity;

  @OneToOne(() => GolfSwingAngleEntity, (angle) => angle.analysis, {
    cascade: true,
  })
  angle: GolfSwingAngleEntity;

  @OneToOne(() => SwingTypeEntity, (swingType) => swingType.analysis, {
    cascade: true,
  })
  swingType: SwingTypeEntity;
}
