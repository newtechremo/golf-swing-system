import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';

@Entity('back_posture_results')
export class BackPostureResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'posture_analysis_id' })
  postureAnalysisId: number;

  // 측정 값 (degree)
  @Column({ name: 'head_balance_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  headBalanceValue: number;

  @Column({ name: 'head_balance_grade', type: 'int', nullable: true })
  headBalanceGrade: number;

  @Column({ name: 'pelvic_balance_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  pelvicBalanceValue: number;

  @Column({ name: 'pelvic_balance_grade', type: 'int', nullable: true })
  pelvicBalanceGrade: number;

  @Column({ name: 'shoulder_balance_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  shoulderBalanceValue: number;

  @Column({ name: 'shoulder_balance_grade', type: 'int', nullable: true })
  shoulderBalanceGrade: number;

  @Column({ name: 'knee_balance_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  kneeBalanceValue: number;

  @Column({ name: 'knee_balance_grade', type: 'int', nullable: true })
  kneeBalanceGrade: number;

  @Column({ name: 'body_tilt_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  bodyTiltValue: number;

  @Column({ name: 'body_tilt_grade', type: 'int', nullable: true })
  bodyTiltGrade: number;

  @Column({ name: 'left_leg_qangle_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  leftLegQAngleValue: number;

  @Column({ name: 'left_leg_qangle_grade', type: 'int', nullable: true })
  leftLegQAngleGrade: number;

  @Column({ name: 'right_leg_qangle_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  rightLegQAngleValue: number;

  @Column({ name: 'right_leg_qangle_grade', type: 'int', nullable: true })
  rightLegQAngleGrade: number;

  // 좌표 데이터 (JSON)
  @Column({ name: 'skeleton_coords', type: 'json', nullable: true })
  skeletonCoords: any;

  // 결과 이미지
  @Column({ name: 'result_image_url', type: 'varchar', length: 500, nullable: true })
  resultImageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => BodyPostureAnalysisEntity, (analysis) => analysis.backResult, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'posture_analysis_id' })
  postureAnalysis: BodyPostureAnalysisEntity;
}
