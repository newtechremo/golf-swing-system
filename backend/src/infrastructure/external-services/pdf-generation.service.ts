import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

export interface GolfSwingPdfData {
  subjectName: string;
  subjectInfo: {
    birthDate?: string;
    gender?: string;
    height?: number;
    weight?: number;
  };
  analysisDate: string;
  videoUrl: string;
  swingType: 'full' | 'half';
  analysisResult: any;
  memo?: string;
  instructorName: string;
}

export interface BodyPosturePdfData {
  subjectName: string;
  subjectInfo: {
    birthDate?: string;
    gender?: string;
    height?: number;
    weight?: number;
  };
  analysisDate: string;
  images: {
    frontUrl: string;
    sideUrl: string;
    backUrl: string;
  };
  analysisResults: {
    front: any;
    side: any;
    back: any;
  };
  memo?: string;
  instructorName: string;
}

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  /**
   * 골프 스윙 분석 PDF 생성
   */
  async generateGolfSwingPdf(data: GolfSwingPdfData): Promise<Buffer> {
    this.logger.log(`Generating Golf Swing PDF for subject: ${data.subjectName}`);

    const html = this.generateGolfSwingHtml(data);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      this.logger.log(`Golf Swing PDF generated successfully for: ${data.subjectName}`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate Golf Swing PDF: ${error.message}`, error.stack);
      throw new Error('PDF 생성 실패');
    }
  }

  /**
   * 신체 자세 분석 PDF 생성
   */
  async generateBodyPosturePdf(data: BodyPosturePdfData): Promise<Buffer> {
    this.logger.log(`Generating Body Posture PDF for subject: ${data.subjectName}`);

    const html = this.generateBodyPostureHtml(data);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      this.logger.log(`Body Posture PDF generated successfully for: ${data.subjectName}`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate Body Posture PDF: ${error.message}`, error.stack);
      throw new Error('PDF 생성 실패');
    }
  }

  /**
   * 골프 스윙 HTML 템플릿 생성
   */
  private generateGolfSwingHtml(data: GolfSwingPdfData): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>골프 스윙 분석 리포트</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans KR', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .container {
      padding: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .info-label {
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    .result-box {
      background: #e9ecef;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 15px;
    }
    .result-item {
      margin-bottom: 10px;
    }
    .result-label {
      font-weight: bold;
      color: #495057;
      margin-right: 10px;
    }
    .memo-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .memo-title {
      font-weight: bold;
      color: #856404;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 12px;
      border-top: 1px solid #dee2e6;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⛳ 골프 스윙 분석 리포트</h1>
    <p>Golf Swing Analysis Report</p>
  </div>

  <div class="container">
    <!-- 대상자 정보 -->
    <div class="section">
      <div class="section-title">대상자 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">이름</div>
          <div class="info-value">${data.subjectName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">분석 날짜</div>
          <div class="info-value">${data.analysisDate}</div>
        </div>
        ${data.subjectInfo.birthDate ? `
        <div class="info-item">
          <div class="info-label">생년월일</div>
          <div class="info-value">${data.subjectInfo.birthDate}</div>
        </div>
        ` : ''}
        ${data.subjectInfo.gender ? `
        <div class="info-item">
          <div class="info-label">성별</div>
          <div class="info-value">${data.subjectInfo.gender === 'M' ? '남성' : data.subjectInfo.gender === 'F' ? '여성' : '기타'}</div>
        </div>
        ` : ''}
        ${data.subjectInfo.height ? `
        <div class="info-item">
          <div class="info-label">키</div>
          <div class="info-value">${data.subjectInfo.height} cm</div>
        </div>
        ` : ''}
        ${data.subjectInfo.weight ? `
        <div class="info-item">
          <div class="info-label">몸무게</div>
          <div class="info-value">${data.subjectInfo.weight} kg</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">스윙 타입</div>
          <div class="info-value">${data.swingType === 'full' ? '풀 스윙' : '하프 스윙'}</div>
        </div>
      </div>
    </div>

    <!-- 분석 결과 -->
    <div class="section">
      <div class="section-title">분석 결과</div>
      <div class="result-box">
        <div class="result-item">
          <span class="result-label">상태:</span>
          <span>${data.analysisResult?.state === 1 ? '✅ 분석 완료' : '⏳ 분석 대기 중'}</span>
        </div>
        ${data.analysisResult?.result ? `
          <div class="result-item">
            <span class="result-label">스윙 속도:</span>
            <span>${data.analysisResult.result.swingSpeed || 'N/A'} km/h</span>
          </div>
          <div class="result-item">
            <span class="result-label">스윙 경로:</span>
            <span>${data.analysisResult.result.swingPath || 'N/A'}</span>
          </div>
          <div class="result-item">
            <span class="result-label">임팩트 위치:</span>
            <span>${data.analysisResult.result.impactPosition || 'N/A'}</span>
          </div>
        ` : '<p>분석이 아직 완료되지 않았습니다.</p>'}
      </div>
    </div>

    <!-- 코치 메모 -->
    ${data.memo ? `
    <div class="memo-box">
      <div class="memo-title">💬 코치 메모</div>
      <div>${data.memo}</div>
    </div>
    ` : ''}

    <!-- 담당 강사 -->
    <div class="section">
      <div class="section-title">담당 강사</div>
      <p><strong>${data.instructorName}</strong></p>
    </div>
  </div>

  <div class="footer">
    <p>본 리포트는 REMO AI 기술을 활용한 골프 스윙 분석 결과입니다.</p>
    <p>© ${new Date().getFullYear()} Golf Swing Analysis System. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * 신체 자세 HTML 템플릿 생성
   */
  private generateBodyPostureHtml(data: BodyPosturePdfData): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>신체 자세 분석 리포트</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans KR', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .container {
      padding: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .info-label {
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    .image-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .image-box {
      text-align: center;
    }
    .image-label {
      font-weight: bold;
      margin-bottom: 10px;
      color: #495057;
    }
    .result-box {
      background: #e9ecef;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 15px;
    }
    .result-item {
      margin-bottom: 10px;
    }
    .result-label {
      font-weight: bold;
      color: #495057;
      margin-right: 10px;
    }
    .memo-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .memo-title {
      font-weight: bold;
      color: #856404;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-size: 12px;
      border-top: 1px solid #dee2e6;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧍 신체 자세 분석 리포트</h1>
    <p>Body Posture Analysis Report</p>
  </div>

  <div class="container">
    <!-- 대상자 정보 -->
    <div class="section">
      <div class="section-title">대상자 정보</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">이름</div>
          <div class="info-value">${data.subjectName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">분석 날짜</div>
          <div class="info-value">${data.analysisDate}</div>
        </div>
        ${data.subjectInfo.birthDate ? `
        <div class="info-item">
          <div class="info-label">생년월일</div>
          <div class="info-value">${data.subjectInfo.birthDate}</div>
        </div>
        ` : ''}
        ${data.subjectInfo.gender ? `
        <div class="info-item">
          <div class="info-label">성별</div>
          <div class="info-value">${data.subjectInfo.gender === 'M' ? '남성' : data.subjectInfo.gender === 'F' ? '여성' : '기타'}</div>
        </div>
        ` : ''}
        ${data.subjectInfo.height ? `
        <div class="info-item">
          <div class="info-label">키</div>
          <div class="info-value">${data.subjectInfo.height} cm</div>
        </div>
        ` : ''}
        ${data.subjectInfo.weight ? `
        <div class="info-item">
          <div class="info-label">몸무게</div>
          <div class="info-value">${data.subjectInfo.weight} kg</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- 촬영 이미지 -->
    <div class="section">
      <div class="section-title">촬영 이미지</div>
      <div class="image-grid">
        <div class="image-box">
          <div class="image-label">정면</div>
          <p>Front View</p>
        </div>
        <div class="image-box">
          <div class="image-label">측면</div>
          <p>Side View</p>
        </div>
        <div class="image-box">
          <div class="image-label">후면</div>
          <p>Back View</p>
        </div>
      </div>
    </div>

    <!-- 분석 결과 -->
    <div class="section">
      <div class="section-title">분석 결과</div>
      <div class="result-box">
        <h4 style="margin-bottom: 10px;">정면 분석</h4>
        <div class="result-item">
          <span class="result-label">상태:</span>
          <span>${data.analysisResults.front?.state === 1 ? '✅ 분석 완료' : '⏳ 분석 대기 중'}</span>
        </div>
      </div>
      <div class="result-box">
        <h4 style="margin-bottom: 10px;">측면 분석</h4>
        <div class="result-item">
          <span class="result-label">상태:</span>
          <span>${data.analysisResults.side?.state === 1 ? '✅ 분석 완료' : '⏳ 분석 대기 중'}</span>
        </div>
      </div>
      <div class="result-box">
        <h4 style="margin-bottom: 10px;">후면 분석</h4>
        <div class="result-item">
          <span class="result-label">상태:</span>
          <span>${data.analysisResults.back?.state === 1 ? '✅ 분석 완료' : '⏳ 분석 대기 중'}</span>
        </div>
      </div>
    </div>

    <!-- 코치 메모 -->
    ${data.memo ? `
    <div class="memo-box">
      <div class="memo-title">💬 코치 메모</div>
      <div>${data.memo}</div>
    </div>
    ` : ''}

    <!-- 담당 강사 -->
    <div class="section">
      <div class="section-title">담당 강사</div>
      <p><strong>${data.instructorName}</strong></p>
    </div>
  </div>

  <div class="footer">
    <p>본 리포트는 REMO AI 기술을 활용한 신체 자세 분석 결과입니다.</p>
    <p>© ${new Date().getFullYear()} Golf Swing Analysis System. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }
}
