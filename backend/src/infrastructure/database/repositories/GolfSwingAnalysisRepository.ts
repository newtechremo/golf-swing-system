import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GolfSwingAnalysisEntity } from '../entities/golf-swing-analysis.entity';
import { IGolfSwingAnalysisRepository } from '../../../application/interfaces/repositories/IGolfSwingAnalysisRepository';

@Injectable()
export class GolfSwingAnalysisRepository implements IGolfSwingAnalysisRepository {
  constructor(
    @InjectRepository(GolfSwingAnalysisEntity)
    private readonly repository: Repository<GolfSwingAnalysisEntity>,
  ) {}

  async findById(id: number): Promise<GolfSwingAnalysisEntity | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async findByUser(userId: number): Promise<GolfSwingAnalysisEntity[]> {
    return await this.repository.find({
      where: { userId },
      order: { analysisDate: 'DESC' },
    });
  }

  async findByUserAndDateRange(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<GolfSwingAnalysisEntity[]> {
    return await this.repository.find({
      where: {
        userId,
        analysisDate: Between(startDate, endDate),
      },
      order: { analysisDate: 'DESC' },
    });
  }

  async findByInstructor(instructorId: number): Promise<GolfSwingAnalysisEntity[]> {
    return await this.repository.find({
      where: { instructorId },
      relations: ['user'],
      order: { analysisDate: 'DESC' },
    });
  }

  async findByInstructorAndDateRange(
    instructorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<GolfSwingAnalysisEntity[]> {
    return await this.repository.find({
      where: {
        instructorId,
        analysisDate: Between(startDate, endDate),
      },
      relations: ['user'],
      order: { analysisDate: 'DESC' },
    });
  }

  async findWithRelations(id: number): Promise<GolfSwingAnalysisEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'instructor', 'swingType', 'result', 'angles'],
    });
  }

  async create(
    analysis: Partial<GolfSwingAnalysisEntity>,
  ): Promise<GolfSwingAnalysisEntity> {
    const newAnalysis = this.repository.create(analysis);
    return await this.repository.save(newAnalysis);
  }

  async update(
    id: number,
    analysis: Partial<GolfSwingAnalysisEntity>,
  ): Promise<GolfSwingAnalysisEntity | null> {
    await this.repository.update(id, analysis);
    return await this.findById(id);
  }

  async updateMemo(id: number, memo: string): Promise<GolfSwingAnalysisEntity | null> {
    await this.repository.update(id, { memo });
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async getCalendarData(
    userId: number,
    year: number,
    month: number,
  ): Promise<{ date: string; count: number }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const analyses = await this.repository
      .createQueryBuilder('analysis')
      .select('DATE(analysis.analysisDate)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('analysis.userId = :userId', { userId })
      .andWhere('analysis.analysisDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(analysis.analysisDate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return analyses.map((item) => ({
      date: item.date,
      count: parseInt(item.count, 10),
    }));
  }
}
