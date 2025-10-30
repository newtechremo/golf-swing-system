import { GolfSwingAnalysisEntity } from '../../../infrastructure/database/entities/golf-swing-analysis.entity';

/**
 * 골프 스윙 분석 리포지토리 인터페이스
 */
export interface IGolfSwingAnalysisRepository {
  findById(id: number): Promise<GolfSwingAnalysisEntity | null>;
  findBySubject(subjectId: number): Promise<GolfSwingAnalysisEntity[]>;
  findBySubjectAndDateRange(
    subjectId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<GolfSwingAnalysisEntity[]>;
  findByUser(userId: number): Promise<GolfSwingAnalysisEntity[]>; // 강사의 모든 분석
  findByUserAndDateRange(
    userId: number,
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
    subjectId: number,
    year: number,
    month: number,
  ): Promise<{ date: string; count: number }[]>;
}
