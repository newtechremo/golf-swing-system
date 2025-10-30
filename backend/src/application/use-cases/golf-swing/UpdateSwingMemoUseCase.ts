import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';

/**
 * 골프 스윙 분석 메모 업데이트 Use Case
 */
@Injectable()
export class UpdateSwingMemoUseCase {
  constructor(
    @Inject('IGolfSwingAnalysisRepository')
    private readonly analysisRepository: IGolfSwingAnalysisRepository,
  ) {}

  async execute(
    userId: number,
    analysisId: number,
    memo: string,
  ): Promise<void> {
    // 분석 결과 조회
    const analysis = await this.analysisRepository.findById(analysisId);

    if (!analysis) {
      throw new NotFoundException('분석 결과를 찾을 수 없습니다.');
    }

    // 권한 확인
    if (analysis.userId !== userId) {
      throw new ForbiddenException('이 분석 결과를 수정할 권한이 없습니다.');
    }

    // 메모 업데이트
    await this.analysisRepository.updateMemo(analysisId, memo);
  }
}
