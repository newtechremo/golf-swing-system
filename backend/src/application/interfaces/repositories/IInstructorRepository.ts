import { InstructorEntity } from '../../../infrastructure/database/entities/instructor.entity';

export interface IInstructorRepository {
  findById(id: number): Promise<InstructorEntity | null>;
  findByUsername(username: string): Promise<InstructorEntity | null>;
  findAll(): Promise<InstructorEntity[]>;
  create(instructor: Partial<InstructorEntity>): Promise<InstructorEntity>;
  update(
    id: number,
    instructor: Partial<InstructorEntity>,
  ): Promise<InstructorEntity | null>;
  delete(id: number): Promise<boolean>;
  findWithMembers(id: number): Promise<InstructorEntity | null>;
  updateSubscription(
    id: number,
    subscriptionEndDate: Date,
  ): Promise<InstructorEntity | null>;
}
