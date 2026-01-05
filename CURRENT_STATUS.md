# Golf Swing System - 현재 코드 상태 보고서

**업데이트**: 2025-12-11
**현재 브랜치**: `feature/controllers`
**전체 진행률**: 95%

---

## 1. 프로젝트 개요

골프 스윙 및 체형 분석 시스템으로, 강사가 대상자(회원)의 골프 스윙 영상과 체형 이미지를 업로드하면 REMO API를 통해 AI 분석을 수행하고 결과를 제공합니다.

### 서버 정보 (포트 고정)
| 서버 | URL | 포트 |
|------|-----|------|
| 백엔드 | http://localhost:3003/api | **3003** |
| 프론트엔드 | http://localhost:3000 | **3000** |
| 데이터베이스 | localhost | 3306 |

---

## 2. 기술 스택

### Backend
| 구분 | 기술 |
|------|------|
| Framework | NestJS 10.3 |
| Language | TypeScript |
| Database | MySQL 8.0+ |
| ORM | TypeORM 0.3.19 |
| Authentication | JWT (Access + Refresh Token) |
| File Storage | AWS S3 |
| External API | REMO Sports Analysis API |

### Frontend
| 구분 | 기술 |
|------|------|
| Framework | Next.js 16.0.3 |
| Language | TypeScript + React 19.2 |
| UI Library | Radix UI + Tailwind CSS 4.1 |
| Form | React Hook Form 7.60 + Zod 3.25 |
| HTTP Client | Axios 1.13.2 |
| Charts | Recharts |

---

## 3. 디렉토리 구조

```
golf_swing_system/
├── backend/                          # NestJS 백엔드
│   ├── src/
│   │   ├── presentation/            # Controllers, Guards
│   │   │   ├── controllers/         # 5개 컨트롤러
│   │   │   └── guards/              # JWT 인증 가드
│   │   ├── application/             # Use Cases, DTOs, Interfaces
│   │   │   ├── use-cases/           # 13개 Use Cases
│   │   │   ├── dto/                 # Request/Response DTOs
│   │   │   └── interfaces/          # Repository Interfaces
│   │   ├── infrastructure/          # DB, Services
│   │   │   ├── database/
│   │   │   │   ├── entities/        # 14개 Entity
│   │   │   │   └── repositories/    # 4개 Repository
│   │   │   ├── external-services/   # S3, REMO API
│   │   │   └── services/            # PDF 생성 등
│   │   ├── app.module.ts            # NestJS 메인 모듈
│   │   └── main.ts                  # 진입점
│   ├── scripts/                     # 테스트/유틸 스크립트
│   └── dist/                        # 빌드 결과물
│
├── frontend/                         # Next.js 프론트엔드
│   ├── app/                         # App Router 페이지 (15개)
│   ├── components/                  # UI 컴포넌트
│   ├── lib/                         # API 서비스 (5개)
│   └── styles/                      # 전역 스타일
│
├── scripts/                         # 프로젝트 레벨 스크립트
└── *.md                             # 문서 파일들
```

---

## 4. 백엔드 아키텍처 (Clean Architecture)

```
┌─────────────────────────────────────────────────┐
│         Presentation Layer (표현 계층)           │
│  Controllers (5개) + Guards (JWT)               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│        Application Layer (응용 계층)             │
│  Use Cases (13개) + DTOs + Interfaces           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│      Infrastructure Layer (인프라 계층)          │
│  Repositories (4개) + Entities (14개)           │
│  External Services (S3, REMO, PDF)              │
└─────────────────────────────────────────────────┘
```

### 4.1 Controllers (5개)
| 파일 | 역할 | 코드 라인 |
|------|------|----------|
| `auth.controller.ts` | 인증 (로그인, 토큰 갱신, 등록) | ~1,700 |
| `subject.controller.ts` | 대상자 CRUD | ~2,900 |
| `golf-swing.controller.ts` | 골프 스윙 분석 | ~16,800 |
| `body-posture.controller.ts` | 체형 분석 | ~21,100 |
| `history.controller.ts` | 분석 이력 조회 | ~1,800 |

### 4.2 Use Cases (13개)
| 도메인 | Use Cases |
|--------|-----------|
| Auth | LoginUser, RefreshToken, RegisterUser |
| Subject | Create, Update, Get, GetDetail, Delete |
| Golf Swing | UploadVideo, GetAnalysis, UpdateMemo |
| Body Posture | UploadImages, GetAnalysis, UpdateMemo |
| History | GetHistory, GetCalendarData |

### 4.3 Entities (14개)
| 구분 | Entities |
|------|----------|
| 기본 | Center, User, Subject, Admin |
| 골프 스윙 | GolfSwingAnalysis, GolfSwingResult, GolfSwingAngle, SwingType |
| 체형 분석 | BodyPostureAnalysis, FrontPostureResult, SidePostureResult, BackPostureResult |
| 기타 | Notice, NoticeRead |

### 4.4 Repositories (4개)
- UserRepository
- SubjectRepository
- GolfSwingAnalysisRepository
- BodyPostureAnalysisRepository

### 4.5 External Services (4개)
| 서비스 | 파일 | 역할 |
|--------|------|------|
| S3 Upload | `s3-upload.service.ts` | AWS S3 파일 업로드 |
| REMO API | `remo-api.service.ts` | AI 분석 API 연동 |
| PDF Gen | `pdf-generation.service.ts` | 결과 PDF 생성 |
| Local Storage | `local-storage.service.ts` | 로컬 파일 저장 |

---

## 5. API 엔드포인트

**Base URL:** `http://localhost:3003/api`

### 인증 (`/auth`)
```
POST /auth/login          - 로그인
POST /auth/refresh        - 토큰 갱신
POST /auth/register       - 강사 등록
```

### 대상자 관리 (`/subjects`) [JWT 필수]
```
GET    /subjects          - 목록 조회 (검색, 페이지네이션)
POST   /subjects          - 등록
GET    /subjects/:id      - 상세 조회
PUT    /subjects/:id      - 수정
DELETE /subjects/:id      - 삭제
```

### 골프 스윙 분석 (`/golf-swing`) [JWT 필수]
```
POST  /golf-swing/analyze           - 영상 업로드 및 분석 요청
GET   /golf-swing/analysis/:id      - 분석 결과 조회
PATCH /golf-swing/analysis/:id/memo - 메모 수정
```

### 체형 분석 (`/body-posture`) [JWT 필수]
```
POST  /body-posture/analyze           - 이미지 업로드 (정면/측면/후면)
GET   /body-posture/analysis/:id      - 분석 결과 조회
PATCH /body-posture/analysis/:id/memo - 메모 수정
```

### 분석 이력 (`/history`) [JWT 필수]
```
GET /history/subject/:subjectId           - 대상자별 이력
GET /history/subject/:subjectId/calendar  - 달력 데이터
```

---

## 6. 프론트엔드 페이지 구조

```
frontend/app/
├── page.tsx                     # 루트 (리다이렉트)
├── login/                       # 로그인
├── main/                        # 메인 대시보드
├── password/                    # 비밀번호 변경
├── member/                      # 대상자 관리
│   └── [memberId]/             # 대상자 상세
├── shoot/                       # 촬영 선택
├── body-analysis/               # 체형 분석 업로드
├── body-analysis-loading/       # 체형 분석 진행 중
├── body-analysis-result/        # 체형 분석 결과
├── select-swing/                # 스윙 타입 선택
├── upload-video/                # 비디오 업로드
├── analysis-loading/            # 스윙 분석 진행 중
└── analysis-result/             # 스윙 분석 결과
    └── [phaseId]/              # 단계별 결과
```

### API 서비스 레이어 (lib/)
| 파일 | 역할 |
|------|------|
| `api.ts` | Axios 인스턴스, 인터셉터 |
| `auth.ts` | 로그인, 토큰 갱신 |
| `subjects.ts` | 대상자 CRUD |
| `golf-swing.ts` | 골프 스윙 분석 |
| `body-posture.ts` | 체형 분석 |

---

## 7. 데이터베이스 스키마

### 테이블 관계
```
centers (센터)
  ↓ 1:N
users (강사)
  ↓ 1:N
subjects (대상자)
  ↓ 1:N
  ├─ golf_swing_analyses
  │    ├─ golf_swing_results (1:1)
  │    └─ golf_swing_angles (1:1)
  │
  └─ body_posture_analyses
       ├─ front_posture_results (1:1)
       ├─ side_posture_results (1:1)
       └─ back_posture_results (1:1)
```

### 골프 스윙 8단계
1. Address (어드레스)
2. Takeback (테이크백)
3. Backswing (백스윙)
4. Backswing Top (백스윙 탑)
5. Downswing (다운스윙)
6. Impact (임팩트)
7. Follow-through (팔로우스루)
8. Finish (피니시)

### 체형 분석 측정 항목
| 정면 | 측면 | 후면 |
|------|------|------|
| 머리 균형 | 라운드 숄더 | 머리 균형 |
| 어깨 균형 | 거북목 | 어깨 균형 |
| 골반 균형 | 머리 기울기 | 골반 균형 |
| 무릎 균형 | 전후 기울기 | 무릎 균형 |
| 전신 기울기 | - | 전신 기울기 |
| 다리 Q각 | - | 다리 각도 |

---

## 8. 외부 서비스 연동

### REMO API
**Base URL:** `http://api.remo.re.kr`

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/analysis-golf` | 골프 스윙 분석 요청 |
| `POST /api/analysis-golf-result` | 골프 스윙 결과 조회 |
| `POST /api/analysis-golf-angle` | 각도 데이터 조회 |
| `POST /api/analysis-golf-draw` | 결과 비디오 조회 |
| `POST /api/analysis-skeleton-v2-front` | 정면 체형 분석 |
| `POST /api/analysis-skeleton-v2-side` | 측면 체형 분석 |
| `POST /api/analysis-skeleton-v2-back` | 후면 체형 분석 |

### AWS S3
- 동영상/이미지 파일 저장
- Presigned URL로 접근 권한 관리

### PDF 생성
- Puppeteer 24.x 사용
- 분석 결과 리포트 생성

---

## 9. 구현 상태

### Backend (100% 완료)
- [x] Clean Architecture 구조
- [x] 14개 Entity
- [x] 4개 Repository
- [x] 13개 Use Case
- [x] 5개 Controller
- [x] JWT 인증
- [x] REMO API 연동
- [x] AWS S3 연동
- [x] PDF 생성 서비스
- [x] NestJS 모듈 설정
- [x] 빌드 성공

### Frontend (100% 완료)
- [x] Next.js 16 + React 19
- [x] 15개 페이지
- [x] API 서비스 레이어
- [x] JWT 토큰 자동 갱신
- [x] Form 검증 (Zod)
- [x] UI 컴포넌트 (Radix + Tailwind)

### 통합 테스트 (95% 완료)
- [x] 프론트-백엔드 연동
- [x] CORS 설정
- [x] 환경변수 설정
- [x] 테스트 계정 (instructor001@golf.com / Test1234!)
- [ ] E2E 테스트 이슈 수정 (9개 발견)

---

## 10. 알려진 이슈

### Critical (1개)
| 이슈 | 설명 |
|------|------|
| 체형 분석 이미지 | 이미지 필드 부족 (0/3 → 3개 필요) |

### Major (4개)
| 이슈 | 설명 |
|------|------|
| 로그인 리다이렉트 | 로그인 후 리다이렉트 실패 |
| 회원 목록 | 렌더링 이슈 |
| 스윙 타입 | 옵션 부족 |
| 키 입력 | 필드 누락 |

### Minor (4개)
- UI 요소 표시 문제

---

## 11. Git 브랜치 상태

```
feature/controllers (현재) ← 작업 중
    ↓
develop (기본 브랜치)
    ↓
main (프로덕션)
```

### 최근 커밋
```
dfcaacc feat: Add test account setup and E2E testing support
cdd90f8 fix: Remove duplicate index decorators from Entity unique fields
0b767d1 fix: Add @Inject decorators to Use Cases and fix build errors
0d5ee6a feat: Add Controllers, NestJS module setup, and configuration
```

### 완료된 브랜치
- `feature/dtos` → develop 병합 완료
- `feature/repositories` → develop 병합 완료
- `feature/use-cases` → develop 병합 완료
- `feature/controllers` → 현재 작업 중

---

## 12. 환경 설정

### Backend (.env)
```env
NODE_ENV=development
PORT=3003
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=golf_swing_user
DB_PASSWORD=GolfSwing2024!
DB_DATABASE=golf_swing_db

JWT_SECRET=golf-swing-secret-key-2025

AWS_ACCESS_KEY_ID=****
AWS_SECRET_ACCESS_KEY=****
AWS_S3_BUCKET=sppb-private
AWS_REGION=ap-northeast-2

REMO_API_URL=http://api.remo.re.kr
REMO_API_KEY=****
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3003/api
```

### 테스트 계정
```
Email: instructor001@golf.com
Password: Test1234!
```

---

## 13. 실행 방법

### 백엔드
```bash
cd backend
npm install
npm run build
npm run start:dev  # 개발 모드
npm run start      # 프로덕션 모드
```

### 프론트엔드
```bash
cd frontend
pnpm install
pnpm dev           # 개발 모드 (포트 3000)
pnpm build         # 빌드
pnpm start         # 프로덕션 모드
```

---

## 14. 다음 단계

### 즉시 진행
1. E2E 테스트 이슈 수정
2. REMO API 실제 분석 테스트
3. PDF 템플릿 완성

### 개선 사항
- 이미지/비디오 압축 최적화
- Rate Limiting 추가
- 에러 메시지 개선

### 배포 준비
- 프로덕션 환경변수
- Docker 컨테이너화
- CI/CD 파이프라인

---

## 15. 프로젝트 통계

| 항목 | 수치 |
|------|------|
| 총 코드 라인 | ~8,500 LOC |
| 백엔드 파일 | ~60개 |
| 프론트엔드 파일 | ~25개 |
| 문서 파일 | 14개 |
| Entity | 14개 |
| Use Case | 13개 |
| Controller | 5개 |
| API 엔드포인트 | 15개 |

---

**마지막 업데이트**: 2025-12-11
