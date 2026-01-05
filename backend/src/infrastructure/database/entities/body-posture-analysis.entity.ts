import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
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
  @Column({ name: 'analysis_date', type: 'datetime' })
  analysisDate: Date;

  // 이미지 정보
  @Column({ name: 'front_image_url', type: 'varchar', length: 500, nullable: true })
  frontImageUrl: string;

  @Column({ name: 'front_image_s3_key', type: 'varchar', length: 500, nullable: true })
  frontImageS3Key: string;

  @Column({ name: 'left_side_image_url', type: 'varchar', length: 500, nullable: true })
  leftSideImageUrl: string;

  @Column({ name: 'left_side_image_s3_key', type: 'varchar', length: 500, nullable: true })
  leftSideImageS3Key: string;

  @Column({ name: 'right_side_image_url', type: 'varchar', length: 500, nullable: true })
  rightSideImageUrl: string;

  @Column({ name: 'right_side_image_s3_key', type: 'varchar', length: 500, nullable: true })
  rightSideImageS3Key: string;

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
    name: 'left_side_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  leftSideStatus: 'pending' | 'completed' | 'failed';

  @Column({
    name: 'right_side_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  rightSideStatus: 'pending' | 'completed' | 'failed';

  @Column({
    name: 'back_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  backStatus: 'pending' | 'completed' | 'failed';

  // REMO API 분석 결과 JSON (skeleton-v2 API는 결과를 즉시 반환)
  @Column({ name: 'front_uuid', type: 'text', nullable: true })
  frontUuid: string;

  @Column({ name: 'left_side_uuid', type: 'text', nullable: true })
  leftSideUuid: string;

  @Column({ name: 'right_side_uuid', type: 'text', nullable: true })
  rightSideUuid: string;

  @Column({ name: 'back_uuid', type: 'text', nullable: true })
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

  @OneToMany(() => SidePostureResultEntity, (result) => result.postureAnalysis, {
    cascade: true,
  })
  sideResults: SidePostureResultEntity[];

  @OneToOne(() => BackPostureResultEntity, (result) => result.postureAnalysis, {
    cascade: true,
  })
  backResult: BackPostureResultEntity;
}
