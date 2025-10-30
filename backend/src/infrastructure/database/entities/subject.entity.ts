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
import { UserEntity } from './user.entity';
import { GolfSwingAnalysisEntity } from './golf-swing-analysis.entity';
import { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';

/**
 * SubjectEntity - 분석 대상자 정보
 * 강사(User)가 관리하는 분석 대상자를 나타냅니다.
 * 대상자는 골프 스윙 분석 및 신체 자세 분석을 받을 수 있습니다.
 */
@Entity('subjects')
export class SubjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id' })
  userId: number; // 담당 강사 ID

  // 기본 정보
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: ['M', 'F', 'Other'],
    nullable: true,
  })
  gender: 'M' | 'F' | 'Other';

  // 신체 정보
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  // 메모 및 추가 정보
  @Column({ type: 'text', nullable: true })
  memo: string;

  @Column({
    name: 'profile_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  profileImageUrl: string;

  // 상태
  @Index()
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'deleted';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, (user) => user.subjects)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity; // 담당 강사

  @OneToMany(() => GolfSwingAnalysisEntity, (analysis) => analysis.subject)
  golfSwingAnalyses: GolfSwingAnalysisEntity[];

  @OneToMany(() => BodyPostureAnalysisEntity, (analysis) => analysis.subject)
  bodyPostureAnalyses: BodyPostureAnalysisEntity[];
}
