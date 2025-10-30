import { UserEntity } from '../../../infrastructure/database/entities/user.entity';

/**
 * 강사 리포지토리 인터페이스
 */
export interface IUserRepository {
  findById(id: number): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByCenterId(centerId: number): Promise<UserEntity[]>;
  findAll(): Promise<UserEntity[]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(
    id: number,
    user: Partial<UserEntity>,
  ): Promise<UserEntity | null>;
  delete(id: number): Promise<boolean>;
  findWithSubjects(id: number): Promise<UserEntity | null>;
  updateSubscription(
    id: number,
    subscriptionEndDate: Date,
  ): Promise<UserEntity | null>;
}
