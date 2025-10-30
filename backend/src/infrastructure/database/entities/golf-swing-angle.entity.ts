import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { GolfSwingAnalysisEntity } from './golf-swing-analysis.entity';

@Entity('golf_swing_angles')
export class GolfSwingAngleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'analysis_id', unique: true })
  analysisId: number;

  // 각도 데이터는 JSON으로 저장 (프레임별 x, y, z 축 데이터)
  // [[x, y, z], [x, y, z], ...] 형태
  @Column({ name: 'knee_line_data', type: 'json', nullable: true })
  kneeLineData: number[][];

  @Column({ name: 'pelvis_data', type: 'json', nullable: true })
  pelvisData: number[][];

  @Column({ name: 'shoulder_line_data', type: 'json', nullable: true })
  shoulderLineData: number[][];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => GolfSwingAnalysisEntity, (analysis) => analysis.angle, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis: GolfSwingAnalysisEntity;
}
