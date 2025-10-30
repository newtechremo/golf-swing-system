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

@Entity('golf_swing_types')
export class SwingTypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'analysis_id', unique: true })
  analysisId: number;

  // 스윙 타입: 풀스윙(full) 또는 반스윙(half)
  @Column({
    name: 'swing_type',
    type: 'enum',
    enum: ['full', 'half'],
  })
  swingType: 'full' | 'half';

  // 풀스윙 8단계 프레임 정보
  @Column({ name: 'address_frame', type: 'int', nullable: true })
  addressFrame: number;

  @Column({ name: 'takeback_frame', type: 'int', nullable: true })
  takebackFrame: number;

  @Column({ name: 'backswing_frame', type: 'int', nullable: true })
  backswingFrame: number;

  @Column({ name: 'top_frame', type: 'int', nullable: true })
  topFrame: number;

  @Column({ name: 'downswing_frame', type: 'int', nullable: true })
  downswingFrame: number;

  @Column({ name: 'impact_frame', type: 'int', nullable: true })
  impactFrame: number;

  @Column({ name: 'followthrough_frame', type: 'int', nullable: true })
  followthroughFrame: number;

  @Column({ name: 'finish_frame', type: 'int', nullable: true })
  finishFrame: number;

  // 반스윙 5단계 프레임 정보 (full swing의 일부만 사용)
  // address, takeback, backswing, downswing, impact 만 사용
  @Column({ name: 'half_address_frame', type: 'int', nullable: true })
  halfAddressFrame: number;

  @Column({ name: 'half_takeback_frame', type: 'int', nullable: true })
  halfTakebackFrame: number;

  @Column({ name: 'half_backswing_frame', type: 'int', nullable: true })
  halfBackswingFrame: number;

  @Column({ name: 'half_downswing_frame', type: 'int', nullable: true })
  halfDownswingFrame: number;

  @Column({ name: 'half_impact_frame', type: 'int', nullable: true })
  halfImpactFrame: number;

  // 총 프레임 수
  @Column({ name: 'total_frames', type: 'int', nullable: true })
  totalFrames: number;

  // FPS (frames per second)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  fps: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => GolfSwingAnalysisEntity, (analysis) => analysis.swingType, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis: GolfSwingAnalysisEntity;
}
