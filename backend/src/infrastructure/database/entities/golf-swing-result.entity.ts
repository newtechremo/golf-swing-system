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

  // ========================================
  // Address Phase (어드레스 자세)
  // ========================================
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

  @Column({ name: 'address_left_foot_fix', type: 'decimal', precision: 10, scale: 3, nullable: true })
  addressLeftFootFix: number;

  // ========================================
  // Takeback Phase (테이크백)
  // ========================================
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

  // ========================================
  // Backswing Phase (백스윙)
  // ========================================
  @Column({ name: 'backswing_frame', type: 'int', nullable: true })
  backswingFrame: number;

  @Column({ name: 'backswing_head_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingHeadLocation: number;

  @Column({ name: 'backswing_left_shoulder_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingLeftShoulderRotation: number;

  @Column({ name: 'backswing_left_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingLeftArmFlexion: number;

  // ========================================
  // Backswing Top Phase (백스윙 탑)
  // ========================================
  @Column({ name: 'backswing_top_frame', type: 'int', nullable: true })
  backswingTopFrame: number;

  @Column({ name: 'backswing_top_reverse_spine', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopReverseSpine: number;

  @Column({ name: 'backswing_top_right_hip_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopRightHipRotation: number;

  @Column({ name: 'backswing_top_right_leg_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopRightLegFlexion: number;

  @Column({ name: 'backswing_top_head_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopHeadLocation: number;

  @Column({ name: 'backswing_top_center_of_gravity', type: 'decimal', precision: 10, scale: 3, nullable: true })
  backswingTopCenterOfGravity: number;

  // ========================================
  // Downswing Phase (다운스윙)
  // ========================================
  @Column({ name: 'downswing_frame', type: 'int', nullable: true })
  downswingFrame: number;

  @Column({ name: 'downswing_center_of_gravity', type: 'decimal', precision: 10, scale: 3, nullable: true })
  downswingCenterOfGravity: number;

  @Column({ name: 'downswing_right_elbow_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  downswingRightElbowLocation: number;

  @Column({ name: 'downswing_right_arm_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  downswingRightArmRotation: number;

  // ========================================
  // Impact Phase (임팩트)
  // ========================================
  @Column({ name: 'impact_frame', type: 'int', nullable: true })
  impactFrame: number;

  @Column({ name: 'impact_head_location', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactHeadLocation: number;

  @Column({ name: 'impact_left_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactLeftArmFlexion: number;

  @Column({ name: 'impact_right_arm_flexion', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactRightArmFlexion: number;

  @Column({ name: 'impact_hanging_back', type: 'decimal', precision: 10, scale: 3, nullable: true })
  impactHangingBack: number;

  // ========================================
  // Follow-through Phase (팔로우스루)
  // ========================================
  @Column({ name: 'follow_frame', type: 'int', nullable: true })
  followFrame: number;

  @Column({ name: 'follow_left_line_align', type: 'decimal', precision: 10, scale: 3, nullable: true })
  followLeftLineAlign: number;

  @Column({ name: 'follow_chicken_wing', type: 'decimal', precision: 10, scale: 3, nullable: true })
  followChickenWing: number;

  @Column({ name: 'follow_center_of_gravity', type: 'decimal', precision: 10, scale: 3, nullable: true })
  followCenterOfGravity: number;

  // ========================================
  // Finish Phase (피니시)
  // ========================================
  @Column({ name: 'finish_frame', type: 'int', nullable: true })
  finishFrame: number;

  @Column({ name: 'finish_center_of_gravity', type: 'decimal', precision: 10, scale: 3, nullable: true })
  finishCenterOfGravity: number;

  @Column({ name: 'finish_right_foot_rotation', type: 'decimal', precision: 10, scale: 3, nullable: true })
  finishRightFootRotation: number;

  @Column({ name: 'finish_left_foot_fix', type: 'decimal', precision: 10, scale: 3, nullable: true })
  finishLeftFootFix: number;

  // ========================================
  // 점수 및 멘트 레벨 필드
  // ========================================
  // Address scores
  @Column({ name: 'address_shoulder_tilt_score', type: 'int', nullable: true })
  addressShoulderTiltScore: number;
  @Column({ name: 'address_shoulder_tilt_ment', type: 'int', nullable: true })
  addressShoulderTiltMent: number;

  @Column({ name: 'address_stance_score', type: 'int', nullable: true })
  addressStanceScore: number;
  @Column({ name: 'address_stance_ment', type: 'int', nullable: true })
  addressStanceMent: number;

  @Column({ name: 'address_upper_body_tilt_score', type: 'int', nullable: true })
  addressUpperBodyTiltScore: number;
  @Column({ name: 'address_upper_body_tilt_ment', type: 'int', nullable: true })
  addressUpperBodyTiltMent: number;

  // Takeback scores
  @Column({ name: 'takeback_left_shoulder_rotation_score', type: 'int', nullable: true })
  takebackLeftShoulderRotationScore: number;
  @Column({ name: 'takeback_left_shoulder_rotation_ment', type: 'int', nullable: true })
  takebackLeftShoulderRotationMent: number;

  @Column({ name: 'takeback_left_arm_flexion_score', type: 'int', nullable: true })
  takebackLeftArmFlexionScore: number;
  @Column({ name: 'takeback_left_arm_flexion_ment', type: 'int', nullable: true })
  takebackLeftArmFlexionMent: number;

  @Column({ name: 'takeback_right_arm_flexion_score', type: 'int', nullable: true })
  takebackRightArmFlexionScore: number;
  @Column({ name: 'takeback_right_arm_flexion_ment', type: 'int', nullable: true })
  takebackRightArmFlexionMent: number;

  @Column({ name: 'takeback_right_hip_rotation_score', type: 'int', nullable: true })
  takebackRightHipRotationScore: number;
  @Column({ name: 'takeback_right_hip_rotation_ment', type: 'int', nullable: true })
  takebackRightHipRotationMent: number;

  // Backswing scores
  @Column({ name: 'backswing_head_location_score', type: 'int', nullable: true })
  backswingHeadLocationScore: number;
  @Column({ name: 'backswing_head_location_ment', type: 'int', nullable: true })
  backswingHeadLocationMent: number;

  @Column({ name: 'backswing_left_shoulder_rotation_score', type: 'int', nullable: true })
  backswingLeftShoulderRotationScore: number;
  @Column({ name: 'backswing_left_shoulder_rotation_ment', type: 'int', nullable: true })
  backswingLeftShoulderRotationMent: number;

  @Column({ name: 'backswing_left_arm_flexion_score', type: 'int', nullable: true })
  backswingLeftArmFlexionScore: number;
  @Column({ name: 'backswing_left_arm_flexion_ment', type: 'int', nullable: true })
  backswingLeftArmFlexionMent: number;

  // Backswing Top scores
  @Column({ name: 'backswing_top_reverse_spine_score', type: 'int', nullable: true })
  backswingTopReverseSpineScore: number;
  @Column({ name: 'backswing_top_reverse_spine_ment', type: 'int', nullable: true })
  backswingTopReverseSpineMent: number;

  @Column({ name: 'backswing_top_right_leg_flexion_score', type: 'int', nullable: true })
  backswingTopRightLegFlexionScore: number;
  @Column({ name: 'backswing_top_right_leg_flexion_ment', type: 'int', nullable: true })
  backswingTopRightLegFlexionMent: number;

  @Column({ name: 'backswing_top_head_location_score', type: 'int', nullable: true })
  backswingTopHeadLocationScore: number;
  @Column({ name: 'backswing_top_head_location_ment', type: 'int', nullable: true })
  backswingTopHeadLocationMent: number;

  @Column({ name: 'backswing_top_right_hip_rotation_score', type: 'int', nullable: true })
  backswingTopRightHipRotationScore: number;
  @Column({ name: 'backswing_top_right_hip_rotation_ment', type: 'int', nullable: true })
  backswingTopRightHipRotationMent: number;

  @Column({ name: 'backswing_top_center_of_gravity_score', type: 'int', nullable: true })
  backswingTopCenterOfGravityScore: number;
  @Column({ name: 'backswing_top_center_of_gravity_ment', type: 'int', nullable: true })
  backswingTopCenterOfGravityMent: number;

  // Downswing scores
  @Column({ name: 'downswing_center_of_gravity_score', type: 'int', nullable: true })
  downswingCenterOfGravityScore: number;
  @Column({ name: 'downswing_center_of_gravity_ment', type: 'int', nullable: true })
  downswingCenterOfGravityMent: number;

  @Column({ name: 'downswing_right_elbow_location_score', type: 'int', nullable: true })
  downswingRightElbowLocationScore: number;
  @Column({ name: 'downswing_right_elbow_location_ment', type: 'int', nullable: true })
  downswingRightElbowLocationMent: number;

  @Column({ name: 'downswing_right_arm_rotation_score', type: 'int', nullable: true })
  downswingRightArmRotationScore: number;
  @Column({ name: 'downswing_right_arm_rotation_ment', type: 'int', nullable: true })
  downswingRightArmRotationMent: number;

  // Impact scores
  @Column({ name: 'impact_head_location_score', type: 'int', nullable: true })
  impactHeadLocationScore: number;
  @Column({ name: 'impact_head_location_ment', type: 'int', nullable: true })
  impactHeadLocationMent: number;

  @Column({ name: 'impact_hanging_back_score', type: 'int', nullable: true })
  impactHangingBackScore: number;
  @Column({ name: 'impact_hanging_back_ment', type: 'int', nullable: true })
  impactHangingBackMent: number;

  @Column({ name: 'impact_left_arm_flexion_score', type: 'int', nullable: true })
  impactLeftArmFlexionScore: number;
  @Column({ name: 'impact_left_arm_flexion_ment', type: 'int', nullable: true })
  impactLeftArmFlexionMent: number;

  @Column({ name: 'impact_right_arm_flexion_score', type: 'int', nullable: true })
  impactRightArmFlexionScore: number;
  @Column({ name: 'impact_right_arm_flexion_ment', type: 'int', nullable: true })
  impactRightArmFlexionMent: number;

  // Follow scores
  @Column({ name: 'follow_left_line_align_score', type: 'int', nullable: true })
  followLeftLineAlignScore: number;
  @Column({ name: 'follow_left_line_align_ment', type: 'int', nullable: true })
  followLeftLineAlignMent: number;

  @Column({ name: 'follow_chicken_wing_score', type: 'int', nullable: true })
  followChickenWingScore: number;
  @Column({ name: 'follow_chicken_wing_ment', type: 'int', nullable: true })
  followChickenWingMent: number;

  @Column({ name: 'follow_center_of_gravity_score', type: 'int', nullable: true })
  followCenterOfGravityScore: number;
  @Column({ name: 'follow_center_of_gravity_ment', type: 'int', nullable: true })
  followCenterOfGravityMent: number;

  // Finish scores
  @Column({ name: 'finish_center_of_gravity_score', type: 'int', nullable: true })
  finishCenterOfGravityScore: number;
  @Column({ name: 'finish_center_of_gravity_ment', type: 'int', nullable: true })
  finishCenterOfGravityMent: number;

  @Column({ name: 'finish_right_foot_rotation_score', type: 'int', nullable: true })
  finishRightFootRotationScore: number;
  @Column({ name: 'finish_right_foot_rotation_ment', type: 'int', nullable: true })
  finishRightFootRotationMent: number;

  @Column({ name: 'finish_left_foot_fix_score', type: 'int', nullable: true })
  finishLeftFootFixScore: number;
  @Column({ name: 'finish_left_foot_fix_ment', type: 'int', nullable: true })
  finishLeftFootFixMent: number;

  // ========================================
  // 총점
  // ========================================
  @Column({ name: 'total_score', type: 'int', nullable: true })
  totalScore: number;

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
