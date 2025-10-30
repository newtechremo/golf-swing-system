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

    // 최근 골프 스윙 분석 조회 (최근 5개)
    const golfSwingAnalyses = await this.golfSwingRepository.findBySubject(
      subjectId,
    );
    const recentGolfSwing = golfSwingAnalyses.slice(0, 5).map((analysis) => ({
      id: analysis.id,
      date: analysis.analysisDate.toISOString().split('T')[0],
      swingType: analysis.swingType?.swingType || 'full',
      status: analysis.status,
    }));

    // 최근 신체 자세 분석 조회 (최근 5개)
    const postureAnalyses = await this.postureRepository.findBySubject(
      subjectId,
    );
    const recentPosture = postureAnalyses.slice(0, 5).map((analysis) => ({
      id: analysis.id,
      date: analysis.analysisDate.toISOString().split('T')[0],
      status:
        analysis.frontStatus === 'completed' &&
        analysis.sideStatus === 'completed' &&
        analysis.backStatus === 'completed'
          ? 'completed'
          : 'pending',
    }));

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
