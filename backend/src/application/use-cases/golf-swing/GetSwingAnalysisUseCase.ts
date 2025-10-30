import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';

/**
 * 골프 스윙 분석 결과 조회 Use Case
 */
@Injectable()
export class GetSwingAnalysisUseCase {
  constructor(
    private readonly analysisRepository: IGolfSwingAnalysisRepository,
  ) {}

  async execute(userId: number, analysisId: number) {
    // 분석 결과 조회 (모든 관계 포함)
    const analysis = await this.analysisRepository.findWithRelations(analysisId);

    if (!analysis) {
      throw new NotFoundException('분석 결과를 찾을 수 없습니다.');
    }

    // 권한 확인 (강사 본인만 조회 가능)
    if (analysis.userId !== userId) {
      throw new ForbiddenException('이 분석 결과를 조회할 권한이 없습니다.');
    }

    // 분석이 완료되지 않은 경우
    if (analysis.status !== 'completed') {
      return {
        id: analysis.id,
        uuid: analysis.uuid,
        status: analysis.status,
        analysisDate: analysis.analysisDate,
        waitTime: analysis.waitTime,
        subject: {
          id: analysis.subject.id,
          name: analysis.subject.name,
        },
      };
    }

    // 완료된 분석 결과 반환
    return {
      id: analysis.id,
      uuid: analysis.uuid,
      status: analysis.status,
      analysisDate: analysis.analysisDate,
      videoUrl: analysis.videoUrl,
      memo: analysis.memo,
      subject: {
        id: analysis.subject.id,
        name: analysis.subject.name,
        phoneNumber: analysis.subject.phoneNumber,
      },
      swingType: analysis.swingType
        ? {
            swingType: analysis.swingType.swingType,
            totalFrames: analysis.swingType.totalFrames,
            fps: analysis.swingType.fps,
            // Full swing phases
            addressFrame: analysis.swingType.addressFrame,
            takebackFrame: analysis.swingType.takebackFrame,
            backswingFrame: analysis.swingType.backswingFrame,
            topFrame: analysis.swingType.topFrame,
            downswingFrame: analysis.swingType.downswingFrame,
            impactFrame: analysis.swingType.impactFrame,
            followthroughFrame: analysis.swingType.followthroughFrame,
            finishFrame: analysis.swingType.finishFrame,
            // Half swing phases
            halfAddressFrame: analysis.swingType.halfAddressFrame,
            halfBackswingFrame: analysis.swingType.halfBackswingFrame,
            halfTopFrame: analysis.swingType.halfTopFrame,
            halfImpactFrame: analysis.swingType.halfImpactFrame,
            halfFinishFrame: analysis.swingType.halfFinishFrame,
          }
        : null,
      result: analysis.result
        ? {
            totalScore: analysis.result.totalScore,
            posture: analysis.result.posture,
            armMovement: analysis.result.armMovement,
            bodyRotation: analysis.result.bodyRotation,
            tempo: analysis.result.tempo,
            // ... 기타 메트릭
          }
        : null,
      angle: analysis.angle
        ? {
            kneeLine: analysis.angle.kneeLine,
            pelvis: analysis.angle.pelvis,
            shoulderLine: analysis.angle.shoulderLine,
          }
        : null,
    };
  }
}
