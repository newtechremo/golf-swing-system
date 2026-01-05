import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly resultsDir: string; // 결과 이미지 폴더 (영구 보관)
  private readonly maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)

  constructor() {
    // 프로젝트 루트의 uploads 디렉토리 사용
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.resultsDir = path.join(process.cwd(), 'results'); // 결과 이미지는 별도 폴더
    this.ensureDirectoryExists(this.uploadDir);
    this.ensureDirectoryExists(this.resultsDir);
    this.logger.log(`Local storage initialized - uploads: ${this.uploadDir}, results: ${this.resultsDir}`);
  }

  /**
   * 디렉토리가 없으면 생성
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }

  /**
   * 파일을 로컬에 저장
   * @param file - 업로드할 파일 (Multer File)
   * @param folder - 폴더 경로 (예: posture, golf-swing)
   * @param userId - 사용자 ID
   * @returns 저장된 파일 경로
   */
  async saveFile(
    file: Express.Multer.File,
    folder: string,
    userId: number,
  ): Promise<{ filePath: string; fileName: string }> {
    const userDir = path.join(this.uploadDir, folder, String(userId));
    this.ensureDirectoryExists(userDir);

    const timestamp = Date.now();
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${safeFileName}`;
    const filePath = path.join(userDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    // 상대 경로 반환 (API 엔드포인트용)
    const relativePath = path.join(folder, String(userId), fileName);

    this.logger.log(`File saved: ${relativePath}`);

    return {
      filePath: relativePath,
      fileName,
    };
  }

  /**
   * Buffer를 파일로 저장 (압축된 이미지용)
   */
  async saveBuffer(
    buffer: Buffer,
    folder: string,
    userId: number,
    fileName: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const userDir = path.join(this.uploadDir, folder, String(userId));
    this.ensureDirectoryExists(userDir);

    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFileName = `${timestamp}-${safeFileName}`;
    const absolutePath = path.join(userDir, finalFileName);

    await fs.promises.writeFile(absolutePath, buffer);

    // 상대 경로 반환
    const relativePath = path.join(folder, String(userId), finalFileName);

    this.logger.log(`Buffer saved: ${relativePath}`);

    return {
      filePath: relativePath,
      fileName: finalFileName,
    };
  }

  /**
   * 신체 자세 이미지들을 저장 (원본 - 7일 후 삭제됨)
   */
  async savePostureImages(
    files: {
      front: { buffer: Buffer; originalname: string };
      side: { buffer: Buffer; originalname: string };
      back: { buffer: Buffer; originalname: string };
    },
    userId: number,
  ): Promise<{
    front: { filePath: string; fileName: string };
    side: { filePath: string; fileName: string };
    back: { filePath: string; fileName: string };
  }> {
    const [frontResult, sideResult, backResult] = await Promise.all([
      this.saveBuffer(files.front.buffer, 'posture', userId, `front-${files.front.originalname}`),
      this.saveBuffer(files.side.buffer, 'posture', userId, `side-${files.side.originalname}`),
      this.saveBuffer(files.back.buffer, 'posture', userId, `back-${files.back.originalname}`),
    ]);

    return {
      front: frontResult,
      side: sideResult,
      back: backResult,
    };
  }

  /**
   * 분석 결과 이미지를 저장 (영구 보관)
   * @param base64Data - Base64 인코딩된 이미지 데이터
   * @param folder - 폴더 경로 (예: posture)
   * @param userId - 사용자 ID
   * @param analysisId - 분석 ID
   * @param imageType - 이미지 타입 (front, side, back)
   */
  async saveResultImage(
    base64Data: string,
    folder: string,
    userId: number,
    analysisId: number,
    imageType: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const userDir = path.join(this.resultsDir, folder, String(userId));
    this.ensureDirectoryExists(userDir);

    // Base64 데이터에서 헤더 제거 (data:image/jpeg;base64, 등)
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    const fileName = `analysis-${analysisId}-${imageType}.jpg`;
    const absolutePath = path.join(userDir, fileName);

    await fs.promises.writeFile(absolutePath, buffer);

    // 상대 경로 반환 (results/ 접두사 포함)
    const relativePath = path.join('results', folder, String(userId), fileName);

    this.logger.log(`Result image saved: ${relativePath}`);

    return {
      filePath: relativePath,
      fileName,
    };
  }

  /**
   * 분석 결과 이미지들을 일괄 저장 (영구 보관)
   */
  async saveResultImages(
    images: {
      front?: string;
      leftSide?: string;
      rightSide?: string;
      back?: string;
    },
    userId: number,
    analysisId: number,
  ): Promise<{
    front?: { filePath: string; fileName: string };
    leftSide?: { filePath: string; fileName: string };
    rightSide?: { filePath: string; fileName: string };
    back?: { filePath: string; fileName: string };
  }> {
    const result: {
      front?: { filePath: string; fileName: string };
      leftSide?: { filePath: string; fileName: string };
      rightSide?: { filePath: string; fileName: string };
      back?: { filePath: string; fileName: string };
    } = {};

    const promises: Promise<void>[] = [];

    if (images.front) {
      promises.push(
        this.saveResultImage(images.front, 'posture', userId, analysisId, 'front')
          .then((res) => { result.front = res; }),
      );
    }
    if (images.leftSide) {
      promises.push(
        this.saveResultImage(images.leftSide, 'posture', userId, analysisId, 'leftSide')
          .then((res) => { result.leftSide = res; }),
      );
    }
    if (images.rightSide) {
      promises.push(
        this.saveResultImage(images.rightSide, 'posture', userId, analysisId, 'rightSide')
          .then((res) => { result.rightSide = res; }),
      );
    }
    if (images.back) {
      promises.push(
        this.saveResultImage(images.back, 'posture', userId, analysisId, 'back')
          .then((res) => { result.back = res; }),
      );
    }

    await Promise.all(promises);

    return result;
  }

  /**
   * 파일 읽기 (이미지 제공용)
   * @param relativePath - 상대 경로 (예: posture/1/xxx.jpg 또는 results/posture/1/xxx.jpg)
   * @returns 파일 버퍼와 MIME 타입
   */
  async getFile(relativePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      let absolutePath: string;

      // results/ 접두사가 있으면 resultsDir 사용, 없으면 uploadDir 사용
      if (relativePath.startsWith('results/') || relativePath.startsWith('results\\')) {
        const cleanPath = relativePath.replace(/^results[\/\\]/, '');
        absolutePath = path.join(this.resultsDir, cleanPath);
      } else {
        absolutePath = path.join(this.uploadDir, relativePath);
      }

      if (!fs.existsSync(absolutePath)) {
        this.logger.warn(`File not found: ${relativePath}`);
        return null;
      }

      const buffer = await fs.promises.readFile(absolutePath);
      const ext = path.extname(relativePath).toLowerCase();

      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
      };

      return {
        buffer,
        mimeType: mimeTypes[ext] || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Failed to read file ${relativePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = path.join(this.uploadDir, relativePath);

      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
        this.logger.log(`File deleted: ${relativePath}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to delete file ${relativePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * 매일 자정에 실행: 7일 이상 지난 파일 삭제
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldFiles(): Promise<void> {
    this.logger.log('Starting cleanup of old files...');

    const now = Date.now();
    let deletedCount = 0;
    let errorCount = 0;

    try {
      await this.cleanupDirectory(this.uploadDir, now, (deleted, errors) => {
        deletedCount += deleted;
        errorCount += errors;
      });

      this.logger.log(
        `Cleanup completed: ${deletedCount} files deleted, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * 디렉토리 내 오래된 파일 재귀적으로 삭제
   */
  private async cleanupDirectory(
    dirPath: string,
    now: number,
    callback: (deleted: number, errors: number) => void,
  ): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 하위 디렉토리 재귀 처리
        await this.cleanupDirectory(fullPath, now, callback);

        // 빈 디렉토리 삭제
        const remaining = await fs.promises.readdir(fullPath);
        if (remaining.length === 0) {
          await fs.promises.rmdir(fullPath);
          this.logger.debug(`Removed empty directory: ${fullPath}`);
        }
      } else if (entry.isFile()) {
        try {
          const stats = await fs.promises.stat(fullPath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > this.maxAgeMs) {
            await fs.promises.unlink(fullPath);
            this.logger.debug(`Deleted old file: ${entry.name} (age: ${Math.floor(fileAge / 86400000)} days)`);
            callback(1, 0);
          }
        } catch (error) {
          this.logger.warn(`Failed to process file ${fullPath}: ${error.message}`);
          callback(0, 1);
        }
      }
    }
  }

  /**
   * 수동으로 오래된 파일 정리 실행 (테스트/관리용)
   */
  async manualCleanup(): Promise<{ deleted: number; errors: number }> {
    let deletedCount = 0;
    let errorCount = 0;

    await this.cleanupDirectory(this.uploadDir, Date.now(), (deleted, errors) => {
      deletedCount += deleted;
      errorCount += errors;
    });

    return { deleted: deletedCount, errors: errorCount };
  }
}
