import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';
import { SubjectDetailDto } from '../../dto/subject/SubjectResponse.dto';

/**
 * 대상자 상세 조회 Use Case
 * 대상자 정보와 최근 분석 이력을 함께 조회합니다.
 */
@Injectable()
export class GetSubjectDetailUseCase {
  constructor(
    @Inject('ISubjectRepository')
    private readonly subjectRepository: ISubjectRepository,
    @Inject('IGolfSwingAnalysisRepository')
    private readonly golfSwingRepository: IGolfSwingAnalysisRepository,
    @Inject('IBodyPostureAnalysisRepository')
    private readonly postureRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(userId: number, subjectId: number): Promise<SubjectDetailDto> {
    // 대상자 조회
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    // 권한 확인
    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자를 조회할 권한이 없습니다.');
    }

    // 날짜를 안전하게 ISO 문자열로 변환하는 헬퍼 함수 (시간 포함)
    const formatDateTime = (date: Date | string | null | undefined): string => {
      if (!date) return new Date().toISOString();
      if (typeof date === 'string') return date;
      return date.toISOString();
    };

    // 최근 골프 스윙 분석 조회 (최근 5개)
    const golfSwingAnalyses = await this.golfSwingRepository.findBySubject(
      subjectId,
    );
    const recentGolfSwing = golfSwingAnalyses.slice(0, 5).map((analysis) => ({
      id: analysis.id,
      date: formatDateTime(analysis.analysisDate),
      swingType: analysis.swingType?.swingType || 'full',
      status: analysis.status,
      memo: analysis.memo || null,
    }));

    // 최근 신체 자세 분석 조회 (최근 5개)
    const postureAnalyses = await this.postureRepository.findBySubject(
      subjectId,
    );
    const recentPosture = postureAnalyses.slice(0, 5).map((analysis) => {
      // 분석된 이미지들의 상태 확인 (업로드되지 않은 이미지는 pending 상태)
      const uploadedStatuses = [
        analysis.frontStatus,
        analysis.leftSideStatus,
        analysis.rightSideStatus,
        analysis.backStatus,
      ].filter(status => status !== 'pending');

      // 분석된 이미지가 1개 이상이고 모두 completed면 전체 완료
      const isCompleted = uploadedStatuses.length > 0 &&
        uploadedStatuses.every(status => status === 'completed');

      return {
        id: analysis.id,
        date: formatDateTime(analysis.analysisDate),
        status: isCompleted ? 'completed' : 'pending',
        memo: analysis.memo || null,
      };
    });

    return {
      id: subject.id,
      userId: subject.userId,
      phoneNumber: subject.phoneNumber,
      name: subject.name,
      birthDate: subject.birthDate,
      gender: subject.gender,
      height: subject.height,
      weight: subject.weight,
      email: subject.email,
      memo: subject.memo,
      status: subject.status,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
      recentAnalyses: {
        golfSwing: recentGolfSwing,
        posture: recentPosture,
      },
    };
  }
}
