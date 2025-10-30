import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';

/**
 * 신체 자세 분석 결과 조회 Use Case
 */
@Injectable()
export class GetPostureAnalysisUseCase {
  constructor(
    @Inject('IBodyPostureAnalysisRepository')
    private readonly analysisRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(userId: number, analysisId: number) {
    // 분석 결과 조회 (모든 관계 포함)
    const analysis = await this.analysisRepository.findWithRelations(analysisId);

    if (!analysis) {
      throw new NotFoundException('분석 결과를 찾을 수 없습니다.');
    }

    // 권한 확인
    if (analysis.userId !== userId) {
      throw new ForbiddenException('이 분석 결과를 조회할 권한이 없습니다.');
    }

    // 모든 방향의 분석이 완료되었는지 확인
    const isCompleted =
      analysis.frontStatus === 'completed' &&
      analysis.sideStatus === 'completed' &&
      analysis.backStatus === 'completed';

    // 기본 정보
    const result: any = {
      id: analysis.id,
      analysisDate: analysis.analysisDate,
      status: isCompleted ? 'completed' : 'pending',
      memo: analysis.memo,
      subject: {
        id: analysis.subject.id,
        name: analysis.subject.name,
        phoneNumber: analysis.subject.phoneNumber,
      },
      images: {
        front: {
          url: analysis.frontImageUrl,
          status: analysis.frontStatus,
        },
        side: {
          url: analysis.sideImageUrl,
          status: analysis.sideStatus,
        },
        back: {
          url: analysis.backImageUrl,
          status: analysis.backStatus,
        },
      },
    };

    // 완료된 경우 분석 결과 포함 (전체 결과 entity 반환)
    if (isCompleted) {
      result.results = {
        front: analysis.frontResult || null,
        side: analysis.sideResult || null,
        back: analysis.backResult || null,
      };
    }

    return result;
  }
}
