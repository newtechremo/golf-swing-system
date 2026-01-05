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

    // 전체 상태 계산
    // - 하나라도 'failed'면 전체 상태는 'failed'
    // - 분석된 이미지가 모두 'completed'면 전체 상태는 'completed'
    // - 그 외에는 'pending'
    const hasFailed =
      analysis.frontStatus === 'failed' ||
      analysis.leftSideStatus === 'failed' ||
      analysis.rightSideStatus === 'failed' ||
      analysis.backStatus === 'failed';

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

    let overallStatus: 'pending' | 'completed' | 'failed' = 'pending';
    if (hasFailed) {
      overallStatus = 'failed';
    } else if (isCompleted) {
      overallStatus = 'completed';
    }

    // 기본 정보
    const result: any = {
      id: analysis.id,
      analysisDate: analysis.analysisDate instanceof Date
        ? analysis.analysisDate.toISOString()
        : analysis.analysisDate,
      status: overallStatus,
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
        leftSide: {
          url: analysis.leftSideImageUrl,
          status: analysis.leftSideStatus,
        },
        rightSide: {
          url: analysis.rightSideImageUrl,
          status: analysis.rightSideStatus,
        },
        back: {
          url: analysis.backImageUrl,
          status: analysis.backStatus,
        },
      },
    };

    // 분석 결과 항상 포함 (상태에 관계없이 존재하는 결과는 반환)
    // sideResults 배열에서 left/right 분리
    const leftSideResult = analysis.sideResults?.find(r => r.sideType === 'left') || null;
    const rightSideResult = analysis.sideResults?.find(r => r.sideType === 'right') || null;

    result.results = {
      front: analysis.frontResult || null,
      leftSide: leftSideResult,
      rightSide: rightSideResult,
      back: analysis.backResult || null,
    };

    return result;
  }
}
