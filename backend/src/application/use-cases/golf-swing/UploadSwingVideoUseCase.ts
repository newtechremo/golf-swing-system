import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';
import { SwingTypeEntity } from '../../../infrastructure/database/entities/swing-type.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * 골프 스윙 비디오 업로드 및 분석 시작 Use Case
 *
 * 실제 REMO API 호출은 RemoGolfService에서 처리하며,
 * 이 Use Case는 분석 요청 레코드를 생성하고 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class UploadSwingVideoUseCase {
  constructor(
    @Inject('ISubjectRepository')
    private readonly subjectRepository: ISubjectRepository,
    @Inject('IGolfSwingAnalysisRepository')
    private readonly analysisRepository: IGolfSwingAnalysisRepository,
    @InjectRepository(SwingTypeEntity)
    private readonly swingTypeRepository: Repository<SwingTypeEntity>,
  ) {}

  async execute(
    userId: number,
    subjectId: number,
    videoS3Key: string,
    videoUrl: string,
    swingType: 'full' | 'half',
    height?: string,
  ): Promise<{ analysisId: number; uuid: string }> {
    // 대상자 조회 및 권한 확인
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자에 대한 분석 권한이 없습니다.');
    }

    // UUID 생성
    const uuid = uuidv4();

    // 분석 레코드 생성
    const analysis = await this.analysisRepository.create({
      subjectId,
      userId,
      uuid,
      analysisDate: new Date(),
      height: height || subject.height?.toString(),
      videoUrl,
      videoS3Key,
      status: 'pending', // REMO API 호출 전 대기 상태
    });

    // SwingType 레코드 생성
    await this.swingTypeRepository.save({
      analysisId: analysis.id,
      swingType: swingType,
    });

    // 실제 REMO API 호출은 Controller 또는 별도 Service에서 처리
    // 여기서는 분석 ID와 UUID만 반환

    return {
      analysisId: analysis.id,
      uuid: analysis.uuid,
    };
  }
}
