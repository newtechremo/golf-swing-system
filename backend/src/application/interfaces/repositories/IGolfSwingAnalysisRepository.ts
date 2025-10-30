import { GolfSwingAnalysisEntity } from '../../../infrastructure/database/entities/golf-swing-analysis.entity';

export interface IGolfSwingAnalysisRepository {
  findById(id: number): Promise<GolfSwingAnalysisEntity | null>;
  findByUser(userId: number): Promise<GolfSwingAnalysisEntity[]>;
  findByUserAndDateRange(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<GolfSwingAnalysisEntity[]>;
  findByInstructor(instructorId: number): Promise<GolfSwingAnalysisEntity[]>;
  findByInstructorAndDateRange(
    instructorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<GolfSwingAnalysisEntity[]>;
  findWithRelations(id: number): Promise<GolfSwingAnalysisEntity | null>;
  create(
    analysis: Partial<GolfSwingAnalysisEntity>,
  ): Promise<GolfSwingAnalysisEntity>;
  update(
    id: number,
    analysis: Partial<GolfSwingAnalysisEntity>,
  ): Promise<GolfSwingAnalysisEntity | null>;
  updateMemo(id: number, memo: string): Promise<GolfSwingAnalysisEntity | null>;
  delete(id: number): Promise<boolean>;
  getCalendarData(
    userId: number,
    year: number,
    month: number,
  ): Promise<{ date: string; count: number }[]>;
}
