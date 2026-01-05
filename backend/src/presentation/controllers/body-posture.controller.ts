import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Response,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UploadPostureImagesUseCase } from '../../application/use-cases/body-posture/UploadPostureImagesUseCase';
import { GetPostureAnalysisUseCase } from '../../application/use-cases/body-posture/GetPostureAnalysisUseCase';
import { UpdatePostureMemoUseCase } from '../../application/use-cases/body-posture/UpdatePostureMemoUseCase';
import { LocalStorageService } from '../../infrastructure/external-services/local-storage.service';
import { RemoApiService } from '../../infrastructure/external-services/remo-api.service';
import { ISubjectRepository } from '../../application/interfaces/repositories/ISubjectRepository';
import { IBodyPostureAnalysisRepository } from '../../application/interfaces/repositories/IBodyPostureAnalysisRepository';
import { FrontPostureResultEntity } from '../../infrastructure/database/entities/front-posture-result.entity';
import { SidePostureResultEntity } from '../../infrastructure/database/entities/side-posture-result.entity';
import { BackPostureResultEntity } from '../../infrastructure/database/entities/back-posture-result.entity';

@Controller('body-posture')
export class BodyPostureController {
  private readonly logger = new Logger(BodyPostureController.name);

  constructor(
    private readonly uploadPostureImagesUseCase: UploadPostureImagesUseCase,
    private readonly getPostureAnalysisUseCase: GetPostureAnalysisUseCase,
    private readonly updatePostureMemoUseCase: UpdatePostureMemoUseCase,
    private readonly localStorageService: LocalStorageService,
    private readonly remoApiService: RemoApiService,
    @Inject('ISubjectRepository')
    private readonly subjectRepository: ISubjectRepository,
    @Inject('IBodyPostureAnalysisRepository')
    private readonly analysisRepository: IBodyPostureAnalysisRepository,
    @InjectRepository(FrontPostureResultEntity)
    private readonly frontResultRepository: Repository<FrontPostureResultEntity>,
    @InjectRepository(SidePostureResultEntity)
    private readonly sideResultRepository: Repository<SidePostureResultEntity>,
    @InjectRepository(BackPostureResultEntity)
    private readonly backResultRepository: Repository<BackPostureResultEntity>,
  ) {}

  /**
   * REMO API 정면 분석 응답을 FrontPostureResultEntity로 변환
   */
  private parseFrontResult(remoData: any): Partial<FrontPostureResultEntity> {
    return {
      headBalanceValue: remoData.far_head_bal_m_ ?? null,
      headBalanceGrade: remoData.far_head_bal_grade ?? null,
      shoulderBalanceValue: remoData.far_shoulder_bal_m_ ?? null,
      shoulderBalanceGrade: remoData.far_shoulder_bal_grade ?? null,
      pelvicBalanceValue: remoData.far_pelvic_bal_m_ ?? null,
      pelvicBalanceGrade: remoData.far_pelvic_bal_grade ?? null,
      kneeBalanceValue: remoData.far_knee_bal_m_ ?? null,
      kneeBalanceGrade: remoData.far_knee_bal_grade ?? null,
      bodyTiltValue: remoData.far_tilt_m_ ?? null,
      bodyTiltGrade: remoData.far_tilt_grade ?? null,
      leftLegQAngleValue: remoData.far_left_qang_m_ ?? null,
      leftLegQAngleGrade: remoData.far_left_qang_grade ?? null,
      rightLegQAngleValue: remoData.far_right_qang_m_ ?? null,
      rightLegQAngleGrade: remoData.far_right_qang_grade ?? null,
      skeletonCoords: remoData.far_coords ?? null,
    };
  }

  /**
   * REMO API 측면 분석 응답을 SidePostureResultEntity로 변환
   */
  private parseSideResult(remoData: any): Partial<SidePostureResultEntity> {
    return {
      roundShoulderValue: remoData.round_shoulder_m_ ?? null,
      roundShoulderGrade: remoData.round_shoulder_grade ?? null,
      turtleNeckValue: remoData.turtle_neck_m_ ?? null,
      turtleNeckGrade: remoData.turtle_neck_grade ?? null,
      headTiltValue: remoData.sar_head_tilt_m_ ?? null,
      headTiltGrade: remoData.sar_head_tilt_grade ?? null,
      bodyTiltValue: remoData.sar_tilt_m_ ?? null,
      bodyTiltGrade: remoData.sar_tilt_grade ?? null,
      skeletonCoords: remoData.sar_coords ?? null,
    };
  }

  /**
   * REMO API 후면 분석 응답을 BackPostureResultEntity로 변환
   */
  private parseBackResult(remoData: any): Partial<BackPostureResultEntity> {
    return {
      headBalanceValue: remoData.bar_head_bal_m_ ?? null,
      headBalanceGrade: remoData.bar_head_bal_grade ?? null,
      shoulderBalanceValue: remoData.bar_shoulder_bal_m_ ?? null,
      shoulderBalanceGrade: remoData.bar_shoulder_bal_grade ?? null,
      pelvicBalanceValue: remoData.bar_pelvic_bal_m_ ?? null,
      pelvicBalanceGrade: remoData.bar_pelvic_bal_grade ?? null,
      kneeBalanceValue: remoData.bar_knee_bal_m_ ?? null,
      kneeBalanceGrade: remoData.bar_knee_bal_grade ?? null,
      bodyTiltValue: remoData.bar_tilt_m_ ?? null,
      bodyTiltGrade: remoData.bar_tilt_grade ?? null,
      leftLegQAngleValue: remoData.bar_left_qang_m_ ?? null,
      leftLegQAngleGrade: remoData.bar_left_qang_grade ?? null,
      rightLegQAngleValue: remoData.bar_right_qang_m_ ?? null,
      rightLegQAngleGrade: remoData.bar_right_qang_grade ?? null,
      skeletonCoords: remoData.bar_coords ?? null,
    };
  }

  /**
   * 이미지 압축 (REMO API 전송용)
   * - 최대 너비/높이: 1920px
   * - JPEG 품질: 80%
   * - 최대 파일 크기: 약 500KB 목표
   */
  private async compressImage(buffer: Buffer): Promise<Buffer> {
    const originalSize = buffer.length;

    const compressed = await sharp(buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    this.logger.log(
      `이미지 압축: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% 감소)`,
    );

    return compressed;
  }

  /**
   * 신체 자세 이미지 업로드 및 분석 시작
   * POST /body-posture/analyze
   * 4개 이미지 지원: front, leftSide, rightSide, back (1개 이상 필수)
   */
  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'leftSide', maxCount: 1 },
        { name: 'rightSide', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
        },
      },
    ),
  )
  async uploadImages(
    @Request() req,
    @UploadedFiles()
    files: {
      front?: Express.Multer.File[];
      leftSide?: Express.Multer.File[];
      rightSide?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
    @Body('subjectId', ParseIntPipe) subjectId: number,
  ) {
    const userId = req.user.sub;

    // 최소 1개 이상의 이미지가 있어야 함
    if (!files.front && !files.leftSide && !files.rightSide && !files.back) {
      throw new BadRequestException(
        '최소 1개 이상의 이미지가 필요합니다.',
      );
    }

    // 대상자 정보 조회
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new BadRequestException('대상자를 찾을 수 없습니다.');
    }

    // 이미지 압축 (업로드된 이미지만)
    this.logger.log('이미지 압축 시작...');
    const compressedImages: {
      front?: Buffer;
      leftSide?: Buffer;
      rightSide?: Buffer;
      back?: Buffer;
    } = {};

    const compressionPromises: Promise<void>[] = [];

    if (files.front?.[0]) {
      compressionPromises.push(
        this.compressImage(files.front[0].buffer).then(buf => { compressedImages.front = buf; })
      );
    }
    if (files.leftSide?.[0]) {
      compressionPromises.push(
        this.compressImage(files.leftSide[0].buffer).then(buf => { compressedImages.leftSide = buf; })
      );
    }
    if (files.rightSide?.[0]) {
      compressionPromises.push(
        this.compressImage(files.rightSide[0].buffer).then(buf => { compressedImages.rightSide = buf; })
      );
    }
    if (files.back?.[0]) {
      compressionPromises.push(
        this.compressImage(files.back[0].buffer).then(buf => { compressedImages.back = buf; })
      );
    }

    await Promise.all(compressionPromises);
    this.logger.log('이미지 압축 완료');

    // REMO API 호출하여 분석 결과 즉시 획득
    const analysisResults: {
      front?: any;
      leftSide?: any;
      rightSide?: any;
      back?: any;
    } = {};

    try {
      const apiPromises: Promise<void>[] = [];

      // 정면 분석 요청
      if (compressedImages.front) {
        apiPromises.push((async () => {
          this.logger.log('REMO API 정면 분석 요청 중...');
          const response = await this.remoApiService.requestBodyPostureAnalysis(
            compressedImages.front,
            'front',
          );
          analysisResults.front = response.result;
          this.logger.log('정면 분석 완료');
        })());
      }

      // 좌측면 분석 요청 (REMO API 'side' 타입 사용)
      if (compressedImages.leftSide) {
        apiPromises.push((async () => {
          this.logger.log('REMO API 좌측면 분석 요청 중...');
          const response = await this.remoApiService.requestBodyPostureAnalysis(
            compressedImages.leftSide,
            'side',
          );
          analysisResults.leftSide = response.result;
          this.logger.log('좌측면 분석 완료');
        })());
      }

      // 우측면 분석 요청 (REMO API 'side' 타입 사용)
      if (compressedImages.rightSide) {
        apiPromises.push((async () => {
          this.logger.log('REMO API 우측면 분석 요청 중...');
          const response = await this.remoApiService.requestBodyPostureAnalysis(
            compressedImages.rightSide,
            'side',
          );
          analysisResults.rightSide = response.result;
          this.logger.log('우측면 분석 완료');
        })());
      }

      // 후면 분석 요청
      if (compressedImages.back) {
        apiPromises.push((async () => {
          this.logger.log('REMO API 후면 분석 요청 중...');
          const response = await this.remoApiService.requestBodyPostureAnalysis(
            compressedImages.back,
            'back',
          );
          analysisResults.back = response.result;
          this.logger.log('후면 분석 완료');
        })());
      }

      await Promise.all(apiPromises);
      this.logger.log('REMO API 분석 완료');
    } catch (error) {
      this.logger.error('REMO API 호출 실패:', error.message);
      // REMO API 오류 메시지를 그대로 전달 (사람 미감지 등)
      throw new BadRequestException({
        message: error.message || '체형분석 API 호출에 실패했습니다.',
        error: 'REMO API Error',
        statusCode: 400,
      });
    }

    // 분석 레코드 먼저 생성 (이미지 URL은 나중에 업데이트)
    const result = await this.uploadPostureImagesUseCase.execute(
      userId,
      subjectId,
      {
        frontS3Key: '',
        frontUrl: '',
        leftSideS3Key: '',
        leftSideUrl: '',
        rightSideS3Key: '',
        rightSideUrl: '',
        backS3Key: '',
        backUrl: '',
      },
      {
        frontUuid: null,
        leftSideUuid: null,
        rightSideUuid: null,
        backUuid: null,
      },
      {
        frontStatus: analysisResults.front ? 'completed' : 'pending',
        leftSideStatus: analysisResults.leftSide ? 'completed' : 'pending',
        rightSideStatus: analysisResults.rightSide ? 'completed' : 'pending',
        backStatus: analysisResults.back ? 'completed' : 'pending',
      },
    );

    const analysisId = result.analysisId;

    // REMO API 결과 이미지를 로컬에 저장 (영구 보관)
    // REMO API는 forigimg(front), sorigimg(side), borigimg(back) 필드로 이미지를 반환
    this.logger.log('결과 이미지 저장 중...');
    const savedImages = await this.localStorageService.saveResultImages(
      {
        front: analysisResults.front?.forigimg,
        leftSide: analysisResults.leftSide?.sorigimg,
        rightSide: analysisResults.rightSide?.sorigimg,
        back: analysisResults.back?.borigimg,
      },
      userId,
      analysisId,
    );
    this.logger.log('결과 이미지 저장 완료');

    // 분석 레코드에 이미지 URL 업데이트
    await this.analysisRepository.update(analysisId, {
      frontImageUrl: savedImages.front?.filePath || '',
      leftSideImageUrl: savedImages.leftSide?.filePath || '',
      rightSideImageUrl: savedImages.rightSide?.filePath || '',
      backImageUrl: savedImages.back?.filePath || '',
    });

    // 결과를 각 결과 테이블에 저장
    if (analysisResults.front) {
      const frontResultEntity = this.frontResultRepository.create({
        postureAnalysisId: analysisId,
        ...this.parseFrontResult(analysisResults.front),
      });
      await this.frontResultRepository.save(frontResultEntity);
      this.logger.log(`정면 분석 결과 저장 완료 (analysisId: ${analysisId})`);
    }

    // 좌측면 결과 저장 (측면 결과 테이블에 sideType으로 구분)
    if (analysisResults.leftSide) {
      const leftSideResultEntity = this.sideResultRepository.create({
        postureAnalysisId: analysisId,
        sideType: 'left',
        ...this.parseSideResult(analysisResults.leftSide),
      });
      await this.sideResultRepository.save(leftSideResultEntity);
      this.logger.log(`좌측면 분석 결과 저장 완료 (analysisId: ${analysisId})`);
    }

    // 우측면 결과 저장
    if (analysisResults.rightSide) {
      const rightSideResultEntity = this.sideResultRepository.create({
        postureAnalysisId: analysisId,
        sideType: 'right',
        ...this.parseSideResult(analysisResults.rightSide),
      });
      await this.sideResultRepository.save(rightSideResultEntity);
      this.logger.log(`우측면 분석 결과 저장 완료 (analysisId: ${analysisId})`);
    }

    if (analysisResults.back) {
      const backResultEntity = this.backResultRepository.create({
        postureAnalysisId: analysisId,
        ...this.parseBackResult(analysisResults.back),
      });
      await this.backResultRepository.save(backResultEntity);
      this.logger.log(`후면 분석 결과 저장 완료 (analysisId: ${analysisId})`);
    }

    return {
      message: '신체 자세 분석이 완료되었습니다.',
      analysisId: result.analysisId,
      imageUrls: {
        front: savedImages.front?.filePath,
        leftSide: savedImages.leftSide?.filePath,
        rightSide: savedImages.rightSide?.filePath,
        back: savedImages.back?.filePath,
      },
      results: {
        front: analysisResults.front ? { ...analysisResults.front, forigimg: undefined } : undefined,
        leftSide: analysisResults.leftSide ? { ...analysisResults.leftSide, sorigimg: undefined } : undefined,
        rightSide: analysisResults.rightSide ? { ...analysisResults.rightSide, sorigimg: undefined } : undefined,
        back: analysisResults.back ? { ...analysisResults.back, borigimg: undefined } : undefined,
      },
    };
  }

  /**
   * 이미지 파일 제공 API
   * GET /body-posture/images/*
   */
  @Get('images/*')
  async getImage(@Request() req, @Response() res, @Param() params: any) {
    // 와일드카드 경로 추출
    const imagePath = params['0'] || params[0] || '';

    if (!imagePath) {
      throw new NotFoundException('이미지 경로가 필요합니다.');
    }

    const file = await this.localStorageService.getFile(imagePath);
    if (!file) {
      throw new NotFoundException('이미지를 찾을 수 없습니다.');
    }

    res.set({
      'Content-Type': file.mimeType,
      'Cache-Control': 'public, max-age=86400', // 24시간 캐시
    });
    res.send(file.buffer);
  }

  /**
   * 신체 자세 분석 결과 조회
   * GET /body-posture/analysis/:id
   *
   * pending 상태인 경우 REMO API에서 결과를 가져와 저장합니다.
   */
  @Get('analysis/:id')
  @UseGuards(JwtAuthGuard)
  async getAnalysis(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
  ) {
    const userId = req.user.sub;

    // 먼저 분석 레코드 조회
    const analysis = await this.analysisRepository.findWithRelations(analysisId);
    if (!analysis) {
      throw new BadRequestException('분석 결과를 찾을 수 없습니다.');
    }

    // pending 상태인 분석이 있으면 REMO API에서 결과 가져오기
    const hasPending =
      analysis.frontStatus === 'pending' ||
      analysis.leftSideStatus === 'pending' ||
      analysis.rightSideStatus === 'pending' ||
      analysis.backStatus === 'pending';

    if (hasPending) {
      await this.fetchAndSaveRemoResults(analysis);
    }

    // 업데이트된 결과 반환
    return await this.getPostureAnalysisUseCase.execute(userId, analysisId);
  }

  /**
   * REMO API에서 분석 결과를 가져와 DB에 저장
   */
  private async fetchAndSaveRemoResults(analysis: any) {
    const updates: any = {};

    // 정면 분석 결과 가져오기
    if (analysis.frontStatus === 'pending' && analysis.frontUuid) {
      try {
        const frontApiResult = await this.remoApiService.getBodyPostureAnalysisResult(analysis.frontUuid);
        console.log('REMO API 정면 결과:', frontApiResult);

        if (frontApiResult && frontApiResult.state === 1) {
          updates.frontStatus = 'completed';
          // 결과 데이터가 있으면 별도 테이블에 저장 (향후 구현)
        } else if (frontApiResult && frontApiResult.state === -1) {
          updates.frontStatus = 'failed';
        }
      } catch (error) {
        console.error('정면 분석 결과 조회 실패:', error.message);
      }
    }

    // 좌측면 분석 결과 가져오기
    if (analysis.leftSideStatus === 'pending' && analysis.leftSideUuid) {
      try {
        const leftSideApiResult = await this.remoApiService.getBodyPostureAnalysisResult(analysis.leftSideUuid);
        console.log('REMO API 좌측면 결과:', leftSideApiResult);

        if (leftSideApiResult && leftSideApiResult.state === 1) {
          updates.leftSideStatus = 'completed';
        } else if (leftSideApiResult && leftSideApiResult.state === -1) {
          updates.leftSideStatus = 'failed';
        }
      } catch (error) {
        console.error('좌측면 분석 결과 조회 실패:', error.message);
      }
    }

    // 우측면 분석 결과 가져오기
    if (analysis.rightSideStatus === 'pending' && analysis.rightSideUuid) {
      try {
        const rightSideApiResult = await this.remoApiService.getBodyPostureAnalysisResult(analysis.rightSideUuid);
        console.log('REMO API 우측면 결과:', rightSideApiResult);

        if (rightSideApiResult && rightSideApiResult.state === 1) {
          updates.rightSideStatus = 'completed';
        } else if (rightSideApiResult && rightSideApiResult.state === -1) {
          updates.rightSideStatus = 'failed';
        }
      } catch (error) {
        console.error('우측면 분석 결과 조회 실패:', error.message);
      }
    }

    // 후면 분석 결과 가져오기
    if (analysis.backStatus === 'pending' && analysis.backUuid) {
      try {
        const backApiResult = await this.remoApiService.getBodyPostureAnalysisResult(analysis.backUuid);
        console.log('REMO API 후면 결과:', backApiResult);

        if (backApiResult && backApiResult.state === 1) {
          updates.backStatus = 'completed';
        } else if (backApiResult && backApiResult.state === -1) {
          updates.backStatus = 'failed';
        }
      } catch (error) {
        console.error('후면 분석 결과 조회 실패:', error.message);
      }
    }

    // DB 업데이트
    if (Object.keys(updates).length > 0) {
      await this.analysisRepository.update(analysis.id, updates);
      console.log('분석 상태 업데이트:', updates);
    }
  }

  /**
   * 신체 자세 분석 메모 업데이트
   * PUT /body-posture/analysis/:id/memo
   */
  @Put('analysis/:id/memo')
  @UseGuards(JwtAuthGuard)
  async updateMemo(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
    @Body('memo') memo: string,
  ) {
    const userId = req.user.sub;
    await this.updatePostureMemoUseCase.execute(userId, analysisId, memo);
    return { message: '메모가 업데이트되었습니다.' };
  }

  /**
   * 신체 자세 분석 삭제
   * DELETE /body-posture/analysis/:id
   */
  @Delete('analysis/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnalysis(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
  ) {
    const userId = req.user.sub;
    const analysis = await this.analysisRepository.findById(analysisId);

    if (!analysis) {
      throw new BadRequestException('분석을 찾을 수 없습니다.');
    }

    if (analysis.userId !== userId) {
      throw new BadRequestException('이 분석에 대한 권한이 없습니다.');
    }

    // 관련 결과 데이터 삭제
    await this.frontResultRepository.delete({ postureAnalysisId: analysisId });
    await this.sideResultRepository.delete({ postureAnalysisId: analysisId });
    await this.backResultRepository.delete({ postureAnalysisId: analysisId });

    // 분석 레코드 삭제
    await this.analysisRepository.delete(analysisId);

    this.logger.log(`체형 분석 삭제 완료: analysisId=${analysisId}`);
  }
}
