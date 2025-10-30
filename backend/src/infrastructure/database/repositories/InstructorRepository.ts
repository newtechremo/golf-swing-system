import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstructorEntity } from '../entities/instructor.entity';
import { IInstructorRepository } from '../../../application/interfaces/repositories/IInstructorRepository';

@Injectable()
export class InstructorRepository implements IInstructorRepository {
  constructor(
    @InjectRepository(InstructorEntity)
    private readonly repository: Repository<InstructorEntity>,
  ) {}

  async findById(id: number): Promise<InstructorEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async findByUsername(username: string): Promise<InstructorEntity | null> {
    return await this.repository.findOne({
      where: { username },
    });
  }

  async findAll(): Promise<InstructorEntity[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(instructor: Partial<InstructorEntity>): Promise<InstructorEntity> {
    const newInstructor = this.repository.create(instructor);
    return await this.repository.save(newInstructor);
  }

  async update(
    id: number,
    instructor: Partial<InstructorEntity>,
  ): Promise<InstructorEntity | null> {
    await this.repository.update(id, instructor);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async findWithMembers(id: number): Promise<InstructorEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['members'],
    });
  }

  async updateSubscription(
    id: number,
    subscriptionEndDate: Date,
  ): Promise<InstructorEntity | null> {
    await this.repository.update(id, { subscriptionEndDate });
    return await this.findById(id);
  }
}
