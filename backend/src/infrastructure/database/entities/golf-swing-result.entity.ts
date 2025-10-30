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

@Entity('golf_swing_results')
export class GolfSwingResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'analysis_id', unique: true })
  analysisId: number;

  // Address Phase (어드레스 자세)
  @Column({ name: 'address_frame', type: 'int', nullable: true })
  addressFrame: number;

  @Column({ name: 'address_stance', type: 'decimal', precision: 10, scale: 3, nullable: true })
  addressStance: number;

  @Column({ name: 'address_upper_body_tilt', type: 'decimal', precision: 10, scale: 3, nullable: true })
  addressUpperBodyTilt: number;

  @Column({ name: 'address_shoulder_tilt', type: 'decimal', precision: 10, scale: 3, nullable: true })
  addressShoulderTilt: number;

  @Column({ name: 'address_head_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  addressHeadLocation: number;

  // Takeback Phase (테이크백)
  @Column({ name: 'takeback_frame', type: 'int', nullable: true })
  takebackFrame: number;

  @Column({ name: 'takeback_left_shoulder_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  takebackLeftShoulderRotation: number;

  @Column({ name: 'takeback_right_hip_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  takebackRightHipRotation: number;

  @Column({ name: 'takeback_left_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  takebackLeftArmFlexion: number;

  @Column({ name: 'takeback_right_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  takebackRightArmFlexion: number;

  // Backswing Phase (백스윙)
  @Column({ name: 'backswing_frame', type: 'int', nullable: true })
  backswingFrame: number;

  @Column({ name: 'backswing_head_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingHeadLocation: number;

  @Column({ name: 'backswing_left_shoulder_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingLeftShoulderRotation: number;

  @Column({ name: 'backswing_left_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingLeftArmFlexion: number;

  // Backswing Top (백스윙 탑)
  @Column({ name: 'backswing_top_frame', type: 'int', nullable: true })
  backswingTopFrame: number;

  @Column({ name: 'backswing_top_reverse_spine', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopReverseSpine: number;

  @Column({ name: 'backswing_top_right_hip_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopRightHipRotation: number;

  @Column({ name: 'backswing_top_right_leg_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopRightLegFlexion: number;

  @Column({ name: 'backswing_top_center_of_gravity', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopCenterOfGravity: number;

  // Downswing Phase (다운스윙)
  @Column({ name: 'downswing_frame', type: 'int', nullable: true })
  downswingFrame: number;

  @Column({ name: 'downswing_left_shoulder_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  downswingLeftShoulderRotation: number;

  @Column({ name: 'downswing_right_hip_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  downswingRightHipRotation: number;

  @Column({ name: 'downswing_left_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  downswingLeftArmFlexion: number;

  // Impact (임팩트)
  @Column({ name: 'impact_frame', type: 'int', nullable: true })
  impactFrame: number;

  @Column({ name: 'impact_head_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactHeadLocation: number;

  @Column({ name: 'impact_left_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactLeftArmFlexion: number;

  @Column({ name: 'impact_hip_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactHipRotation: number;

  // Follow-through (팔로우스루)
  @Column({ name: 'followthrough_frame', type: 'int', nullable: true })
  followthroughFrame: number;

  @Column({ name: 'followthrough_hip_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  followthroughHipRotation: number;

  @Column({ name: 'followthrough_shoulder_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  followthroughShoulderRotation: number;

  // Finish (피니시)
  @Column({ name: 'finish_frame', type: 'int', nullable: true })
  finishFrame: number;

  @Column({ name: 'finish_center_of_gravity', type: 'decimal', precision: 10, scale: 3, nullable: true })
  finishCenterOfGravity: number;

  @Column({ name: 'finish_upper_body_tilt', type: 'decimal', precision: 10, scale: 3, nullable: true })
  finishUpperBodyTilt: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => GolfSwingAnalysisEntity, (analysis) => analysis.result, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis: GolfSwingAnalysisEntity;
}
