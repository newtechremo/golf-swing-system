import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';

/**
 * 신체 자세 이미지 업로드 및 분석 시작 Use Case
 *
 * A-pose 3방향 (정면, 측면, 후면) 이미지를 업로드하고 분석을 시작합니다.
 * REMO API UUID는 Controller에서 전달받습니다.
 */
@Injectable()
export class UploadPostureImagesUseCase {
  constructor(
    @Inject('ISubjectRepository')
    private readonly subjectRepository: ISubjectRepository,
    @Inject('IBodyPostureAnalysisRepository')
    private readonly analysisRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(
    userId: number,
    subjectId: number,
    images: {
      frontS3Key: string;
      frontUrl: string;
      leftSideS3Key: string;
      leftSideUrl: string;
      rightSideS3Key: string;
      rightSideUrl: string;
      backS3Key: string;
      backUrl: string;
    },
    remoData: {
      frontUuid: string;
      leftSideUuid: string;
      rightSideUuid: string;
      backUuid: string;
    },
    status?: {
      frontStatus: 'pending' | 'completed' | 'failed';
      leftSideStatus: 'pending' | 'completed' | 'failed';
      rightSideStatus: 'pending' | 'completed' | 'failed';
      backStatus: 'pending' | 'completed' | 'failed';
    },
  ): Promise<{ analysisId: number; uuids: { front: string; leftSide: string; rightSide: string; back: string } }> {
    // 대상자 조회 및 권한 확인
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자에 대한 분석 권한이 없습니다.');
    }

    // 분석 레코드 생성 (REMO API 결과 데이터 저장)
    const analysis = await this.analysisRepository.create({
      subjectId,
      userId,
      analysisDate: new Date(),
      frontImageUrl: images.frontUrl,
      frontImageS3Key: images.frontS3Key,
      leftSideImageUrl: images.leftSideUrl,
      leftSideImageS3Key: images.leftSideS3Key,
      rightSideImageUrl: images.rightSideUrl,
      rightSideImageS3Key: images.rightSideS3Key,
      backImageUrl: images.backUrl,
      backImageS3Key: images.backS3Key,
      frontUuid: remoData.frontUuid,
      leftSideUuid: remoData.leftSideUuid,
      rightSideUuid: remoData.rightSideUuid,
      backUuid: remoData.backUuid,
      frontStatus: status?.frontStatus || 'pending',
      leftSideStatus: status?.leftSideStatus || 'pending',
      rightSideStatus: status?.rightSideStatus || 'pending',
      backStatus: status?.backStatus || 'pending',
    });

    return {
      analysisId: analysis.id,
      uuids: {
        front: remoData.frontUuid,
        leftSide: remoData.leftSideUuid,
        rightSide: remoData.rightSideUuid,
        back: remoData.backUuid,
      },
    };
  }
}
