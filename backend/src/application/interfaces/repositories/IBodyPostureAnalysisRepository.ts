import { BodyPostureAnalysisEntity } from '../../../infrastructure/database/entities/body-posture-analysis.entity';

export interface IBodyPostureAnalysisRepository {
  findById(id: number): Promise<BodyPostureAnalysisEntity | null>;
  findByUser(userId: number): Promise<BodyPostureAnalysisEntity[]>;
  findByUserAndDateRange(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<BodyPostureAnalysisEntity[]>;
  findByInstructor(instructorId: number): Promise<BodyPostureAnalysisEntity[]>;
  findByInstructorAndDateRange(
    instructorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<BodyPostureAnalysisEntity[]>;
  findWithRelations(id: number): Promise<BodyPostureAnalysisEntity | null>;
  create(
    analysis: Partial<BodyPostureAnalysisEntity>,
  ): Promise<BodyPostureAnalysisEntity>;
  update(
    id: number,
    analysis: Partial<BodyPostureAnalysisEntity>,
  ): Promise<BodyPostureAnalysisEntity | null>;
  updateMemo(
    id: number,
    memo: string,
  ): Promise<BodyPostureAnalysisEntity | null>;
  delete(id: number): Promise<boolean>;
  getCalendarData(
    userId: number,
    year: number,
    month: number,
  ): Promise<{ date: string; count: number }[]>;
}
