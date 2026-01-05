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
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UploadSwingVideoUseCase } from '../../application/use-cases/golf-swing/UploadSwingVideoUseCase';
import { GetSwingAnalysisUseCase } from '../../application/use-cases/golf-swing/GetSwingAnalysisUseCase';
import { UpdateSwingMemoUseCase } from '../../application/use-cases/golf-swing/UpdateSwingMemoUseCase';
import { IGolfSwingAnalysisRepository } from '../../application/interfaces/repositories/IGolfSwingAnalysisRepository';
import { GolfSwingResultEntity } from '../../infrastructure/database/entities/golf-swing-result.entity';
import { GolfSwingAngleEntity } from '../../infrastructure/database/entities/golf-swing-angle.entity';
import { S3UploadService } from '../../infrastructure/external-services/s3-upload.service';
import { RemoApiService } from '../../infrastructure/external-services/remo-api.service';
import { GolfSwingScoreService } from '../../infrastructure/services/golf-swing-score.service';

@Controller('golf-swing')
@UseGuards(JwtAuthGuard)
export class GolfSwingController {
  private readonly logger = new Logger(GolfSwingController.name);

  constructor(
    private readonly uploadSwingVideoUseCase: UploadSwingVideoUseCase,
    private readonly getSwingAnalysisUseCase: GetSwingAnalysisUseCase,
    private readonly updateSwingMemoUseCase: UpdateSwingMemoUseCase,
    private readonly s3UploadService: S3UploadService,
    private readonly remoApiService: RemoApiService,
    private readonly golfSwingScoreService: GolfSwingScoreService,
    @Inject('IGolfSwingAnalysisRepository')
    private readonly analysisRepository: IGolfSwingAnalysisRepository,
    @InjectRepository(GolfSwingResultEntity)
    private readonly resultRepository: Repository<GolfSwingResultEntity>,
    @InjectRepository(GolfSwingAngleEntity)
    private readonly angleRepository: Repository<GolfSwingAngleEntity>,
  ) {}

  /**
   * 골프 스윙 비디오 업로드 및 분석 시작
   * POST /golf-swing/analyze
   */
  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB for video
      },
    }),
  )
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
      this.logger.log(`REMO API 골프 분석 요청: uuid=${result.uuid}, video size=${file.buffer.length} bytes`);

      const remoResult = await this.remoApiService.requestGolfSwingAnalysis(
        file.buffer,   // Video buffer (base64 encoding용)
        result.uuid,   // 우리가 생성한 UUID
        height || '175',
      );

      // 분석 요청 성공 - 상태를 processing으로 업데이트
      await this.analysisRepository.update(result.analysisId, {
        status: 'processing',
        waitTime: remoResult.waitTime,
        creditUsed: remoResult.credit,
      });

      this.logger.log(`REMO API 분석 요청 성공: uuid=${result.uuid}, waitTime=${remoResult.waitTime}s`);
    } catch (error) {
      // REMO API 실패 시 상태를 failed로 업데이트
      this.logger.error('REMO API 호출 실패:', error.message);
      await this.analysisRepository.update(result.analysisId, {
        status: 'failed',
      });
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

  /**
   * REMO API에서 분석 결과를 가져와 저장
   * POST /golf-swing/analysis/:id/refresh
   */
  @Post('analysis/:id/refresh')
  async refreshAnalysisResult(
    @Request() req,
    @Param('id', ParseIntPipe) analysisId: number,
  ) {
    const userId = req.user.sub;

    // 분석 정보 조회
    const analysis = await this.analysisRepository.findById(analysisId);

    if (!analysis) {
      throw new BadRequestException('분석을 찾을 수 없습니다.');
    }

    if (analysis.userId !== userId) {
      throw new BadRequestException('이 분석에 대한 권한이 없습니다.');
    }

    if (analysis.status === 'completed') {
      return { message: '이미 완료된 분석입니다.', status: 'completed' };
    }

    try {
      this.logger.log(`REMO API 결과 조회 시작: uuid=${analysis.uuid}`);

      // 1. REMO API에서 분석 결과 조회
      const remoResult = await this.remoApiService.getGolfSwingAnalysisResult(analysis.uuid);
      this.logger.log(`REMO API 결과 응답: ${JSON.stringify(remoResult).substring(0, 500)}`);

      // REMO API 응답에서 에러 상태 확인
      if (remoResult.status === 534) {
        // 분석 중 또는 로그 파일 미생성
        return { message: '분석이 진행 중입니다.', status: 'processing' };
      }

      if (remoResult.status === 533 || !remoResult.address) {
        return { message: '아직 결과가 준비되지 않았습니다.', status: 'processing' };
      }

      // 2. 각도 데이터 조회
      let angleData = null;
      try {
        angleData = await this.remoApiService.getGolfSwingAngleData(analysis.uuid);
        this.logger.log(`REMO API 각도 데이터: KneeLine ${angleData.KneeLine?.length || 0} frames`);
      } catch (err) {
        this.logger.warn(`각도 데이터 조회 실패: ${err.message}`);
      }

      // 3. 결과 비디오 조회 및 S3 업로드
      let resultVideoUrl = null;
      let resultVideoS3Key = null;
      try {
        const drawVideo = await this.remoApiService.getGolfSwingDrawVideo(analysis.uuid);
        if (drawVideo.base64Video) {
          const videoBuffer = Buffer.from(drawVideo.base64Video, 'base64');
          const uploaded = await this.s3UploadService.uploadBuffer(
            videoBuffer,
            `golf-results/${userId}/${analysis.uuid}-result.mp4`,
            'video/mp4',
          );
          resultVideoUrl = uploaded.url;
          resultVideoS3Key = uploaded.s3Key;
          this.logger.log(`결과 비디오 S3 업로드 완료: ${resultVideoUrl}`);
        }
      } catch (err) {
        this.logger.warn(`결과 비디오 조회 실패: ${err.message}`);
      }

      // 4. 분석 결과 DB에 저장 (GolfSwingResultEntity) - 점수 포함
      const resultEntity = await this.saveSwingResult(analysisId, remoResult);
      this.logger.log(`분석 결과 저장 완료: id=${resultEntity.id}, totalScore=${resultEntity.totalScore}`);

      // 5. 각도 데이터 DB에 저장 (GolfSwingAngleEntity)
      if (angleData) {
        await this.saveAngleData(analysisId, angleData);
        this.logger.log(`각도 데이터 저장 완료`);
      }

      // 6. 분석 상태 업데이트
      await this.analysisRepository.update(analysisId, {
        status: 'completed',
        resultVideoUrl,
        resultVideoS3Key,
      });

      this.logger.log(`분석 완료 처리: analysisId=${analysisId}`);

      return {
        message: '분석 결과가 성공적으로 저장되었습니다.',
        status: 'completed',
        resultVideoUrl,
        totalScore: resultEntity.totalScore,
      };
    } catch (error) {
      this.logger.error(`REMO API 결과 조회 실패: ${error.message}`, error.stack);

      // 특정 에러 코드 처리
      if (error.message.includes('534') || error.message.includes('분석 중')) {
        return { message: '분석이 진행 중입니다.', status: 'processing' };
      }

      throw new BadRequestException(`결과 조회 실패: ${error.message}`);
    }
  }

  /**
   * 분석 결과를 DB에 저장 (REMO API 응답 필드 매핑 + 점수 계산)
   */
  private async saveSwingResult(analysisId: number, remoResult: any): Promise<GolfSwingResultEntity> {
    // 기존 결과가 있으면 삭제
    await this.resultRepository.delete({ analysisId });

    // 점수 계산
    const scoreData = this.golfSwingScoreService.createScoreEntityData(remoResult);

    const result = this.resultRepository.create({
      analysisId,

      // ========================================
      // Address Phase (어드레스)
      // ========================================
      addressFrame: remoResult.address?.frame,
      addressStance: remoResult.address?.stance,
      addressUpperBodyTilt: remoResult.address?.upper_body_tilt,
      addressShoulderTilt: remoResult.address?.shoulder_tilt,
      addressHeadLocation: remoResult.address?.head_location,
      addressLeftFootFix: remoResult.address?.left_foot_fix,

      // ========================================
      // Takeback Phase (테이크백)
      // ========================================
      takebackFrame: remoResult.takeback?.frame,
      takebackLeftShoulderRotation: remoResult.takeback?.left_shoulder_rotation,
      takebackRightHipRotation: remoResult.takeback?.right_hip_rotation,
      takebackLeftArmFlexion: remoResult.takeback?.left_arm_flexion,
      takebackRightArmFlexion: remoResult.takeback?.right_arm_flexion,

      // ========================================
      // Backswing Phase (백스윙)
      // ========================================
      backswingFrame: remoResult.backswing?.frame,
      backswingHeadLocation: remoResult.backswing?.head_location,
      backswingLeftShoulderRotation: remoResult.backswing?.left_shoulder_rotation,
      backswingLeftArmFlexion: remoResult.backswing?.left_arm_flexion,

      // ========================================
      // Backswing Top Phase (백스윙탑)
      // ========================================
      backswingTopFrame: remoResult.backswingtop?.frame,
      backswingTopReverseSpine: remoResult.backswingtop?.reverse_spine,
      backswingTopRightHipRotation: remoResult.backswingtop?.right_hip_rotation,
      backswingTopRightLegFlexion: remoResult.backswingtop?.right_leg_flexion,
      backswingTopHeadLocation: remoResult.backswingtop?.head_location,
      backswingTopCenterOfGravity: remoResult.backswingtop?.center_of_gravity,

      // ========================================
      // Downswing Phase (다운스윙)
      // ========================================
      downswingFrame: remoResult.downswing?.frame,
      downswingCenterOfGravity: remoResult.downswing?.center_of_gravity,
      downswingRightElbowLocation: remoResult.downswing?.right_elbow_location,
      downswingRightArmRotation: remoResult.downswing?.right_arm_rotation,

      // ========================================
      // Impact Phase (임팩트)
      // ========================================
      impactFrame: remoResult.impact?.frame,
      impactHeadLocation: remoResult.impact?.head_location,
      impactLeftArmFlexion: remoResult.impact?.left_arm_flexion,
      impactRightArmFlexion: remoResult.impact?.right_arm_flexion,
      impactHangingBack: remoResult.impact?.hanging_back,

      // ========================================
      // Follow-through Phase (팔로우스루)
      // ========================================
      followFrame: remoResult.follow?.frame,
      followLeftLineAlign: remoResult.follow?.left_line_align,
      followChickenWing: remoResult.follow?.chicken_wing,
      followCenterOfGravity: remoResult.follow?.center_of_gravity,

      // ========================================
      // Finish Phase (피니시)
      // ========================================
      finishFrame: remoResult.finish?.frame,
      finishCenterOfGravity: remoResult.finish?.center_of_gravity,
      finishRightFootRotation: remoResult.finish?.right_foot_rotation,
      finishLeftFootFix: remoResult.finish?.left_foot_fix,

      // ========================================
      // 점수 및 멘트 데이터
      // ========================================
      ...scoreData,
    });

    return await this.resultRepository.save(result);
  }

  /**
   * 각도 데이터를 DB에 저장
   */
  private async saveAngleData(analysisId: number, angleData: any): Promise<GolfSwingAngleEntity> {
    // 기존 데이터가 있으면 삭제
    await this.angleRepository.delete({ analysisId });

    const angle = this.angleRepository.create({
      analysisId,
      kneeLineData: angleData.KneeLine || [],
      pelvisData: angleData.Pelvis || [],
      shoulderLineData: angleData.ShoulderLine || [],
    });

    return await this.angleRepository.save(angle);
  }

  /**
   * 결과 비디오 URL 조회 (Presigned URL 사용)
   * GET /golf-swing/analysis/:id/video
   */
  @Get('analysis/:id/video')
  async getResultVideo(
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

    // S3 Presigned URL 생성 (1시간 유효)
    let videoPresignedUrl: string | null = null;
    let resultVideoPresignedUrl: string | null = null;

    if (analysis.videoS3Key) {
      try {
        videoPresignedUrl = await this.s3UploadService.getPresignedUrl(analysis.videoS3Key, 3600);
      } catch (err) {
        this.logger.warn(`Failed to generate presigned URL for video: ${err.message}`);
        videoPresignedUrl = analysis.videoUrl;
      }
    }

    if (analysis.resultVideoS3Key) {
      try {
        resultVideoPresignedUrl = await this.s3UploadService.getPresignedUrl(analysis.resultVideoS3Key, 3600);
      } catch (err) {
        this.logger.warn(`Failed to generate presigned URL for result video: ${err.message}`);
        resultVideoPresignedUrl = analysis.resultVideoUrl;
      }
    }

    return {
      videoUrl: videoPresignedUrl || analysis.videoUrl,
      resultVideoUrl: resultVideoPresignedUrl || analysis.resultVideoUrl,
    };
  }

  /**
   * 구간별 이미지 조회 (REMO API에서 직접 가져옴)
   * GET /golf-swing/analysis/:id/images
   */
  @Get('analysis/:id/images')
  async getSwingImages(
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

    if (analysis.status !== 'completed') {
      throw new BadRequestException('분석이 완료되지 않았습니다.');
    }

    try {
      const images = await this.remoApiService.getGolfSwingImages(analysis.uuid);
      return images;
    } catch (error) {
      this.logger.error(`구간 이미지 조회 실패: ${error.message}`);
      throw new BadRequestException(`이미지 조회 실패: ${error.message}`);
    }
  }

  /**
   * 골프 스윙 분석 삭제
   * DELETE /golf-swing/analysis/:id
   */
  @Delete('analysis/:id')
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

    // 관련 데이터 삭제 (CASCADE로 자동 삭제되지 않는 경우를 대비)
    await this.resultRepository.delete({ analysisId });
    await this.angleRepository.delete({ analysisId });

    // 분석 레코드 삭제
    await this.analysisRepository.delete(analysisId);

    this.logger.log(`골프 스윙 분석 삭제 완료: analysisId=${analysisId}`);
  }
}
