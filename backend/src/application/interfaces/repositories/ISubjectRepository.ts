import { SubjectEntity } from '../../../infrastructure/database/entities/subject.entity';

/**
 * 대상자 리포지토리 인터페이스
 */
export interface ISubjectRepository {
  findById(id: number): Promise<SubjectEntity | null>;
  findByPhoneNumber(phoneNumber: string): Promise<SubjectEntity | null>;
  findByPhoneNumberAndUser(
    phoneNumber: string,
    userId: number,
  ): Promise<SubjectEntity | null>;
  findByUserId(userId: number): Promise<SubjectEntity[]>;
  findAll(): Promise<SubjectEntity[]>;
  create(subject: Partial<SubjectEntity>): Promise<SubjectEntity>;
  update(id: number, subject: Partial<SubjectEntity>): Promise<SubjectEntity | null>;
  delete(id: number): Promise<boolean>;
  searchByName(name: string, userId: number): Promise<SubjectEntity[]>;
}
