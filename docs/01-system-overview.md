# 01. 시스템 개요 — 이 시스템은 무엇인가

**분석 기준 커밋**: `7e34b47` / **분석일**: 2026-08-26

---

## 1. 도메인 정의

**골프 아카데미용 AI 스윙·체형 분석 SaaS.**

강사(instructor)가 자신이 담당하는 **대상자(subject, 회원)** 의 골프 스윙 영상과
체형 사진을 업로드하면, 외부 **REMO Sports Analysis API** 가 AI 분석을 수행하고,
시스템은 그 결과를 저장·시각화·PDF 리포트로 제공한다.

### 핵심 통찰
이 백엔드는 **AI 분석을 직접 수행하지 않는다.** 영상/이미지를 받아 base64 로 인코딩해
REMO API 에 위임하고, UUID 로 결과를 폴링해 관계형 스키마에 정규화하여 저장하는
**오케스트레이션 + 영속화 레이어**다. 시스템의 가치는 분석 알고리즘이 아니라
**멀티테넌시(센터/강사/대상자) · 이력 관리 · 결과 정규화**에 있다.

### 도메인 계층 구조

```
Center (센터/지점)
  ├── Admin        (센터 관리자 / super_admin)
  └── User (강사)   ← 로그인 주체, JWT 발급 대상
        └── Subject (대상자 = 분석 받는 회원)
              ├── GolfSwingAnalysis   (스윙 분석 세션)
              └── BodyPostureAnalysis (체형 분석 세션)
```

> 이 3단 구조(Center → User → Subject)는 커밋 `1bfdb0f "refactor: Restructure system to
> Center → User(강사) → Subject(대상자)"` 에서 도입된 것으로, 원래는 더 단순한 구조였다.

---

## 2. 기술 스택 (실측)

### Backend — `backend/package.json`
| 구분 | 기술 | 버전 |
|------|------|------|
| Framework | NestJS | 10.3 |
| ORM | TypeORM | 0.3.19 |
| DB | MySQL | 8.0 (Docker `golf_mysql`) |
| Auth | @nestjs/jwt | 10.2 + bcrypt 6.0 |
| 파일 저장 | AWS S3 (`@aws-sdk/client-s3` 3.921) + 로컬 파일시스템 | |
| 이미지 처리 | sharp 0.34 | |
| PDF | puppeteer 24.27 | |
| 스케줄러 | @nestjs/schedule 6.0 (파일 정리용) | |
| HTTP | axios 1.13 (devDependencies 에 위치 ⚠️) | |
| Runtime | Node.js v24.13.0 | |

### Frontend — `frontend/package.json`
| 구분 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 16.0.10 |
| UI | React 19.2 + Radix UI + Tailwind CSS 4.1 | |
| Form | react-hook-form 7.60 + zod 3.25 | |
| HTTP | axios 1.13.2 | |
| Charts | recharts | |
| 패키지명 | `my-v0-project` — v0.dev 로 생성된 스캐폴드 흔적 | |

---

## 3. 아키텍처

### 3.1 배포 토폴로지 (실측)

```
                    인터넷
                      │
                      ▼
        ┌──────────────────────────────┐
        │ nginx  golf.remo.re.kr        │
        │  :443 (Let's Encrypt)         │
        │  client_max_body_size 25m  ⚠️ │
        └──────────────┬───────────────┘
                       │ proxy_pass  (전체 트래픽)
                       ▼
        ┌──────────────────────────────┐
        │ Next.js  localhost:3000       │   pm2: golf-frontend
        │  (SSR + 정적 자산)             │
        │  rewrites():                  │
        │   /backend-api/* ─────────────┼──┐
        └──────────────────────────────┘  │
                                           ▼
                              ┌────────────────────────┐
                              │ NestJS localhost:3003  │  pm2: golf-backend
                              │  globalPrefix = /api   │
                              └───────┬────────┬───────┘
                                      │        │
                        ┌─────────────┘        └──────────────┐
                        ▼                                      ▼
              ┌──────────────────┐              ┌─────────────────────────┐
              │ MySQL :3306      │              │ REMO API                │
              │ golf_swing_db    │              │ backend:  api.remo.re.kr│
              │ (Docker)         │              │ frontend: api.rfremo.com│ ⚠️ 불일치
              └──────────────────┘              └─────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ AWS S3           │
              │ sppb-private     │
              │ ap-northeast-2   │
              └──────────────────┘
```

**주목할 점**: 백엔드는 외부에 직접 노출되지 않는다. 모든 API 트래픽이
Next.js 의 `rewrites()` 를 경유한다 (`frontend/next.config.mjs:20-27`).
즉 **Next.js 가 사실상 API 게이트웨이 역할**을 겸한다.

### 3.2 코드 아키텍처 — Clean Architecture

`backend/src` 는 3계층으로 실제 분리되어 있으며 의존 방향이 지켜지고 있다.

```
presentation/          ← HTTP 경계
  controllers/  (5개)   auth, subject, golf-swing, body-posture, history
  guards/       (1개)   jwt-auth.guard.ts
        │ 의존
        ▼
application/           ← 비즈니스 규칙 (프레임워크 비의존)
  use-cases/    (16개)  auth 3 / subject 5 / golf-swing 3 / body-posture 3 / history 2
  dto/                 auth, subject, golf-swing, posture, history, pdf, common
  interfaces/repositories/   ← 추상화 (I*Repository)
        │ 의존 (인터페이스만)
        ▼
infrastructure/        ← 구현 상세
  database/entities/     (14개)
  database/repositories/ (4개)  ← I*Repository 구현체
  external-services/     s3-upload / remo-api / pdf-generation / local-storage
  services/              golf-swing-score.service.ts
```

**의존성 역전이 실제로 동작한다**: `app.module.ts` 에서 문자열 토큰으로 바인딩.

```ts
{ provide: 'IUserRepository',                 useClass: UserRepository },
{ provide: 'ISubjectRepository',              useClass: SubjectRepository },
{ provide: 'IGolfSwingAnalysisRepository',    useClass: GolfSwingAnalysisRepository },
{ provide: 'IBodyPostureAnalysisRepository',  useClass: BodyPostureAnalysisRepository },
```

Use Case 들은 `@Inject('IUserRepository')` 로 인터페이스에만 의존한다.
→ **교과서적으로 잘 구현된 부분.** (다만 이 구조의 최대 이점인 "테스트 용이성"이
테스트 0건으로 전혀 활용되지 않고 있다 — [03번 문서 P1-4](./03-issue-analysis.md) 참조)

**단, 모듈 분리는 되어 있지 않다.** NestJS 기능 모듈(`AuthModule`, `SubjectModule` 등) 없이
**단일 `AppModule` 에 14 Entity + 16 UseCase + 5 Controller + 5 Service 를 전부 등록**한다
(`app.module.ts`, 216줄). 규모가 커지면 유지보수 부담이 된다.

---

## 4. 데이터 모델 (14 Entity)

### 4.1 조직/계정
| Entity | 테이블 | 핵심 필드 |
|--------|--------|-----------|
| `CenterEntity` | `centers` | name, code(unique), address, contact, status |
| `AdminEntity` | `admins` | username(unique), passwordHash, role(`super_admin`\|`center_admin`), centerId |
| `UserEntity` | `users` | **강사**. username(unique), passwordHash, phoneNumber(unique), **email(nullable, unique 아님 ⚠️)**, paymentType(`free`\|`paid`), isCertified, 구독기간, status |
| `SubjectEntity` | `subjects` | **대상자**. userId(담당강사), name, phoneNumber, birthDate, gender, height, weight, memo, status(`active`\|`inactive`\|`deleted`) |

### 4.2 골프 스윙 분석 (1 세션 → 3개 결과 테이블)
| Entity | 테이블 | 역할 |
|--------|--------|------|
| `GolfSwingAnalysisEntity` | `golf_swing_analyses` | 세션 헤더. uuid(unique), status(`pending`→`processing`→`completed`\|`failed`), videoUrl/s3Key, resultVideoUrl, waitTime, creditUsed, memo |
| `GolfSwingResultEntity` | `golf_swing_results` | 분석 지표 본문 (**13.8KB — 가장 큰 엔티티**) |
| `GolfSwingAngleEntity` | `golf_swing_angles` | 관절 각도 시계열 |
| `SwingTypeEntity` | `golf_swing_types` | 스윙 구간 프레임. `full` = address/takeback/backswing/top/downswing/impact/followthrough/finish **(8단계)**, `half` = address/takeback/backswing/downswing/impact **(5단계)** + totalFrames, fps |

관계: `GolfSwingAnalysis` 1:1 `Result` / 1:1 `Angle` / 1:1 `SwingType` (모두 `cascade: true`, `onDelete: CASCADE`)

### 4.3 체형(자세) 분석 (1 세션 → 3방향 결과)
| Entity | 테이블 | 역할 |
|--------|--------|------|
| `BodyPostureAnalysisEntity` | `body_posture_analyses` | 세션 헤더. **4방향** 이미지(front / leftSide / rightSide / back) 각각에 url·s3Key·status·uuid 를 개별 보유 |
| `FrontPostureResultEntity` | `front_posture_results` | 정면 결과 |
| `SidePostureResultEntity` | `side_posture_results` | 측면 결과 |
| `BackPostureResultEntity` | `back_posture_results` | 후면 결과 |

> **구조적 특이점**: 이미지는 4방향(좌/우 측면 분리)인데 결과 테이블은 3개(front/side/back)다.
> 좌측면·우측면이 하나의 `side_posture_results` 로 수렴한다.
> `CLAUDE.md` 의 미해결 이슈 **C-01 "체형 분석 이미지 필드 부족(0/3)"** 이 이 지점과 관련된 것으로 보인다.

### 4.4 공지
| Entity | 테이블 | 역할 |
|--------|--------|------|
| `NoticeEntity` | `notices` | 공지. author → Admin |
| `NoticeReadEntity` | `notice_reads` | 읽음 처리 |

> ⚠️ Notice 는 **엔티티만 존재하고 Controller / UseCase / Repository 가 없다.**
> 즉 스키마만 있고 기능은 미구현이다.

---

## 5. API 표면 (실측 — 컨트롤러 데코레이터 기준)

전역 프리픽스 `/api`, 외부 접근 경로는 `/backend-api/*` (Next rewrite).

### `/api/auth` — `auth.controller.ts` (가드 없음, 공개)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/register` | 강사 회원가입 |
| POST | `/auth/login` | 로그인 → accessToken(1h) + refreshToken(7d) + user |
| POST | `/auth/refresh` | Authorization 헤더의 refreshToken 으로 accessToken 재발급 |

### `/api/subjects` — `subject.controller.ts` (**클래스 레벨 `@UseGuards(JwtAuthGuard)`**)
| Method | Path |
|--------|------|
| GET | `/subjects` |
| GET | `/subjects/:id` |
| POST | `/subjects` |
| PUT | `/subjects/:id` |
| DELETE | `/subjects/:id` |

### `/api/golf-swing` — `golf-swing.controller.ts` (**클래스 레벨 가드**)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/golf-swing/analyze` | 영상 업로드(≤500MB, memoryStorage) → S3 → REMO 분석 요청 |
| GET | `/golf-swing/analysis/:id` | 결과 조회 (pending 이면 REMO 에서 가져와 저장) |
| PUT | `/golf-swing/analysis/:id/memo` | 메모 수정 |
| POST | `/golf-swing/analysis/:id/refresh` | 결과 재조회 |
| GET | `/golf-swing/analysis/:id/video` | 결과 영상 URL |
| GET | `/golf-swing/analysis/:id/images` | 8단계 구간 이미지 |
| DELETE | `/golf-swing/analysis/:id` | 삭제 |

### `/api/body-posture` — `body-posture.controller.ts` (**메서드별 개별 가드**)
| Method | Path | 가드 |
|--------|------|------|
| POST | `/body-posture/analyze` | ✅ (이미지 4종, 각 ≤10MB) |
| GET | `/body-posture/images/*` | ❌ **없음** ⚠️ |
| GET | `/body-posture/analysis/:id` | ✅ |
| PUT | `/body-posture/analysis/:id/memo` | ✅ |
| DELETE | `/body-posture/analysis/:id` | ✅ |

### `/api/history` — `history.controller.ts` (**클래스 레벨 가드**)
| Method | Path |
|--------|------|
| GET | `/history/subject/:subjectId` |
| GET | `/history/subject/:subjectId/calendar` |

---

## 6. 프론트엔드 구조

### 페이지 (App Router, 15개 라우트)
```
/                       진입점
/login                  로그인 (Figma 디자인 반영, 최근 커밋 대상)
/password               비밀번호
/main                   메인 대시보드
/member/[memberId]      회원 상세

  ── 골프 스윙 플로우 ──
/select-swing           스윙 타입 선택 (full / half)
/shoot                  촬영
/upload-video           영상 업로드
/analysis-loading       분석 대기 (폴링)
/analysis-result        결과
/analysis-result/[phaseId]  구간별 상세

  ── 체형 분석 플로우 ──
/body-analysis          체형 촬영/업로드
/body-analysis-loading  분석 대기 (폴링)
/body-analysis-result   결과
```

### API 클라이언트 계층 — `frontend/lib/`
| 파일 | 역할 |
|------|------|
| `api.ts` | axios 인스턴스. **동적 baseURL** (SSR: env, CSR: `/backend-api`), JWT 자동 첨부 인터셉터, 401 → 로그아웃 리다이렉트 (로그인 요청은 예외 처리) |
| `auth.ts` | login / logout / getCurrentUser / refreshAccessToken. 토큰을 **localStorage** 에 저장 |
| `subjects.ts` | 대상자 CRUD |
| `golf-swing.ts` | 업로드(timeout 300s) + `pollGolfSwingAnalysis` 폴링 |
| `body-posture.ts` | 업로드(timeout 120s) + `pollBodyPostureAnalysis` 폴링 |
| `history.ts` | 이력/캘린더 |
| `golf-swing-comments.ts` | 분석 코멘트 문구 매핑 |

### UI
`components/ui/` 에 shadcn/ui 컴포넌트 **58개** (v0.dev 스캐폴드 기반).
프로젝트 고유 컴포넌트는 `auth-header.tsx`, `member-info-header.tsx`, `theme-provider.tsx` **3개뿐**.

---

## 7. 외부 연동 — REMO API

`backend/src/infrastructure/external-services/remo-api.service.ts` (16.9KB)

| 메서드 | 엔드포인트 |
|--------|-----------|
| `requestGolfSwingAnalysis` | `POST /api/analysis-golf` |
| `getGolfSwingAnalysisResult` | `GET /api/analysis-golf-result` |
| `getGolfSwingAngleData` | `GET /api/analysis-golf-angle` |
| `getGolfSwingDrawVideo` | `GET /api/analysis-golf-draw` |
| `getGolfSwingImages` | `GET /api/analysis-golf-images` |
| `requestBodyPostureAnalysis` | `POST /api/analysis-skeleton-v2-{front\|side\|back}` |
| `getBodyPostureAnalysisResult` | `GET /api/analysis-walking-result` |
| `getBodyPostureAngleData` | `GET /api/analysis-FreeMotion-angle` |

**인증**: 헤더에 `APIKey` + userEmail + userKey
**전송 방식**: 파일을 `Buffer.toString('base64')` 로 인코딩해 JSON body 에 담아 POST
**재시도**: `maxRetries = 3`, 지수 백오프 아님 (`retryDelay * attempt` — 선형)
**폴백**: API 키 미설정 시 `mock-api-key` 로 동작 (개발 편의)

### 분석 상태 머신
```
pending ──[REMO 요청 성공]──> processing ──[결과 폴링 성공]──> completed
   │                              │
   └──────[REMO 요청 실패]────────┴──────[결과 조회 실패]────> failed
```

---

## 8. 운영 구성

### PM2 — `ecosystem.config.js`
| 앱 | 스크립트 | 포트 | NODE_ENV |
|----|----------|------|----------|
| `golf-backend` | `backend/dist/main.js` | 3003 | production |
| `golf-frontend` | `next start --port 3000` | 3000 | production |

공통: `autorestart: true`, `max_memory_restart: 1G`, `watch: false`

### CI/CD — `.github/workflows/deploy.yml`
`main` 브랜치 push 시 `appleboy/ssh-action` 으로 서버 접속 후:
```
git pull origin main
cd backend  && npm ci --production=false && npm run build
cd frontend && npm ci --production=false && npm run build
mkdir -p logs
pm2 startOrRestart ecosystem.config.js --env production && pm2 save
```
> **DB 마이그레이션 단계 없음.** 프로덕션에서는 `synchronize: false` 이므로
> 스키마 변경이 배포로 반영되지 않는다 ([03번 문서 P1-3](./03-issue-analysis.md)).

### 환경변수
`backend/.env`: DB 접속정보, `JWT_SECRET`, AWS 자격증명, REMO API 키 4종
`frontend/.env.local`: `NEXT_PUBLIC_API_BASE_URL`, REMO 키

`.gitignore` 에 `.env` 계열이 광범위하게 등록되어 있고, **Git 히스토리 전체에
`.env` 파일이 커밋된 이력 없음을 확인**함 (`git log --all --diff-filter=A`).

---

## 9. 저장소 문서 현황

루트에 마크다운 문서가 **14개** 존재하며 상당 부분 내용이 중복된다.

`README.md` / `PROJECT_SUMMARY.md` / `CURRENT_STATUS.md` / `SYSTEM_ARCHITECTURE.md` /
`API_SPECIFICATION.md` / `FRONTEND_DEVELOPMENT_GUIDE.md` / `FRONTEND_BACKEND_INTEGRATION.md` /
`FRONTEND_INTEGRATION_SUMMARY.md` / `INTEGRATION_COMPLETE.md` / `INTEGRATION_UPDATE_LOG.md` /
`BACKEND_ISSUES_REPORT.md` / `RESTRUCTURE_CHANGES.md` / `SETUP_GUIDE.md` / `README_BRANCHING_STRATEGY.md`

추가로 `backend/docs/` 에 4개 (`API_DOCUMENTATION.md`, `API_EXAMPLES.md`,
`BACKEND_INTEGRATION_ISSUES.md`, `BACKEND_INTEGRATION_STATUS.md`).

`CURRENT_STATUS.md` 는 **2025-12-11 기준, 브랜치 `feature/controllers`** 로 기록되어 있어
현재 상태(2026-08-26, `main`)와 8개월 이상 벌어져 있다. → [03번 문서 P3-1](./03-issue-analysis.md)
