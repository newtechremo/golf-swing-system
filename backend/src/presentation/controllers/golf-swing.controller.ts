import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UploadSwingVideoUseCase } from '../../application/use-cases/golf-swing/UploadSwingVideoUseCase';
import { GetSwingAnalysisUseCase } from '../../application/use-cases/golf-swing/GetSwingAnalysisUseCase';
import { UpdateSwingMemoUseCase } from '../../application/use-cases/golf-swing/UpdateSwingMemoUseCase';
import { S3UploadService } from '../../infrastructure/external-services/s3-upload.service';
import { RemoApiService } from '../../infrastructure/external-services/remo-api.service';

@Controller('golf-swing')
@UseGuards(JwtAuthGuard)
export class GolfSwingController {
  constructor(
    private readonly uploadSwingVideoUseCase: UploadSwingVideoUseCase,
    private readonly getSwingAnalysisUseCase: GetSwingAnalysisUseCase,
    private readonly updateSwingMemoUseCase: UpdateSwingMemoUseCase,
    private readonly s3UploadService: S3UploadService,
    private readonly remoApiService: RemoApiService,
  ) {}

  /**
   * 골프 스윙 비디오 업로드 및 분석 시작
   * POST /golf-swing/analyze
   */
  @Post('analyze')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('subjectId', ParseIntPipe) subjectId: number,
    @Body('swingType') swingType: 'full' | 'half',
    @Body('height') height?: string,
  ) {
    const userId = req.user.sub;

    if (!file) {
      throw new BadRequestException('비디오 파일이 필요합니다.');
    }

    if (!swingType || (swingType !== 'full' && swingType !== 'half')) {
      throw new BadRequestException('스윙 타입은 "full" 또는 "half"여야 합니다.');
    }

    // S3에 파일 업로드
    const { s3Key, url } = await this.s3UploadService.uploadVideoFile(
      file,
      userId,
    );

    // 분석 레코드 생성
    const result = await this.uploadSwingVideoUseCase.execute(
      userId,
      subjectId,
      s3Key,
      url,
      swingType,
      height,
    );

    // REMO API 호출하여 분석 시작
    try {
      const remoResult = await this.remoApiService.requestGolfSwingAnalysis(
        file.buffer,
        height || '175',
      );

      // REMO API 결과로 UUID 업데이트 (필요한 경우)
      // 현재는 자체 UUID를 사용하므로 waitTime만 로깅
      console.log(`REMO API 분석 대기 시간: ${remoResult.waitTime}초`);
    } catch (error) {
      // REMO API 실패 시에도 계속 진행 (로그만 남김)
      console.error('REMO API 호출 실패:', error.message);
    }

    return {
      message: '골프 스윙 분석이 시작되었습니다.',
      analysisId: result.analysisId,
      uuid: result.uuid,
    };
  }

  /**
   * 골프 스윙 분석 결과 조회
   * GET /golf-swing/analysis/:id
   */
  @Get('analysis/:id')
  async getAnalysis(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
  ) {
    const userId = req.user.sub;
    return await this.getSwingAnalysisUseCase.execute(userId, analysisId);
  }

  /**
   * 골프 스윙 분석 메모 업데이트
   * PUT /golf-swing/analysis/:id/memo
   */
  @Put('analysis/:id/memo')
  async updateMemo(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
    @Body('memo') memo: string,
  ) {
    const userId = req.user.sub;
    await this.updateSwingMemoUseCase.execute(userId, analysisId, memo);
    return { message: '메모가 업데이트되었습니다.' };
  }
}
