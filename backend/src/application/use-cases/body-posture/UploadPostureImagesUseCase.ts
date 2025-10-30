import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * 신체 자세 이미지 업로드 및 분석 시작 Use Case
 *
 * A-pose 3방향 (정면, 측면, 후면) 이미지를 업로드하고 분석을 시작합니다.
 * 실제 REMO API 호출은 RemoPostureService에서 처리합니다.
 */
@Injectable()
export class UploadPostureImagesUseCase {
  constructor(
    private readonly subjectRepository: ISubjectRepository,
    private readonly analysisRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(
    userId: number,
    subjectId: number,
    images: {
      frontS3Key: string;
      frontUrl: string;
      sideS3Key: string;
      sideUrl: string;
      backS3Key: string;
      backUrl: string;
    },
  ): Promise<{ analysisId: number; uuids: { front: string; side: string; back: string } }> {
    // 대상자 조회 및 권한 확인
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자에 대한 분석 권한이 없습니다.');
    }

    // UUIDs 생성
    const frontUuid = uuidv4();
    const sideUuid = uuidv4();
    const backUuid = uuidv4();

    // 분석 레코드 생성
    const analysis = await this.analysisRepository.create({
      subjectId,
      userId,
      analysisDate: new Date(),
      frontImageUrl: images.frontUrl,
      frontImageS3Key: images.frontS3Key,
      sideImageUrl: images.sideUrl,
      sideImageS3Key: images.sideS3Key,
      backImageUrl: images.backUrl,
      backImageS3Key: images.backS3Key,
      frontUuid,
      sideUuid,
      backUuid,
      frontStatus: 'pending',
      sideStatus: 'pending',
      backStatus: 'pending',
    });

    // 실제 REMO API 호출은 Controller 또는 별도 Service에서 처리

    return {
      analysisId: analysis.id,
      uuids: {
        front: frontUuid,
        side: sideUuid,
        back: backUuid,
      },
    };
  }
}
