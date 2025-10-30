import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { IUserRepository } from '../../../application/interfaces/repositories/IUserRepository';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: number): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['instructor'],
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { phoneNumber },
    });
  }

  async findByPhoneNumberAndInstructor(
    phoneNumber: string,
    instructorId: number,
  ): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: {
        phoneNumber,
        instructorId,
      },
      relations: ['instructor'],
    });
  }

  async findByInstructorId(instructorId: number): Promise<UserEntity[]> {
    return await this.repository.find({
      where: { instructorId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.repository.find({
      relations: ['instructor'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    const newUser = this.repository.create(user);
    return await this.repository.save(newUser);
  }

  async update(id: number, user: Partial<UserEntity>): Promise<UserEntity | null> {
    await this.repository.update(id, user);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async searchByName(name: string, instructorId: number): Promise<UserEntity[]> {
    return await this.repository.find({
      where: {
        name: Like(`%${name}%`),
        instructorId,
      },
      order: { name: 'ASC' },
    });
  }
}
