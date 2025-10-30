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
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UploadPostureImagesUseCase } from '../../application/use-cases/body-posture/UploadPostureImagesUseCase';
import { GetPostureAnalysisUseCase } from '../../application/use-cases/body-posture/GetPostureAnalysisUseCase';
import { UpdatePostureMemoUseCase } from '../../application/use-cases/body-posture/UpdatePostureMemoUseCase';

@Controller('body-posture')
@UseGuards(JwtAuthGuard)
export class BodyPostureController {
  constructor(
    private readonly uploadPostureImagesUseCase: UploadPostureImagesUseCase,
    private readonly getPostureAnalysisUseCase: GetPostureAnalysisUseCase,
    private readonly updatePostureMemoUseCase: UpdatePostureMemoUseCase,
  ) {}

  /**
   * 신체 자세 이미지 업로드 및 분석 시작
   * POST /body-posture/analyze
   */
  @Post('analyze')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'side', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]),
  )
  async uploadImages(
    @Request() req,
    @UploadedFiles()
    files: {
      front?: Express.Multer.File[];
      side?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
    @Body('subjectId', ParseIntPipe) subjectId: number,
  ) {
    const userId = req.user.sub;

    if (!files.front || !files.side || !files.back) {
      throw new BadRequestException(
        '정면, 측면, 후면 이미지가 모두 필요합니다.',
      );
    }

    // TODO: S3에 파일 업로드 후 URL과 Key 받아오기
    const frontFile = files.front[0];
    const sideFile = files.side[0];
    const backFile = files.back[0];

    const frontS3Key = `posture/${userId}/${Date.now()}-front-${frontFile.originalname}`;
    const sideS3Key = `posture/${userId}/${Date.now()}-side-${sideFile.originalname}`;
    const backS3Key = `posture/${userId}/${Date.now()}-back-${backFile.originalname}`;

    const frontUrl = `https://s3.amazonaws.com/bucket/${frontS3Key}`;
    const sideUrl = `https://s3.amazonaws.com/bucket/${sideS3Key}`;
    const backUrl = `https://s3.amazonaws.com/bucket/${backS3Key}`;

    const result = await this.uploadPostureImagesUseCase.execute(
      userId,
      subjectId,
      {
        frontS3Key,
        frontUrl,
        sideS3Key,
        sideUrl,
        backS3Key,
        backUrl,
      },
    );

    // TODO: REMO API 호출하여 분석 시작

    return {
      message: '신체 자세 분석이 시작되었습니다.',
      analysisId: result.analysisId,
      uuids: result.uuids,
    };
  }

  /**
   * 신체 자세 분석 결과 조회
   * GET /body-posture/analysis/:id
   */
  @Get('analysis/:id')
  async getAnalysis(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
  ) {
    const userId = req.user.sub;
    return await this.getPostureAnalysisUseCase.execute(userId, analysisId);
  }

  /**
   * 신체 자세 분석 메모 업데이트
   * PUT /body-posture/analysis/:id/memo
   */
  @Put('analysis/:id/memo')
  async updateMemo(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
    @Body('memo') memo: string,
  ) {
    const userId = req.user.sub;
    await this.updatePostureMemoUseCase.execute(userId, analysisId, memo);
    return { message: '메모가 업데이트되었습니다.' };
  }
}
