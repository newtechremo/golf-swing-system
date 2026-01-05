import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

/**
 * 골프 스윙 분석 결과 인터페이스
 */
export interface GolfSwingAnalysisResult {
  uuid: string;
  state: number; // 1: success, 0: failure
  message: string;
  waitTime?: number;
  result?: {
    swingSpeed: number; // km/h
    swingPath: string; // 'inside-out', 'outside-in', 'straight'
    clubFaceAngle: number; // degrees
    impactPosition: string;
    backswingAngle: number;
    followThroughAngle: number;
    bodyRotation: number;
    weightShift: {
      backswing: number; // %
      downswing: number; // %
      followThrough: number; // %
    };
  };
  angleData?: any;
  error?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 신체 자세 분석 결과 인터페이스
 */
export interface BodyPostureAnalysisResult {
  uuid: string;
  state: number;
  message: string;
  waitTime?: number;
  viewType: 'front' | 'side' | 'back';
  result?: {
    shoulderAlignment: number; // degrees (0 = balanced)
    hipAlignment: number; // degrees (0 = balanced)
    spineAngle: number; // degrees
    kneeAlignment: number; // degrees
    posturScore: number; // 0-100
    recommendations: string[];
  };
  angleData?: any;
  error?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * REMO API 오류 코드별 한글 메시지 매핑
 */
const REMO_ERROR_MESSAGES: Record<number, string> = {
  // 입력 데이터 문제
  400: '프로토콜 오류가 발생했습니다.',
  411: '입력 데이터가 없습니다.',
  412: '이미지 파일에 오류가 있습니다.',
  413: '정면 이미지 디코딩에 실패했습니다.',
  414: '측면 이미지 디코딩에 실패했습니다.',
  415: '후면 이미지 디코딩에 실패했습니다.',
  418: '사진이 10도 이상 기울어져 있습니다. 수평을 맞춰주세요.',

  // 사용자/인증 문제
  420: '등록되지 않은 사용자입니다.',
  421: 'API 키가 올바르지 않습니다.',
  422: '크레딧이 부족합니다. 관리자에게 문의하세요.',

  // 분석 이슈 - 정면
  511: '정면 사진에서 사람을 인식할 수 없습니다. 전신이 보이도록 다시 촬영해주세요.',
  514: '정면 사진의 촬영 각도가 올바르지 않습니다. 정면을 바라보고 촬영해주세요.',
  517: '정면 사진에서 A자 포즈가 인식되지 않습니다. 팔을 몸 옆에 자연스럽게 내리고 다리를 어깨너비로 벌려주세요.',

  // 분석 이슈 - 측면
  512: '측면 사진에서 사람을 인식할 수 없습니다. 전신이 보이도록 다시 촬영해주세요.',
  515: '측면 사진의 촬영 각도가 올바르지 않습니다. 측면을 바라보고 촬영해주세요.',

  // 분석 이슈 - 후면
  518: '후면 사진에서 사람을 인식할 수 없습니다. 전신이 보이도록 다시 촬영해주세요.',
  522: '후면 사진의 촬영 각도가 올바르지 않습니다. 뒷모습이 정면으로 보이도록 촬영해주세요.',

  // 프로세스 에러
  550: '분석 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  559: '분석 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

@Injectable()
export class RemoApiService {
  private readonly logger = new Logger(RemoApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly userEmail: string;
  private readonly userKey: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('REMO_API_URL', 'http://api.remo.re.kr');
    const apiKey = this.configService.get('REMO_API_KEY');
    const userEmail = this.configService.get('REMO_API_EMAIL');
    const userKey = this.configService.get('REMO_API_USER_KEY');

    if (!apiKey || !userEmail || !userKey) {
      this.logger.warn('REMO API credentials not configured - service will run in mock mode');
      this.apiKey = 'mock-api-key';
      this.userEmail = 'mock@example.com';
      this.userKey = 'mock-user-key';
      return;
    }

    this.apiKey = apiKey;
    this.userEmail = userEmail;
    this.userKey = userKey;
    this.logger.log('REMO API Service initialized');
  }

  /**
   * 골프 스윙 비디오 분석 요청
   * @param videoBuffer - 비디오 파일 버퍼
   * @param uuid - 영상 고유 식별자
   * @param height - 대상자 키 (cm)
   * @returns UUID와 대기 시간
   */
  async requestGolfSwingAnalysis(
    videoBuffer: Buffer,
    uuid: string,
    height: string,
  ): Promise<{ uuid: string; waitTime: number; fileExist: boolean; credit: number }> {
    const endpoint = `${this.baseUrl}/api/analysis-golf`;

    const base64Video = videoBuffer.toString('base64');

    const requestData = {
      base64_video: base64Video,  // 올바른 필드명
      uuid: uuid,
      id: this.userEmail,
      height: height,
      UserKey: this.userKey,
      APIKey: this.apiKey,
    };

    try {
      this.logger.log(`REMO Golf Analysis Request: ${endpoint}, uuid: ${uuid}, video size: ${videoBuffer.length} bytes`);
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      if (data.state !== 1 && data.state !== true) {
        throw new Error(`Golf swing analysis request failed: ${data.message || 'Unknown error'} (status: ${data.status})`);
      }

      this.logger.log(`Golf swing analysis requested: ${data.uuid}, wait time: ${data.wait_time}s`);

      return {
        uuid: data.uuid,
        waitTime: data.wait_time,
        fileExist: data.file_exist || false,
        credit: data.credit || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to request golf swing analysis: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 신체 자세 이미지 분석 요청 (정면/측면/후면) - 결과 즉시 반환
   * @param imageBuffer - 이미지 파일 버퍼
   * @param viewType - 촬영 방향 (front, side, back)
   * @returns 분석 결과
   */
  async requestBodyPostureAnalysis(
    imageBuffer: Buffer,
    viewType: 'front' | 'side' | 'back',
  ): Promise<{ result: any }> {
    // viewType에 따른 엔드포인트 및 이미지 필드명 선택
    const config = {
      front: {
        endpoint: `${this.baseUrl}/api/analysis-skeleton-v2-front`,
        imageField: 'forigimg',
      },
      side: {
        endpoint: `${this.baseUrl}/api/analysis-skeleton-v2-side`,
        imageField: 'sorigimg',
      },
      back: {
        endpoint: `${this.baseUrl}/api/analysis-skeleton-v2-back`,
        imageField: 'borigimg',
      },
    };

    const { endpoint, imageField } = config[viewType];
    const base64Image = imageBuffer.toString('base64');

    const requestData = {
      Email: this.userEmail,
      UserKey: this.userKey,
      APIKey: this.apiKey,
      [imageField]: base64Image,
    };

    try {
      this.logger.log(`REMO API ${viewType} 분석 요청: ${endpoint}`);
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      const statusCode = data.status || data.code || 0;
      this.logger.log(`REMO API ${viewType} 분석 응답: state=${data.state}, status=${statusCode}, message=${data.message || data.msg || 'none'}`);

      if (!data.state) {
        // REMO API 오류 코드에 해당하는 한글 메시지 사용
        const koreanMessage = REMO_ERROR_MESSAGES[statusCode];
        const originalMessage = data.message || data.msg || data.error || 'Unknown error';
        const errorMessage = koreanMessage || originalMessage;
        this.logger.error(`REMO API ${viewType} 분석 실패 (${statusCode}): ${originalMessage} -> ${errorMessage}`);
        throw new Error(errorMessage);
      }

      return {
        result: data,
      };
    } catch (error) {
      this.logger.error(`Failed to request body posture analysis (${viewType}): ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 골프 스윙 분석 결과 조회
   * @param uuid - 분석 UUID
   * @returns 분석 결과 (Address, Takeback, Backswing, Backswingtop, Downswing, Impact, Follow, Finish)
   */
  async getGolfSwingAnalysisResult(uuid: string): Promise<any> {
    const endpoint = `${this.baseUrl}/api/analysis-golf-result`;
    const requestData = {
      id: this.userEmail,
      uuid: uuid,
    };

    try {
      this.logger.log(`REMO Golf Result Request: ${endpoint}, uuid: ${uuid}`);
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      this.logger.log(`Golf swing analysis result retrieved: ${uuid}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get golf swing analysis result: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 신체 자세 분석 결과 조회
   * @param uuid - 분석 UUID
   * @returns 분석 결과
   */
  async getBodyPostureAnalysisResult(uuid: string): Promise<any> {
    const endpoint = `${this.baseUrl}/api/analysis-walking-result`;
    const requestData = {
      id: this.userEmail,
      uuid: uuid,
      UserKey: this.userKey,
      APIKey: this.apiKey,
    };

    try {
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      this.logger.log(`Body posture analysis result retrieved: ${uuid}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get body posture analysis result: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 골프 스윙 각도 데이터 조회
   * @param uuid - 분석 UUID
   * @returns 각도 데이터 (KneeLine, Pelvis, ShoulderLine)
   */
  async getGolfSwingAngleData(uuid: string): Promise<any> {
    const endpoint = `${this.baseUrl}/api/analysis-golf-angle`;
    const requestData = {
      id: this.userEmail,
      uuid: uuid,
    };

    try {
      this.logger.log(`REMO Golf Angle Request: ${endpoint}, uuid: ${uuid}`);
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      this.logger.log(`Golf swing angle data retrieved: ${uuid}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get golf swing angle data: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 골프 스윙 분석 결과 비디오 조회
   * @param uuid - 분석 UUID
   * @returns base64 인코딩된 결과 비디오
   */
  async getGolfSwingDrawVideo(uuid: string): Promise<{ base64Video: string }> {
    const endpoint = `${this.baseUrl}/api/analysis-golf-draw`;
    const requestData = {
      id: this.userEmail,
      uuid: uuid,
    };

    try {
      this.logger.log(`REMO Golf Draw Video Request: ${endpoint}, uuid: ${uuid}`);
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      this.logger.log(`Golf swing draw video retrieved: ${uuid}`);
      return {
        base64Video: data.base64_video,
      };
    } catch (error) {
      this.logger.error(`Failed to get golf swing draw video: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 골프 스윙 구간별 이미지 조회
   * @param uuid - 분석 UUID
   * @returns 8단계 구간 이미지 (base64)
   */
  async getGolfSwingImages(uuid: string): Promise<{
    address: string | null;
    takeback: string | null;
    backswing: string | null;
    backswingtop: string | null;
    downswing: string | null;
    impact: string | null;
    follow: string | null;
    finish: string | null;
  }> {
    const endpoint = `${this.baseUrl}/api/analysis-golf-images`;
    const requestData = {
      id: this.userEmail,
      uuid: uuid,
    };

    try {
      this.logger.log(`REMO Golf Images Request: ${endpoint}, uuid: ${uuid}`);
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      this.logger.log(`Golf swing images retrieved: ${uuid}`);
      return {
        address: data.address || null,
        takeback: data.takeback || null,
        backswing: data.backswing || null,
        backswingtop: data.backswingtop || null,
        downswing: data.downswing || null,
        impact: data.impact || null,
        follow: data.follow || null,
        finish: data.finish || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get golf swing images: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 신체 자세 각도 데이터 조회
   * @param uuid - 분석 UUID
   * @param joint - 관절 (Hip, Knee, Ankle, Shoulder, Spine)
   * @returns 각도 데이터
   */
  async getBodyPostureAngleData(uuid: string, joint: string = 'Hip'): Promise<any> {
    const endpoint = `${this.baseUrl}/api/analysis-FreeMotion-angle`;
    const requestData = {
      id: this.userEmail,
      uuid: uuid,
      joint: joint,
      UserKey: this.userKey,
      APIKey: this.apiKey,
    };

    try {
      const response = await this.makeRequestWithRetry('POST', endpoint, requestData);
      const data = response.data;

      this.logger.log(`Body posture angle data retrieved: ${uuid} for ${joint}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get body posture angle data: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 완전한 골프 스윙 분석 결과 조회 (결과 + 각도 데이터)
   * @param uuid - 분석 UUID
   * @returns 통합 분석 결과
   */
  async getCompleteGolfSwingAnalysis(uuid: string): Promise<GolfSwingAnalysisResult> {
    try {
      const result = await this.getGolfSwingAnalysisResult(uuid);
      const angleData = await this.getGolfSwingAngleData(uuid);

      return {
        uuid,
        state: result.state,
        message: result.message,
        result: result.result,
        angleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get complete golf swing analysis: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * 완전한 신체 자세 분석 결과 조회 (결과 + 각도 데이터)
   * @param uuid - 분석 UUID
   * @param joint - 관절
   * @param viewType - 촬영 방향
   * @returns 통합 분석 결과
   */
  async getCompleteBodyPostureAnalysis(
    uuid: string,
    joint: string = 'Hip',
    viewType: 'front' | 'side' | 'back' = 'front',
  ): Promise<BodyPostureAnalysisResult> {
    try {
      const result = await this.getBodyPostureAnalysisResult(uuid);
      const angleData = await this.getBodyPostureAngleData(uuid, joint);

      return {
        uuid,
        state: result.state,
        message: result.message,
        viewType,
        result: result.result,
        angleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get complete body posture analysis: ${error.message}`, error.stack);
      throw this.handleApiError(error);
    }
  }

  /**
   * HTTP 요청 재시도 로직
   */
  private async makeRequestWithRetry(
    method: 'GET' | 'POST',
    url: string,
    data?: any,
    attempt = 1,
  ): Promise<AxiosResponse> {
    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      if (method === 'GET') {
        return await axios.get(url, { headers });
      } else {
        return await axios.post(url, data, { headers });
      }
    } catch (error) {
      if (this.shouldRetry(error) && attempt < this.maxRetries) {
        this.logger.warn(`Request failed, retrying (${attempt}/${this.maxRetries}): ${error.message}`);
        await this.delay(this.retryDelay * attempt);
        return this.makeRequestWithRetry(method, url, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 재시도 여부 판단
   */
  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true; // Network errors
    }

    const status = error.response.status;
    return status >= 500 && status <= 599; // Server errors
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * API 에러 핸들링
   */
  private handleApiError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      // 전체 응답 데이터 로깅
      this.logger.error(`REMO API Response Data: ${JSON.stringify(data)}`);
      const message = data?.message || data?.msg || JSON.stringify(data) || 'Unknown API error';
      return new Error(`REMO API Error (${status}): ${message}`);
    }
    return new Error(`REMO API Error: ${error.message}`);
  }
}
