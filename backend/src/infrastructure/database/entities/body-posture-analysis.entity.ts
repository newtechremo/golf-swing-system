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
import { FrontPostureResultEntity } from './front-posture-result.entity';
import { SidePostureResultEntity } from './side-posture-result.entity';
import { BackPostureResultEntity } from './back-posture-result.entity';

/**
 * BodyPostureAnalysisEntity - 신체 자세 분석 정보
 * 대상자(Subject)의 신체 자세 분석 결과를 저장합니다.
 */
@Entity('body_posture_analyses')
export class BodyPostureAnalysisEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'subject_id' })
  subjectId: number; // 분석 대상자 ID

  @Index()
  @Column({ name: 'user_id' })
  userId: number; // 담당 강사 ID

  // 기본 정보
  @Index()
  @Column({ name: 'analysis_date', type: 'date' })
  analysisDate: Date;

  // 이미지 정보
  @Column({ name: 'front_image_url', type: 'varchar', length: 500, nullable: true })
  frontImageUrl: string;

  @Column({ name: 'front_image_s3_key', type: 'varchar', length: 500, nullable: true })
  frontImageS3Key: string;

  @Column({ name: 'side_image_url', type: 'varchar', length: 500, nullable: true })
  sideImageUrl: string;

  @Column({ name: 'side_image_s3_key', type: 'varchar', length: 500, nullable: true })
  sideImageS3Key: string;

  @Column({ name: 'back_image_url', type: 'varchar', length: 500, nullable: true })
  backImageUrl: string;

  @Column({ name: 'back_image_s3_key', type: 'varchar', length: 500, nullable: true })
  backImageS3Key: string;

  // 분석 상태
  @Column({
    name: 'front_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  frontStatus: 'pending' | 'completed' | 'failed';

  @Column({
    name: 'side_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  sideStatus: 'pending' | 'completed' | 'failed';

  @Column({
    name: 'back_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  backStatus: 'pending' | 'completed' | 'failed';

  // REMO API UUIDs
  @Column({ name: 'front_uuid', type: 'varchar', length: 100, nullable: true })
  frontUuid: string;

  @Column({ name: 'side_uuid', type: 'varchar', length: 100, nullable: true })
  sideUuid: string;

  @Column({ name: 'back_uuid', type: 'varchar', length: 100, nullable: true })
  backUuid: string;

  // 메모
  @Column({ type: 'text', nullable: true })
  memo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => SubjectEntity, (subject) => subject.bodyPostureAnalyses)
  @JoinColumn({ name: 'subject_id' })
  subject: SubjectEntity; // 분석 대상자

  @ManyToOne(() => UserEntity, (user) => user.bodyPostureAnalyses)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity; // 담당 강사

  @OneToOne(() => FrontPostureResultEntity, (result) => result.postureAnalysis, {
    cascade: true,
  })
  frontResult: FrontPostureResultEntity;

  @OneToOne(() => SidePostureResultEntity, (result) => result.postureAnalysis, {
    cascade: true,
  })
  sideResult: SidePostureResultEntity;

  @OneToOne(() => BackPostureResultEntity, (result) => result.postureAnalysis, {
    cascade: true,
  })
  backResult: BackPostureResultEntity;
}
