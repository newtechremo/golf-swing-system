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

@Controller('golf-swing')
@UseGuards(JwtAuthGuard)
export class GolfSwingController {
  constructor(
    private readonly uploadSwingVideoUseCase: UploadSwingVideoUseCase,
    private readonly getSwingAnalysisUseCase: GetSwingAnalysisUseCase,
    private readonly updateSwingMemoUseCase: UpdateSwingMemoUseCase,
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
    @Body('height') height?: string,
  ) {
    const userId = req.user.sub;

    if (!file) {
      throw new BadRequestException('비디오 파일이 필요합니다.');
    }

    // TODO: S3에 파일 업로드 후 URL과 Key 받아오기
    // 지금은 임시로 로컬 경로 사용
    const videoS3Key = `golf-swing/${userId}/${Date.now()}-${file.originalname}`;
    const videoUrl = `https://s3.amazonaws.com/bucket/${videoS3Key}`;

    const result = await this.uploadSwingVideoUseCase.execute(
      userId,
      subjectId,
      videoS3Key,
      videoUrl,
      height,
    );

    // TODO: REMO API 호출하여 분석 시작

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
