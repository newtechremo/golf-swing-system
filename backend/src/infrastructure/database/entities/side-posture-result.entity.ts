import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';

@Entity('side_posture_results')
export class SidePostureResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'posture_analysis_id' })
  postureAnalysisId: number;

  // 좌측/우측 구분
  @Column({ name: 'side_type', type: 'enum', enum: ['left', 'right'], default: 'left' })
  sideType: 'left' | 'right';

  // 측정 값 (degree)
  @Column({ name: 'round_shoulder_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  roundShoulderValue: number;

  @Column({ name: 'round_shoulder_grade', type: 'int', nullable: true })
  roundShoulderGrade: number;

  @Column({ name: 'turtle_neck_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  turtleNeckValue: number;

  @Column({ name: 'turtle_neck_grade', type: 'int', nullable: true })
  turtleNeckGrade: number;

  @Column({ name: 'head_tilt_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  headTiltValue: number;

  @Column({ name: 'head_tilt_grade', type: 'int', nullable: true })
  headTiltGrade: number;

  @Column({ name: 'body_tilt_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  bodyTiltValue: number;

  @Column({ name: 'body_tilt_grade', type: 'int', nullable: true })
  bodyTiltGrade: number;

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
  @ManyToOne(() => BodyPostureAnalysisEntity, (analysis) => analysis.sideResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'posture_analysis_id' })
  postureAnalysis: BodyPostureAnalysisEntity;
}
