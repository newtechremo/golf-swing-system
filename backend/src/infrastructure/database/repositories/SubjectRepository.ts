import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SubjectEntity } from '../entities/subject.entity';
import { ISubjectRepository } from '../../../application/interfaces/repositories/ISubjectRepository';

/**
 * 대상자 리포지토리
 */
@Injectable()
export class SubjectRepository implements ISubjectRepository {
  constructor(
    @InjectRepository(SubjectEntity)
    private readonly repository: Repository<SubjectEntity>,
  ) {}

  async findById(id: number): Promise<SubjectEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<SubjectEntity | null> {
    return await this.repository.findOne({
      where: { phoneNumber },
    });
  }

  async findByPhoneNumberAndUser(
    phoneNumber: string,
    userId: number,
  ): Promise<SubjectEntity | null> {
    return await this.repository.findOne({
      where: {
        phoneNumber,
        userId,
      },
      relations: ['user'],
    });
  }

  async findByUserId(userId: number): Promise<SubjectEntity[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<SubjectEntity[]> {
    return await this.repository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(subject: Partial<SubjectEntity>): Promise<SubjectEntity> {
    const newSubject = this.repository.create(subject);
    return await this.repository.save(newSubject);
  }

  async update(id: number, subject: Partial<SubjectEntity>): Promise<SubjectEntity | null> {
    await this.repository.update(id, subject);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async searchByName(name: string, userId: number): Promise<SubjectEntity[]> {
    return await this.repository.find({
      where: {
        name: Like(`%${name}%`),
        userId,
      },
      order: { name: 'ASC' },
    });
  }
}
