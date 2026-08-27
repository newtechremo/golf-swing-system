import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { getCommentByFieldName } from '../constants/golf-swing-comments';

/**
 * 분석 결과서(PDF) 생성.
 *
 * 화면(analysis-result / body-analysis-result 페이지)에 보이는 내용을 그대로 종이에 옮기는 것이
 * 목표다. 따라서 항목 라벨·구간 이름·등급 판정 기준은 프론트엔드와 반드시 일치해야 한다.
 * 프론트에서 라벨이나 임계값을 바꾸면 여기도 같이 바꿔야 한다.
 */

/** 화면과 동일한 구간별 분석 항목. frontend/app/analysis-result/page.tsx 의 PHASE_FIELDS 와 1:1 대응 */
const PHASE_FIELDS: Record<
  string,
  Array<{ key: string; scoreKey: string; mentKey: string; label: string; min: number; max: number }>
> = {
  address: [
    { key: 'addressShoulderTilt', scoreKey: 'addressShoulderTiltScore', mentKey: 'addressShoulderTiltMent', label: '어깨 기울기', min: 0, max: 30 },
    { key: 'addressStance', scoreKey: 'addressStanceScore', mentKey: 'addressStanceMent', label: '스탠스', min: 0, max: 2 },
    { key: 'addressUpperBodyTilt', scoreKey: 'addressUpperBodyTiltScore', mentKey: 'addressUpperBodyTiltMent', label: '상체 기울임', min: 0, max: 45 },
  ],
  takeback: [
    { key: 'takebackLeftShoulderRotation', scoreKey: 'takebackLeftShoulderRotationScore', mentKey: 'takebackLeftShoulderRotationMent', label: '왼쪽 어깨 회전', min: 0, max: 60 },
    { key: 'takebackRightHipRotation', scoreKey: 'takebackRightHipRotationScore', mentKey: 'takebackRightHipRotationMent', label: '오른쪽 골반 회전', min: 0, max: 30 },
    { key: 'takebackLeftArmFlexion', scoreKey: 'takebackLeftArmFlexionScore', mentKey: 'takebackLeftArmFlexionMent', label: '왼팔 펴짐 각도', min: 120, max: 180 },
    { key: 'takebackRightArmFlexion', scoreKey: 'takebackRightArmFlexionScore', mentKey: 'takebackRightArmFlexionMent', label: '오른팔 펴짐 각도', min: 120, max: 180 },
  ],
  backswing: [
    { key: 'backswingLeftShoulderRotation', scoreKey: 'backswingLeftShoulderRotationScore', mentKey: 'backswingLeftShoulderRotationMent', label: '왼쪽 어깨 회전', min: 0, max: 60 },
    { key: 'backswingHeadLocation', scoreKey: 'backswingHeadLocationScore', mentKey: 'backswingHeadLocationMent', label: '머리 위치', min: -10, max: 10 },
    { key: 'backswingLeftArmFlexion', scoreKey: 'backswingLeftArmFlexionScore', mentKey: 'backswingLeftArmFlexionMent', label: '왼팔 펴짐 각도', min: 90, max: 180 },
  ],
  backswingtop: [
    { key: 'backswingTopReverseSpine', scoreKey: 'backswingTopReverseSpineScore', mentKey: 'backswingTopReverseSpineMent', label: '리버스 스파인', min: -30, max: 30 },
    { key: 'backswingTopRightLegFlexion', scoreKey: 'backswingTopRightLegFlexionScore', mentKey: 'backswingTopRightLegFlexionMent', label: '오른 다리 펴짐 각도', min: 0, max: 60 },
    { key: 'backswingTopHeadLocation', scoreKey: 'backswingTopHeadLocationScore', mentKey: 'backswingTopHeadLocationMent', label: '머리 위치', min: -10, max: 10 },
    { key: 'backswingTopRightHipRotation', scoreKey: 'backswingTopRightHipRotationScore', mentKey: 'backswingTopRightHipRotationMent', label: '오른쪽 골반 회전', min: 0, max: 45 },
    { key: 'backswingTopCenterOfGravity', scoreKey: 'backswingTopCenterOfGravityScore', mentKey: 'backswingTopCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
  ],
  downswing: [
    { key: 'downswingCenterOfGravity', scoreKey: 'downswingCenterOfGravityScore', mentKey: 'downswingCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
    { key: 'downswingRightElbowLocation', scoreKey: 'downswingRightElbowLocationScore', mentKey: 'downswingRightElbowLocationMent', label: '오른쪽 팔꿈치 위치', min: 0, max: 50 },
    { key: 'downswingRightArmRotation', scoreKey: 'downswingRightArmRotationScore', mentKey: 'downswingRightArmRotationMent', label: '오른팔 회전', min: 0, max: 45 },
  ],
  impact: [
    { key: 'impactHangingBack', scoreKey: 'impactHangingBackScore', mentKey: 'impactHangingBackMent', label: '체중 이동 (행잉백)', min: 0, max: 100 },
    { key: 'impactHeadLocation', scoreKey: 'impactHeadLocationScore', mentKey: 'impactHeadLocationMent', label: '머리 위치', min: -10, max: 10 },
    { key: 'impactLeftArmFlexion', scoreKey: 'impactLeftArmFlexionScore', mentKey: 'impactLeftArmFlexionMent', label: '왼팔 펴짐 각도', min: 120, max: 180 },
    { key: 'impactRightArmFlexion', scoreKey: 'impactRightArmFlexionScore', mentKey: 'impactRightArmFlexionMent', label: '오른팔 펴짐 각도', min: 120, max: 180 },
  ],
  follow: [
    { key: 'followLeftLineAlign', scoreKey: 'followLeftLineAlignScore', mentKey: 'followLeftLineAlignMent', label: '왼쪽 다리 정렬', min: 0, max: 30 },
    { key: 'followChickenWing', scoreKey: 'followChickenWingScore', mentKey: 'followChickenWingMent', label: '치킨윙 각도', min: 90, max: 180 },
    { key: 'followCenterOfGravity', scoreKey: 'followCenterOfGravityScore', mentKey: 'followCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
  ],
  finish: [
    { key: 'finishLeftFootFix', scoreKey: 'finishLeftFootFixScore', mentKey: 'finishLeftFootFixMent', label: '왼발 고정', min: 0, max: 30 },
    { key: 'finishRightFootRotation', scoreKey: 'finishRightFootRotationScore', mentKey: 'finishRightFootRotationMent', label: '오른발 회전', min: 0, max: 90 },
    { key: 'finishCenterOfGravity', scoreKey: 'finishCenterOfGravityScore', mentKey: 'finishCenterOfGravityMent', label: '무게 중심', min: 0, max: 100 },
  ],
};

const PHASE_TITLES: Array<{ key: string; title: string; frameKey: string }> = [
  { key: 'address', title: '1. 어드레스', frameKey: 'addressFrame' },
  { key: 'takeback', title: '2. 테이크백', frameKey: 'takebackFrame' },
  { key: 'backswing', title: '3. 백스윙', frameKey: 'backswingFrame' },
  { key: 'backswingtop', title: '4. 백스윙탑', frameKey: 'backswingTopFrame' },
  { key: 'downswing', title: '5. 다운스윙', frameKey: 'downswingFrame' },
  { key: 'impact', title: '6. 임팩트', frameKey: 'impactFrame' },
  { key: 'follow', title: '7. 팔로우스루', frameKey: 'followFrame' },
  { key: 'finish', title: '8. 피니시', frameKey: 'finishFrame' },
];

/** 체형 분석 항목. frontend/app/body-analysis-result/page.tsx 의 섹션 구성과 1:1 대응 */
type PostureRange = 'left-right' | 'front-back' | 'ox-left' | 'ox-right' | 'posture-grade';

const POSTURE_SECTIONS: Array<{
  key: 'front' | 'leftSide' | 'rightSide' | 'back';
  title: string;
  items: Array<{ label: string; valueKey: string; gradeKey: string; range: PostureRange }>;
}> = [
  {
    key: 'front',
    title: '1. 정면 사진 분석 결과',
    items: [
      { label: '전신 좌우 기울기', valueKey: 'bodyTiltValue', gradeKey: 'bodyTiltGrade', range: 'left-right' },
      { label: '머리 좌우 기울기', valueKey: 'headBalanceValue', gradeKey: 'headBalanceGrade', range: 'left-right' },
      { label: '어깨 좌우 높이', valueKey: 'shoulderBalanceValue', gradeKey: 'shoulderBalanceGrade', range: 'left-right' },
      { label: '골반 좌우 기울기', valueKey: 'pelvicBalanceValue', gradeKey: 'pelvicBalanceGrade', range: 'left-right' },
      { label: '무릎 기울기', valueKey: 'kneeBalanceValue', gradeKey: 'kneeBalanceGrade', range: 'left-right' },
      { label: 'O/X 다리-왼다리', valueKey: 'leftLegQAngleValue', gradeKey: 'leftLegQAngleGrade', range: 'ox-left' },
      { label: 'O/X 다리-오른다리', valueKey: 'rightLegQAngleValue', gradeKey: 'rightLegQAngleGrade', range: 'ox-right' },
    ],
  },
  {
    key: 'leftSide',
    title: '2. 좌측면 사진 분석 결과',
    items: [
      { label: '거북목 검사', valueKey: 'turtleNeckValue', gradeKey: 'turtleNeckGrade', range: 'posture-grade' },
      { label: '라운드 숄더', valueKey: 'roundShoulderValue', gradeKey: 'roundShoulderGrade', range: 'posture-grade' },
      { label: '전신 앞뒤 기울기', valueKey: 'bodyTiltValue', gradeKey: 'bodyTiltGrade', range: 'front-back' },
      { label: '머리 앞뒤 기울기', valueKey: 'headTiltValue', gradeKey: 'headTiltGrade', range: 'front-back' },
    ],
  },
  {
    key: 'rightSide',
    title: '3. 우측면 사진 분석 결과',
    items: [
      { label: '거북목 검사', valueKey: 'turtleNeckValue', gradeKey: 'turtleNeckGrade', range: 'posture-grade' },
      { label: '라운드 숄더', valueKey: 'roundShoulderValue', gradeKey: 'roundShoulderGrade', range: 'posture-grade' },
      { label: '전신 앞뒤 기울기', valueKey: 'bodyTiltValue', gradeKey: 'bodyTiltGrade', range: 'front-back' },
      { label: '머리 앞뒤 기울기', valueKey: 'headTiltValue', gradeKey: 'headTiltGrade', range: 'front-back' },
    ],
  },
  {
    key: 'back',
    title: '4. 후면 사진 분석 결과',
    items: [
      { label: '전신 좌우 기울기', valueKey: 'bodyTiltValue', gradeKey: 'bodyTiltGrade', range: 'left-right' },
      { label: '머리 좌우 기울기', valueKey: 'headBalanceValue', gradeKey: 'headBalanceGrade', range: 'left-right' },
      { label: '어깨 좌우 높이', valueKey: 'shoulderBalanceValue', gradeKey: 'shoulderBalanceGrade', range: 'left-right' },
      { label: '골반 좌우 기울기', valueKey: 'pelvicBalanceValue', gradeKey: 'pelvicBalanceGrade', range: 'left-right' },
      { label: '무릎 기울기', valueKey: 'kneeBalanceValue', gradeKey: 'kneeBalanceGrade', range: 'left-right' },
    ],
  },
];

export interface PdfSubjectInfo {
  name: string;
  phoneNumber?: string | null;
  birthDate?: Date | string | null;
  gender?: string | null;
  height?: number | string | null;
  weight?: number | string | null;
}

export interface GolfSwingPdfData {
  analysisId: number;
  analysisDate: Date | string;
  subject: PdfSubjectInfo;
  instructorName: string;
  memo?: string | null;
  /** GolfSwingResultEntity. 구간별 측정값/점수/멘트가 평면으로 들어있다 */
  result: Record<string, any> | null;
  /** SwingTypeEntity. fps 는 프레임을 초로 환산하는 데 쓴다 */
  swingType?: Record<string, any> | null;
}

export interface BodyPosturePdfData {
  analysisId: number;
  analysisDate: Date | string;
  subject: PdfSubjectInfo;
  instructorName: string;
  memo?: string | null;
  results: {
    front?: Record<string, any> | null;
    leftSide?: Record<string, any> | null;
    rightSide?: Record<string, any> | null;
    back?: Record<string, any> | null;
  };
  /** 방향별 분석 이미지. data: URI 로 넘겨야 한다(아래 주석 참고) */
  images?: {
    front?: string | null;
    leftSide?: string | null;
    rightSide?: string | null;
    back?: string | null;
  };
}

@Injectable()
export class PdfGenerationService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGenerationService.name);

  /**
   * 브라우저는 요청마다 새로 띄우지 않고 하나를 재사용한다.
   * launch 는 1초 안팎 걸리고 프로세스당 100MB 이상을 쓰므로,
   * 결과서를 연달아 뽑을 때 매번 띄우면 서버가 버티지 못한다.
   */
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  /**
   * 유휴 종료.
   *
   * 브라우저를 재사용하면 빠르지만(0.27초 vs 1.3초), 그냥 두면 쓰지 않는 동안에도
   * 크롬이 400MB 를 붙들고 있는다. 결과서는 하루 몇 건 뽑는 기능이다.
   * 마지막 렌더링 후 일정 시간이 지나면 닫고, 다음 요청에서 다시 띄운다.
   */
  private static readonly IDLE_SHUTDOWN_MS = 10 * 60 * 1000;
  private idleTimer: NodeJS.Timeout | null = null;
  private activeRenders = 0;

  async onModuleDestroy(): Promise<void> {
    this.clearIdleTimer();
    await this.closeBrowser();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private async closeBrowser(): Promise<void> {
    // 먼저 참조를 끊는다. 닫는 동안 새 요청이 들어오면 새 인스턴스를 띄우게 한다.
    const browser = this.browser;
    this.browser = null;
    await browser?.close().catch(() => undefined);
  }

  private scheduleIdleShutdown(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.activeRenders > 0) return;
      this.logger.log('유휴 상태 — PDF 렌더링용 브라우저를 닫는다');
      void this.closeBrowser();
    }, PdfGenerationService.IDLE_SHUTDOWN_MS);

    // 타이머가 프로세스 종료를 붙잡지 않게 한다.
    this.idleTimer.unref();
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;

    // 동시에 여러 요청이 들어와도 launch 는 한 번만 돌게 묶는다.
    if (!this.launching) {
      // 크롬 실행 파일 경로.
      // 지정하지 않으면 puppeteer 는 자기가 받아둔 번들 크롬을 찾는데,
      // 그 버전은 puppeteer 를 올릴 때마다 바뀌고 npm ci 마다 300MB 를 새로 받는다.
      // 서버에 이미 깔린 크롬을 쓰는 편이 낫다. 없는 환경이면 비워두면 된다.
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

      this.launching = puppeteer
        .launch({
          headless: true,
          ...(executablePath ? { executablePath } : {}),
          // 컨테이너/제한 환경에서 크롬 샌드박스가 뜨지 않는다.
          // /dev/shm 이 작으면 렌더링 중 크래시하므로 디스크를 쓰게 한다.
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        })
        .then((browser) => {
          this.browser = browser;
          browser.on('disconnected', () => {
            this.browser = null;
          });
          return browser;
        })
        .finally(() => {
          this.launching = null;
        });
    }

    return this.launching;
  }

  /**
   * HTML 을 A4 PDF 로 렌더링한다.
   *
   * page 는 반드시 finally 에서 닫는다. pdf() 가 던졌을 때 닫지 않으면
   * 탭이 남아 브라우저 메모리가 계속 늘어난다.
   */
  private async renderPdf(html: string): Promise<Buffer> {
    this.clearIdleTimer();
    this.activeRenders++;

    let browser: Browser;
    let page: Page;
    try {
      browser = await this.getBrowser();
      page = await browser.newPage();
    } catch (error) {
      // launch/newPage 가 실패하면 아래 finally 를 타지 않는다. 직접 되돌린다.
      this.activeRenders--;
      if (this.activeRenders === 0) this.scheduleIdleShutdown();
      throw error;
    }

    try {
      // 이미지를 data: URI 로 심어두므로 외부 요청이 없다. networkidle 을 기다릴 이유가 없다.
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => undefined);
      this.activeRenders--;
      if (this.activeRenders === 0) this.scheduleIdleShutdown();
    }
  }

  async generateGolfSwingPdf(data: GolfSwingPdfData): Promise<Buffer> {
    this.logger.log(`골프 스윙 결과서 생성: analysisId=${data.analysisId}`);
    try {
      return await this.renderPdf(this.golfSwingHtml(data));
    } catch (error) {
      this.logger.error(`골프 스윙 결과서 생성 실패: ${error.message}`, error.stack);
      throw new Error('PDF 생성에 실패했습니다.');
    }
  }

  async generateBodyPosturePdf(data: BodyPosturePdfData): Promise<Buffer> {
    this.logger.log(`체형 결과서 생성: analysisId=${data.analysisId}`);
    try {
      return await this.renderPdf(this.bodyPostureHtml(data));
    } catch (error) {
      this.logger.error(`체형 결과서 생성 실패: ${error.message}`, error.stack);
      throw new Error('PDF 생성에 실패했습니다.');
    }
  }

  // ── 공통 헬퍼 ────────────────────────────────────────────────

  /**
   * HTML 이스케이프.
   * 대상자 이름·메모는 사용자 입력이다. 그대로 붙이면 결과서 레이아웃이 깨지고
   * 스크립트가 렌더링 단계에서 실행될 수 있다.
   */
  private esc(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}`;
  }

  private formatGender(gender?: string | null): string {
    if (gender === 'M') return '남성';
    if (gender === 'F') return '여성';
    if (gender === 'Other') return '기타';
    return '-';
  }

  /** 값이 min~max 구간에서 차지하는 위치(%) */
  private ratio(value: number, min: number, max: number): number {
    if (max === min) return 50;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  private subjectTable(subject: PdfSubjectInfo, analysisDate: Date | string): string {
    const height = this.toNumber(subject.height);
    const weight = this.toNumber(subject.weight);
    return `
      <table class="info">
        <tr>
          <th>이름</th><td>${this.esc(subject.name)}</td>
          <th>성별</th><td>${this.formatGender(subject.gender)}</td>
        </tr>
        <tr>
          <th>생년월일</th><td>${this.formatDate(subject.birthDate)}</td>
          <th>연락처</th><td>${this.esc(subject.phoneNumber) || '-'}</td>
        </tr>
        <tr>
          <th>키</th><td>${height !== null ? `${height} cm` : '-'}</td>
          <th>몸무게</th><td>${weight !== null ? `${weight} kg` : '-'}</td>
        </tr>
        <tr>
          <th>분석일</th><td colspan="3">${this.formatDate(analysisDate)}</td>
        </tr>
      </table>`;
  }

  private memoBlock(memo?: string | null): string {
    if (!memo || !memo.trim()) return '';
    return `
      <section class="card memo">
        <h2>강사 메모</h2>
        <p>${this.esc(memo).replace(/\n/g, '<br>')}</p>
      </section>`;
  }

  private baseStyles(): string {
    return `
      /* 서버에 설치된 Noto Sans CJK KR 를 쓴다. 없으면 한글이 두부(□)로 나온다. */
      * { box-sizing: border-box; }
      body {
        font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
        margin: 0; color: #1f2937; font-size: 11px; line-height: 1.5;
      }
      header.doc {
        display: flex; justify-content: space-between; align-items: flex-end;
        border-bottom: 3px solid #16a34a; padding-bottom: 10px; margin-bottom: 16px;
      }
      header.doc .brand { font-size: 13px; font-weight: 700; color: #16a34a; letter-spacing: .5px; }
      header.doc h1 { font-size: 20px; margin: 4px 0 0; }
      header.doc .meta { text-align: right; font-size: 10px; color: #6b7280; }
      table.info { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
      table.info th, table.info td { border: 1px solid #e5e7eb; padding: 6px 9px; text-align: left; }
      table.info th { background: #f3f4f6; font-weight: 600; width: 13%; white-space: nowrap; }
      .card {
        border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px;
        /* 항목 카드가 페이지 경계에서 반토막 나지 않게 한다 */
        page-break-inside: avoid;
      }
      .card h2 { font-size: 13px; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
      .card h2 .sub { font-size: 10px; font-weight: 400; color: #9ca3af; margin-left: 6px; }
      .metric { margin-bottom: 12px; }
      .metric:last-child { margin-bottom: 0; }
      .metric-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
      .metric-head .label { font-weight: 600; }
      .metric-head .value { font-size: 10px; color: #6b7280; }
      .bar { position: relative; height: 6px; border-radius: 3px; margin: 12px 0 5px; }
      .bar .pin {
        position: absolute; top: -4px; width: 12px; height: 12px; border-radius: 50%;
        border: 2px solid #fff; transform: translateX(-50%);
        box-shadow: 0 0 0 1px rgba(0,0,0,.15);
      }
      .bar .edge { position: absolute; top: -14px; font-size: 8px; font-weight: 600; }
      .comment { font-size: 10px; padding: 5px 8px; border-radius: 4px; background: #f9fafb; }
      .comment.good { color: #2563eb; }
      .comment.warn { color: #ea580c; }
      .empty { font-size: 10px; color: #9ca3af; }
      .memo p { margin: 0; white-space: pre-wrap; }
      footer.doc {
        margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb;
        font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between;
      }`;
  }

  private docHeader(title: string, analysisId: number, instructorName: string): string {
    return `
      <header class="doc">
        <div>
          <div class="brand">ParkGolf AI Pro</div>
          <h1>${title}</h1>
        </div>
        <div class="meta">
          분석번호 #${analysisId}<br>
          담당 강사 ${this.esc(instructorName)}
        </div>
      </header>`;
  }

  private docFooter(): string {
    // 발행일은 렌더링 시점 기준이다. 분석일과 다를 수 있다.
    return `
      <footer class="doc">
        <span>ParkGolf AI Pro — 파크골프 전문가 AI 분석 서비스</span>
        <span>발행일 ${this.formatDate(new Date())}</span>
      </footer>`;
  }

  // ── 골프 스윙 ────────────────────────────────────────────────

  private golfSwingHtml(data: GolfSwingPdfData): string {
    const result = data.result;
    const fps = this.toNumber(data.swingType?.fps);

    const body = result
      ? PHASE_TITLES.map((phase) => this.golfPhaseCard(phase, result, fps)).join('')
      : '<section class="card"><p class="empty">분석 결과 데이터가 없습니다.</p></section>';

    const totalScore = this.toNumber(result?.totalScore);
    const scoreBlock =
      totalScore !== null
        ? `<section class="card" style="text-align:center;background:#f0fdf4;border-color:#bbf7d0">
             <div style="font-size:10px;color:#15803d;font-weight:600">종합 점수</div>
             <div style="font-size:32px;font-weight:700;color:#16a34a;line-height:1.2">${totalScore}<span style="font-size:14px;color:#4ade80"> / 100</span></div>
           </section>`
        : '';

    return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><style>${this.baseStyles()}</style></head>
<body>
  ${this.docHeader('골프 스윙 분석 결과서', data.analysisId, data.instructorName)}
  ${this.subjectTable(data.subject, data.analysisDate)}
  ${scoreBlock}
  ${body}
  ${this.memoBlock(data.memo)}
  ${this.docFooter()}
</body>
</html>`;
  }

  private golfPhaseCard(
    phase: { key: string; title: string; frameKey: string },
    result: Record<string, any>,
    fps: number | null,
  ): string {
    const fields = PHASE_FIELDS[phase.key] ?? [];
    const frame = this.toNumber(result[phase.frameKey]);
    // fps 를 모르면 프레임 번호를 그대로 보여준다. 임의의 fps 를 가정하면 틀린 시각이 찍힌다.
    const timeLabel =
      frame !== null
        ? fps && fps > 0
          ? `${(frame / fps).toFixed(2)}초`
          : `${frame} 프레임`
        : '';

    const metrics = fields.map((field) => this.golfMetric(field, result)).join('');

    return `
      <section class="card">
        <h2>${phase.title}${timeLabel ? `<span class="sub">${timeLabel}</span>` : ''}</h2>
        ${metrics || '<p class="empty">측정 항목이 없습니다.</p>'}
      </section>`;
  }

  private golfMetric(
    field: { key: string; scoreKey: string; mentKey: string; label: string; min: number; max: number },
    result: Record<string, any>,
  ): string {
    const value = this.toNumber(result[field.key]);

    if (value === null) {
      return `
        <div class="metric">
          <div class="metric-head">
            <span class="label">${field.label}</span>
            <span class="value">데이터 없음</span>
          </div>
        </div>`;
    }

    const ment = this.toNumber(result[field.mentKey]);
    // 멘트 1 = 좋음(파랑), 2·3 = 개선 필요(주황). 화면의 색 규칙과 같다.
    const isGood = ment === 1;
    const commentText = ment ? getCommentByFieldName(field.key, ment as 1 | 2 | 3) : '';
    const pos = this.ratio(value, field.min, field.max);

    return `
      <div class="metric">
        <div class="metric-head">
          <span class="label">${field.label}</span>
          <span class="value">측정 결과 ${value.toFixed(1)}°</span>
        </div>
        <div class="bar" style="background:linear-gradient(90deg,#ef4444,#3b82f6)">
          <span class="edge" style="left:0;color:#ef4444">Bad</span>
          <span class="edge" style="right:0;color:#3b82f6">Good</span>
          <span class="pin" style="left:${pos.toFixed(1)}%;background:${isGood ? '#3b82f6' : '#ff3b30'}"></span>
        </div>
        ${commentText ? `<div class="comment ${isGood ? 'good' : 'warn'}">${this.esc(commentText)}</div>` : ''}
      </div>`;
  }

  // ── 체형 ────────────────────────────────────────────────────

  private bodyPostureHtml(data: BodyPosturePdfData): string {
    const sections = POSTURE_SECTIONS.filter((s) => data.results?.[s.key]).map((s) =>
      this.postureSectionCard(s, data.results[s.key] as Record<string, any>, data.images?.[s.key]),
    );

    const body = sections.length
      ? sections.join('')
      : '<section class="card"><p class="empty">분석이 완료된 방향이 없습니다.</p></section>';

    return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><style>${this.baseStyles()}${this.postureStyles()}</style></head>
<body>
  ${this.docHeader('체형 분석 결과서', data.analysisId, data.instructorName)}
  ${this.subjectTable(data.subject, data.analysisDate)}
  ${body}
  ${this.memoBlock(data.memo)}
  ${this.docFooter()}
</body>
</html>`;
  }

  private postureStyles(): string {
    return `
      .posture { display: flex; gap: 14px; align-items: flex-start; }
      .posture .photo { width: 150px; flex-shrink: 0; }
      .posture .photo img { width: 100%; border-radius: 4px; border: 1px solid #e5e7eb; }
      .posture .items { flex: 1; }
      .badge {
        display: inline-block; padding: 1px 7px; border-radius: 10px;
        font-size: 9px; font-weight: 700; color: #1f2937;
      }
      .badge.normal { background: #6cc66c; color: #fff; }
      .badge.caution { background: #ffd86b; }
      .badge.danger  { background: #ffa8a8; }
      .badge.unknown { background: #e5e7eb; color: #6b7280; }
      .scale { display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; margin-top: 2px; }`;
  }

  /**
   * 등급 → 상태.
   * 좌우/앞뒤 항목은 0 이 정상, ±1 이 주의, 그 밖은 위험이다(음수 등급이 존재한다).
   * 거북목·라운드숄더는 방향 개념이 없어 0/1/그외로 나뉜다.
   * 프론트의 gradeToStatus / postureGradeToStatus 와 같은 규칙이다.
   */
  private postureStatus(grade: number | null, range: PostureRange): '정상' | '주의' | '위험' | null {
    if (grade === null) return null;
    if (range === 'posture-grade') {
      if (grade === 0) return '정상';
      if (grade === 1) return '주의';
      return '위험';
    }
    if (grade === 0) return '정상';
    if (grade === -1 || grade === 1) return '주의';
    return '위험';
  }

  private postureBarPosition(value: number, range: PostureRange): number {
    if (range === 'left-right' || range === 'front-back') {
      return this.ratio(Math.max(-10, Math.min(10, value)), -10, 10);
    }
    if (range === 'ox-left' || range === 'ox-right') {
      // Q-Angle: 음수는 X다리, 양수는 O다리
      return this.ratio(Math.max(-15, Math.min(15, value)), -15, 15);
    }
    // 거북목·라운드숄더: 0~60, 낮을수록 정상
    return this.ratio(Math.max(0, Math.min(60, value)), 0, 60);
  }

  private postureScaleLabels(range: PostureRange): [string, string] {
    switch (range) {
      case 'left-right': return ['왼쪽', '오른쪽'];
      case 'front-back': return ['앞', '뒤'];
      case 'ox-left':
      case 'ox-right': return ['X다리', 'O다리'];
      default: return ['정상', '위험'];
    }
  }

  private postureSectionCard(
    section: { key: string; title: string; items: Array<{ label: string; valueKey: string; gradeKey: string; range: PostureRange }> },
    result: Record<string, any>,
    image?: string | null,
  ): string {
    const items = section.items
      .map((item) => {
        const value = this.toNumber(result[item.valueKey]);
        if (value === null) {
          return `<div class="metric"><div class="metric-head"><span class="label">${item.label}</span><span class="value">데이터 없음</span></div></div>`;
        }

        const status = this.postureStatus(this.toNumber(result[item.gradeKey]), item.range);
        const pos = this.postureBarPosition(value, item.range);
        const [left, right] = this.postureScaleLabels(item.range);

        // 등급이 비어 있는 항목이 실제로 있다(REMO 가 일부 지표의 grade 를 안 준다).
        // 이때 '위험' 색으로 칠하면 정상일 수도 있는 값을 위험으로 오독하게 만든다.
        // 판정 불가는 회색으로 두고 배지도 달지 않는다.
        const PALETTE: Record<string, { badge: string; bar: string }> = {
          정상: { badge: 'normal', bar: '#6cc66c' },
          주의: { badge: 'caution', bar: '#ffd86b' },
          위험: { badge: 'danger', bar: '#ffa8a8' },
        };
        const tone = status ? PALETTE[status] : { badge: '', bar: '#c4c9d1' };

        return `
          <div class="metric">
            <div class="metric-head">
              <span class="label">${item.label}</span>
              <span class="value">
                ${value.toFixed(1)}
                ${status ? `<span class="badge ${tone.badge}">${status}</span>` : '<span class="badge unknown">판정 불가</span>'}
              </span>
            </div>
            <div class="bar" style="background:#eef0f3">
              <span class="pin" style="left:${pos.toFixed(1)}%;background:${tone.bar}"></span>
            </div>
            <div class="scale"><span>${left}</span><span>${right}</span></div>
          </div>`;
      })
      .join('');

    // 이미지는 data: URI 여야 한다. 원격 URL 을 쓰면 인증 가드에 걸려 빈 칸으로 렌더링된다.
    const photo = image
      ? `<div class="photo"><img src="${image}" alt=""></div>`
      : '';

    return `
      <section class="card">
        <h2>${section.title}</h2>
        <div class="posture">
          ${photo}
          <div class="items">${items}</div>
        </div>
      </section>`;
  }
}
