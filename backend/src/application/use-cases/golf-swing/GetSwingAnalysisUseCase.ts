import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';
import { S3UploadService } from '../../../infrastructure/external-services/s3-upload.service';

/**
 * 골프 스윙 분석 결과 조회 Use Case
 */
@Injectable()
export class GetSwingAnalysisUseCase {
  constructor(
    @Inject('IGolfSwingAnalysisRepository')
    private readonly analysisRepository: IGolfSwingAnalysisRepository,
    private readonly s3UploadService: S3UploadService,
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

    // S3 Presigned URL 생성 (1시간 유효)
    let videoPresignedUrl: string | null = null;
    let resultVideoPresignedUrl: string | null = null;

    if (analysis.videoS3Key) {
      try {
        videoPresignedUrl = await this.s3UploadService.getPresignedUrl(analysis.videoS3Key, 3600);
      } catch (err) {
        // Presigned URL 생성 실패 시 원본 URL 사용
        videoPresignedUrl = analysis.videoUrl;
      }
    }

    if (analysis.resultVideoS3Key) {
      try {
        resultVideoPresignedUrl = await this.s3UploadService.getPresignedUrl(analysis.resultVideoS3Key, 3600);
      } catch (err) {
        // Presigned URL 생성 실패 시 원본 URL 사용
        resultVideoPresignedUrl = analysis.resultVideoUrl;
      }
    }

    // 완료된 분석 결과 반환
    return {
      id: analysis.id,
      uuid: analysis.uuid,
      status: analysis.status,
      analysisDate: analysis.analysisDate,
      videoUrl: videoPresignedUrl || analysis.videoUrl,
      resultVideoUrl: resultVideoPresignedUrl || analysis.resultVideoUrl,
      memo: analysis.memo,
      subject: {
        id: analysis.subject.id,
        name: analysis.subject.name,
        phoneNumber: analysis.subject.phoneNumber,
      },
      swingType: analysis.swingType || null,
      result: analysis.result || null,
      angle: analysis.angle || null,
    };
  }
}
