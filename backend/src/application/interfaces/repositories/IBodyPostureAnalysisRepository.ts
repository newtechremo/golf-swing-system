import { BodyPostureAnalysisEntity } from '../../../infrastructure/database/entities/body-posture-analysis.entity';

/**
 * 신체 자세 분석 리포지토리 인터페이스
 */
export interface IBodyPostureAnalysisRepository {
  findById(id: number): Promise<BodyPostureAnalysisEntity | null>;
  findBySubject(subjectId: number): Promise<BodyPostureAnalysisEntity[]>;
  findBySubjectAndDateRange(
    subjectId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<BodyPostureAnalysisEntity[]>;
  findByUser(userId: number): Promise<BodyPostureAnalysisEntity[]>; // 강사의 모든 분석
  findByUserAndDateRange(
    userId: number,
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
    subjectId: number,
    year: number,
    month: number,
  ): Promise<{ date: string; count: number }[]>;
}
