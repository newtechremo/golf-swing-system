import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3UploadService {
  private readonly logger = new Logger(S3UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('AWS_REGION');
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET') || 'sppb-private';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`S3 Client initialized for bucket: ${this.bucketName}`);
  }

  /**
   * 파일을 S3에 업로드
   * @param file - 업로드할 파일 (Multer File)
   * @param folder - S3 폴더 경로 (예: golf-swing, posture)
   * @param userId - 사용자 ID
   * @returns S3 Key와 URL
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ): Promise<{ s3Key: string; url: string }> {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const s3Key = `${folder}/${userId}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${s3Key}`;

      this.logger.log(`File uploaded to S3: ${s3Key}`);

      return { s3Key, url };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw new Error('S3 파일 업로드 실패');
    }
  }

  /**
   * 비디오 파일을 S3에 업로드
   */
  async uploadVideoFile(
    file: Express.Multer.File,
    userId: number,
  ): Promise<{ s3Key: string; url: string }> {
    return this.uploadFile(file, 'golf-swing', userId);
  }

  /**
   * 이미지 파일을 S3에 업로드
   */
  async uploadImageFile(
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ): Promise<{ s3Key: string; url: string }> {
    return this.uploadFile(file, folder, userId);
  }

  /**
   * Buffer를 S3에 업로드
   * @param buffer - 업로드할 Buffer
   * @param s3Key - S3 키 (전체 경로)
   * @param contentType - 콘텐츠 타입 (예: video/mp4, image/jpeg)
   * @returns S3 Key와 URL
   */
  async uploadBuffer(
    buffer: Buffer,
    s3Key: string,
    contentType: string,
  ): Promise<{ s3Key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${s3Key}`;

      this.logger.log(`Buffer uploaded to S3: ${s3Key}`);

      return { s3Key, url };
    } catch (error) {
      this.logger.error(`Failed to upload buffer to S3: ${error.message}`, error.stack);
      throw new Error('S3 버퍼 업로드 실패');
    }
  }

  /**
   * 신체 자세 이미지들을 S3에 업로드
   */
  async uploadPostureImages(
    files: {
      front: Express.Multer.File;
      side: Express.Multer.File;
      back: Express.Multer.File;
    },
    userId: number,
  ): Promise<{
    front: { s3Key: string; url: string };
    side: { s3Key: string; url: string };
    back: { s3Key: string; url: string };
  }> {
    const [frontResult, sideResult, backResult] = await Promise.all([
      this.uploadImageFile(files.front, 'posture', userId),
      this.uploadImageFile(files.side, 'posture', userId),
      this.uploadImageFile(files.back, 'posture', userId),
    ]);

    return {
      front: frontResult,
      side: sideResult,
      back: backResult,
    };
  }

  /**
   * S3 객체에 대한 Presigned URL 생성 (1시간 유효)
   * @param s3Key - S3 객체 키
   * @param expiresIn - URL 유효 시간 (초 단위, 기본값 1시간)
   * @returns Presigned URL
   */
  async getPresignedUrl(s3Key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${s3Key}: ${error.message}`,
        error.stack,
      );
      throw new Error('Presigned URL 생성 실패');
    }
  }

  /**
   * 여러 S3 키에 대한 Presigned URL을 일괄 생성
   * @param s3Keys - S3 객체 키 배열
   * @param expiresIn - URL 유효 시간 (초 단위)
   * @returns S3 키를 키로, Presigned URL을 값으로 하는 객체
   */
  async getPresignedUrls(
    s3Keys: string[],
    expiresIn = 3600,
  ): Promise<Record<string, string>> {
    const urlPromises = s3Keys.map(async (key) => {
      const url = await this.getPresignedUrl(key, expiresIn);
      return { key, url };
    });

    const results = await Promise.all(urlPromises);
    return results.reduce(
      (acc, { key, url }) => {
        acc[key] = url;
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
