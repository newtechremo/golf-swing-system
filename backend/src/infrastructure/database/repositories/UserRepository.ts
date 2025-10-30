import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { IUserRepository } from '../../../application/interfaces/repositories/IUserRepository';

/**
 * 강사 리포지토리
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: number): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['center'],
    });
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { username },
    });
  }

  async findByCenterId(centerId: number): Promise<UserEntity[]> {
    return await this.repository.find({
      where: { centerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.repository.find({
      relations: ['center'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    const newUser = this.repository.create(user);
    return await this.repository.save(newUser);
  }

  async update(
    id: number,
    user: Partial<UserEntity>,
  ): Promise<UserEntity | null> {
    await this.repository.update(id, user);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async findWithSubjects(id: number): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['subjects'],
    });
  }

  async updateSubscription(
    id: number,
    subscriptionEndDate: Date,
  ): Promise<UserEntity | null> {
    await this.repository.update(id, { subscriptionEndDate });
    return await this.findById(id);
  }
}
