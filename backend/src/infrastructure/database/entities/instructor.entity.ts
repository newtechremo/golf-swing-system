import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { GolfSwingAnalysisEntity } from './golf-swing-analysis.entity';
import { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';

@Entity('instructors')
export class InstructorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ name: 'phone_number', type: 'varchar', length: 20, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  // 결제 타입
  @Column({
    name: 'payment_type',
    type: 'enum',
    enum: ['free', 'paid'],
    default: 'free',
  })
  paymentType: 'free' | 'paid';

  // 인증 강사 여부
  @Column({ name: 'is_certified', type: 'boolean', default: false })
  isCertified: boolean;

  @Column({ name: 'certification_number', type: 'varchar', length: 100, nullable: true })
  certificationNumber: string;

  @Column({ name: 'certification_date', type: 'date', nullable: true })
  certificationDate: Date;

  // 구독 정보
  @Column({ name: 'subscription_start_date', type: 'date', nullable: true })
  subscriptionStartDate: Date;

  @Column({ name: 'subscription_end_date', type: 'date', nullable: true })
  subscriptionEndDate: Date;

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

  @Column({ name: 'profile_image_url', type: 'varchar', length: 500, nullable: true })
  profileImageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserEntity, (user) => user.instructor)
  members: UserEntity[];

  @OneToMany(() => GolfSwingAnalysisEntity, (analysis) => analysis.instructor)
  golfSwingAnalyses: GolfSwingAnalysisEntity[];

  @OneToMany(() => BodyPostureAnalysisEntity, (analysis) => analysis.instructor)
  bodyPostureAnalyses: BodyPostureAnalysisEntity[];
}
