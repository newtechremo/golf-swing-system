import { UserEntity } from '../../../infrastructure/database/entities/user.entity';

export interface IUserRepository {
  findById(id: number): Promise<UserEntity | null>;
  findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null>;
  findByPhoneNumberAndInstructor(
    phoneNumber: string,
    instructorId: number,
  ): Promise<UserEntity | null>;
  findByInstructorId(instructorId: number): Promise<UserEntity[]>;
  findAll(): Promise<UserEntity[]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: number, user: Partial<UserEntity>): Promise<UserEntity | null>;
  delete(id: number): Promise<boolean>;
  searchByName(name: string, instructorId: number): Promise<UserEntity[]>;
}
