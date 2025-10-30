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
import { CenterEntity } from './center.entity';
import { SubjectEntity } from './subject.entity';
import { GolfSwingAnalysisEntity } from './golf-swing-analysis.entity';
import { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';
import { NoticeReadEntity } from './notice-read.entity';

/**
 * UserEntity - 강사 정보
 * 센터에 소속된 강사를 나타냅니다.
 * 강사는 여러 대상자(Subject)를 관리할 수 있습니다.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'center_id' })
  centerId: number;

  // 로그인 정보
  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  // 기본 정보
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  // 결제 및 인증 정보
  @Column({
    name: 'payment_type',
    type: 'enum',
    enum: ['free', 'paid'],
    default: 'free',
  })
  paymentType: 'free' | 'paid';

  @Column({ name: 'is_certified', type: 'boolean', default: false })
  isCertified: boolean;

  @Column({
    name: 'certification_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  certificationNumber: string;

  @Column({ name: 'certification_date', type: 'date', nullable: true })
  certificationDate: Date;

  // 구독 정보
  @Column({ name: 'subscription_start_date', type: 'date', nullable: true })
  subscriptionStartDate: Date;

  @Column({ name: 'subscription_end_date', type: 'date', nullable: true })
  subscriptionEndDate: Date;

  // 상태 정보
  @Index()
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'suspended';

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  // 프로필 정보
  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({
    name: 'profile_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  profileImageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CenterEntity, (center) => center.users)
  @JoinColumn({ name: 'center_id' })
  center: CenterEntity;

  @OneToMany(() => SubjectEntity, (subject) => subject.user)
  subjects: SubjectEntity[];

  @OneToMany(() => GolfSwingAnalysisEntity, (analysis) => analysis.user)
  golfSwingAnalyses: GolfSwingAnalysisEntity[];

  @OneToMany(() => BodyPostureAnalysisEntity, (analysis) => analysis.user)
  bodyPostureAnalyses: BodyPostureAnalysisEntity[];

  @OneToMany(() => NoticeReadEntity, (noticeRead) => noticeRead.user)
  noticeReads: NoticeReadEntity[];
}
