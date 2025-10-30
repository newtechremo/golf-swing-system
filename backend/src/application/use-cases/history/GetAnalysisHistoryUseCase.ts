import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';

/**
 * 분석 이력 조회 Use Case
 * 대상자의 골프 스윙 및 신체 자세 분석 이력을 조회합니다.
 */
@Injectable()
export class GetAnalysisHistoryUseCase {
  constructor(
    private readonly subjectRepository: ISubjectRepository,
    private readonly golfSwingRepository: IGolfSwingAnalysisRepository,
    private readonly postureRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(
    userId: number,
    subjectId: number,
    query: {
      type?: 'golf' | 'posture' | 'all';
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    // 대상자 조회 및 권한 확인
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자의 이력을 조회할 권한이 없습니다.');
    }

    const type = query.type || 'all';
    const page = query.page || 1;
    const limit = query.limit || 20;

    // 날짜 범위
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    // 골프 스윙 이력 조회
    let golfSwingAnalyses = [];
    if (type === 'golf' || type === 'all') {
      if (startDate && endDate) {
        golfSwingAnalyses =
          await this.golfSwingRepository.findBySubjectAndDateRange(
            subjectId,
            startDate,
            endDate,
          );
      } else {
        golfSwingAnalyses = await this.golfSwingRepository.findBySubject(
          subjectId,
        );
      }
    }

    // 신체 자세 이력 조회
    let postureAnalyses = [];
    if (type === 'posture' || type === 'all') {
      if (startDate && endDate) {
        postureAnalyses =
          await this.postureRepository.findBySubjectAndDateRange(
            subjectId,
            startDate,
            endDate,
          );
      } else {
        postureAnalyses = await this.postureRepository.findBySubject(subjectId);
      }
    }

    // 통합 이력 생성
    const allHistory = [
      ...golfSwingAnalyses.map((a) => ({
        id: a.id,
        type: 'golf' as const,
        date: a.analysisDate,
        status: a.status,
        memo: a.memo,
        swingType: a.swingType?.swingType,
      })),
      ...postureAnalyses.map((a) => ({
        id: a.id,
        type: 'posture' as const,
        date: a.analysisDate,
        status:
          a.frontStatus === 'completed' &&
          a.sideStatus === 'completed' &&
          a.backStatus === 'completed'
            ? 'completed'
            : 'pending',
        memo: a.memo,
      })),
    ];

    // 날짜순 정렬 (최신순)
    allHistory.sort((a, b) => b.date.getTime() - a.date.getTime());

    // 페이지네이션
    const total = allHistory.length;
    const offset = (page - 1) * limit;
    const paginatedHistory = allHistory.slice(offset, offset + limit);

    return {
      subject: {
        id: subject.id,
        name: subject.name,
        phoneNumber: subject.phoneNumber,
      },
      history: paginatedHistory.map((h) => ({
        id: h.id,
        type: h.type,
        date: h.date.toISOString().split('T')[0],
        status: h.status,
        memo: h.memo,
        swingType: h.swingType,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
