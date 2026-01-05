# Golf Swing & Body Posture Analysis System

골프 스윙 분석과 체형 분석을 통합한 웹 기반 분석 시스템

## 프로젝트 개요

이 시스템은 REMO API를 활용하여 골프 스윙과 체형을 분석하고, 시간에 따른 변화를 추적합니다. Clean Architecture 패턴을 적용하여 설계되었으며, 강사-대상자 구조로 운영됩니다.

**현재 상태**: ✅ **개발 완료** (Backend + Frontend 통합 완료, 2025-10-31 기준)

## 주요 기능

### 1. 골프 스윙 분석
- 동영상 업로드를 통한 골프 스윙 분석
- 8단계 스윙 분석 (Address, Takeback, Backswing, Backswing Top, Downswing, Impact, Follow-through, Finish)
- 프레임별 각도 데이터 (무릎, 골반, 어깨)
- 분석 결과 비디오 제공

### 2. 체형 분석
- 정면/측면/후면 사진 업로드
- 자세 균형 및 기울기 측정
- 측정 항목:
  - **정면**: 머리/골반/어깨/무릎 균형, 다리 Q각
  - **측면**: 라운드 숄더, 거북목, 머리/전신 기울기
  - **후면**: 머리/골반/어깨/무릎 균형, 다리 각도

### 3. 달력 기반 이력 관리
- 월간 달력 뷰에서 측정 날짜 표시
- 날짜별 분석 결과 조회
- 골프 스윙 / 체형 분석 구분

### 4. 메모 기능
- 각 분석 결과에 메모 추가/수정
- 트레이너 관찰 사항 기록

## 기술 스택

### Backend
- **NestJS** 10.3+ (TypeScript)
- **TypeORM** 0.3.19 (MySQL)
- **JWT** 인증 (Access + Refresh Token)
- **AWS S3** 파일 저장
- **REMO API** 연동 (골프 스윙, 체형 분석)
- **Clean Architecture** (DDD 패턴)
- 포트: **3003**

### Frontend
- **React** 19.1+ (Vite 7)
- **Tailwind CSS** 4.1+
- **React Router DOM** 7.9+
- **React Hook Form** 7.65+
- **Axios** 1.13+
- 포트: **5173**

### Database
- **MySQL** 8.0+
- utf8mb4 charset
- 14개 테이블 (Center, User, Subject, GolfSwing, BodyPosture 등)

## 프로젝트 구조

```
golf_swing_system/
├── backend/                           # NestJS 백엔드
│   ├── src/
│   │   ├── presentation/             # ✅ Controllers, Guards, DTOs
│   │   │   ├── controllers/          # 5개 컨트롤러 (auth, subject, golf-swing, body-posture, history)
│   │   │   └── guards/               # JWT 인증 가드
│   │   ├── application/              # ✅ Use Cases, DTOs
│   │   │   ├── use-cases/            # 비즈니스 로직 (13개 Use Cases)
│   │   │   └── dto/                  # 요청/응답 DTO
│   │   ├── domain/                   # ✅ Entities (14개)
│   │   └── infrastructure/           # ✅ Repositories, External Services
│   │       ├── database/             # TypeORM Repositories
│   │       └── external-services/    # S3, REMO API, PDF 생성
│   ├── dist/                         # 빌드 결과물
│   └── package.json
│
├── frontend/                         # React 프론트엔드
│   ├── src/
│   │   ├── components/              # ✅ 재사용 컴포넌트
│   │   ├── pages/                   # ✅ 11개 페이지 (Login, Dashboard, Subject, GolfSwing, Posture 등)
│   │   ├── services/                # ✅ API 서비스 레이어
│   │   ├── constants/               # API 엔드포인트 상수
│   │   ├── contexts/                # React Context
│   │   ├── hooks/                   # Custom Hooks
│   │   └── utils/                   # 유틸리티 함수
│   └── package.json
│
├── test_data/                       # 테스트용 샘플 데이터
├── api-responses/                   # REMO API 응답 샘플
├── database-schema.sql              # MySQL 스키마
│
├── README.md                        # 이 파일
├── CURRENT_STATUS.md                # ✅ 최신 프로젝트 상태
├── SYSTEM_ARCHITECTURE.md           # 시스템 아키텍처
├── API_SPECIFICATION.md             # API 명세서
├── FRONTEND_DEVELOPMENT_GUIDE.md    # 프론트엔드 개발 가이드
├── INTEGRATION_COMPLETE.md          # ✅ 프론트-백엔드 통합 완료 보고서
└── E2E_TEST_REPORT.md               # ✅ E2E 테스트 리포트
```

## 구현 완료 현황

### ✅ 백엔드 (100% 완료)
- [x] Clean Architecture 구조
- [x] 14개 Entity (TypeORM)
- [x] 4개 Repository 구현
- [x] 13개 Use Cases 구현
- [x] 5개 Controllers (auth, subject, golf-swing, body-posture, history)
- [x] JWT 인증 (Access + Refresh Token)
- [x] AWS S3 파일 업로드
- [x] REMO API 연동
- [x] PDF 생성 서비스
- [x] NestJS 모듈 설정
- [x] 빌드 성공

### ✅ 프론트엔드 (100% 완료)
- [x] React 19 + Vite 7 구성
- [x] 11개 페이지 구현
  - Login (강사 로그인)
  - Dashboard (대시보드)
  - SubjectList, SubjectForm, SubjectDetail (대상자 관리)
  - GolfSwingUpload, GolfSwingResult (골프 스윙 분석)
  - PostureUpload, PostureResult (체형 분석)
  - AnalysisHistory (분석 이력)
- [x] API 서비스 레이어 (auth, subject, golfSwing, posture, history)
- [x] JWT 토큰 자동 갱신
- [x] React Hook Form 폼 검증
- [x] Tailwind CSS 스타일링

### ✅ 통합 테스트
- [x] 프론트엔드-백엔드 API 연동
- [x] CORS 설정 완료
- [x] E2E 테스트 실행
- [x] 테스트 계정 설정

## 데이터베이스 스키마

### 핵심 테이블
- `centers`: 센터 정보
- `users`: 사용자 정보 (HP 로그인)
- `golf_swing_analyses`: 골프 스윙 분석 기본 정보
- `golf_swing_results`: 스윙 단계별 측정 결과
- `golf_swing_angles`: 프레임별 각도 데이터 (JSON)
- `body_posture_analyses`: 체형 분석 기본 정보
- `front_posture_results`: 정면 체형 분석 결과
- `side_posture_results`: 측면 체형 분석 결과
- `back_posture_results`: 후면 체형 분석 결과

상세 스키마는 `database-schema.sql` 참조

## API 엔드포인트

> 💡 **Base URL**: `http://localhost:3003/api`

### 인증 (`/auth`)
- `POST /auth/login` - 강사 로그인 (username + password)
- `POST /auth/refresh` - Access Token 갱신

### 대상자 관리 (`/subjects`) 🔒
- `GET /subjects` - 대상자 목록 조회 (검색, 페이지네이션)
- `POST /subjects` - 대상자 등록
- `GET /subjects/:id` - 대상자 상세 조회
- `PUT /subjects/:id` - 대상자 정보 수정
- `DELETE /subjects/:id` - 대상자 삭제

### 골프 스윙 분석 (`/golf-swing`) 🔒
- `POST /golf-swing/analyze` - 동영상 업로드 및 분석 요청
- `GET /golf-swing/analysis/:id` - 분석 결과 조회
- `PATCH /golf-swing/analysis/:id/memo` - 메모 추가/수정

### 체형 분석 (`/body-posture`) 🔒
- `POST /body-posture/analyze` - 이미지 업로드 및 분석 요청 (전면/측면/후면)
- `GET /body-posture/analysis/:id` - 분석 결과 조회
- `PATCH /body-posture/analysis/:id/memo` - 메모 추가/수정

### 분석 이력 (`/history`) 🔒
- `GET /history/subject/:subjectId` - 대상자별 분석 이력 조회
- `GET /history/subject/:subjectId/calendar` - 달력 데이터 조회

🔒 = JWT 인증 필요

상세 API 명세는 `API_SPECIFICATION.md` 참조

## 환경 설정

### Backend 환경변수 (`backend/.env`)
```env
# Application
NODE_ENV=development
PORT=3003
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=golf_swing_user
DB_PASSWORD=your_password
DB_DATABASE=golf_swing_db

# JWT
JWT_SECRET=your-secret-key-here

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-northeast-2

# REMO API
REMO_API_URL=http://api.remo.re.kr
REMO_API_KEY=your_api_key
REMO_API_EMAIL=your_email@example.com
REMO_API_USER_KEY=your_user_key
```

### Frontend 환경변수 (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3003/api
```

## 설치 및 실행

### 1. 데이터베이스 설정
```bash
# MySQL에서 데이터베이스 생성
mysql -u root -p
CREATE DATABASE golf_swing_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'golf_swing_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON golf_swing_db.* TO 'golf_swing_user'@'localhost';
FLUSH PRIVILEGES;

# 스키마 적용
mysql -u root -p golf_swing_db < database-schema.sql
```

### 2. Backend 설정 및 실행
```bash
cd backend
npm install

# 환경변수 설정
# backend/.env 파일 생성 후 위의 환경변수 입력

# 빌드
npm run build

# 개발 서버 실행
npm run start:dev

# → http://localhost:3003/api 에서 실행됨
```

### 3. Frontend 설정 및 실행
```bash
cd frontend
npm install

# 환경변수 설정
# frontend/.env 파일 생성:
# VITE_API_BASE_URL=http://localhost:3003/api

# 개발 서버 실행
npm run dev

# → http://localhost:5173 에서 실행됨
```

### 4. 테스트 계정
기본 강사 계정:
- **Username**: `instructor001`
- **Password**: `password123`

## API 테스트

### 백엔드 API 테스트 (curl)
```bash
# 로그인 테스트
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"instructor001","password":"password123"}'

# 대상자 목록 조회 (JWT 토큰 필요)
curl -X GET http://localhost:3003/api/subjects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### REMO API 연동 테스트
```bash
# 체형 분석 API 테스트
node test-remo-apis.js
```

테스트 결과는 `api-responses/` 폴더에 저장됩니다.

### E2E 테스트
```bash
cd frontend
node e2e-test.cjs
```

E2E 테스트 리포트: `frontend/E2E_TEST_REPORT.md`

## REMO API 사용량

### 크레딧 소비
- **체형 분석**:
  - 정면 또는 측면 단독: 1 크레딧
  - 정면 + 측면 + 후면: 2 크레딧
- **골프 스윙 분석**: 요청 당 크레딧 차감 (문서 확인 필요)

### API 엔드포인트

#### 골프 스윙 분석
- `POST http://api.remo.re.kr/api/analysis-golf`: 분석 요청
- `POST http://api.remo.re.kr/api/analysis-golf-result`: 결과 조회
- `POST http://api.remo.re.kr/api/analysis-golf-angle`: 각도 데이터 조회
- `POST http://api.remo.re.kr/api/analysis-golf-draw`: 결과 비디오 조회

#### 체형 분석
- `POST http://api.remo.re.kr/api/analysis-skeleton-v2-front`: 정면 분석
- `POST http://api.remo.re.kr/api/analysis-skeleton-v2-side`: 측면 분석
- `POST http://api.remo.re.kr/api/analysis-skeleton-v2-back`: 후면 분석

## Git 브랜치 전략

현재 브랜치: `feature/controllers`

```
main (프로덕션)
└── develop (개발)
    ├── feature/dtos ✅ (merged)
    ├── feature/repositories ✅ (merged)
    ├── feature/use-cases ✅ (merged)
    ├── feature/controllers ✅ (현재)
    ├── feature/services-remo
    └── feature/services-pdf
```

상세 브랜치 전략: `README_BRANCHING_STRATEGY.md` 참조

## 최근 커밋 이력

```
dfcaacc - feat: Add test account setup and E2E testing support
cdd90f8 - fix: Remove duplicate index decorators from Entity unique fields
0b767d1 - fix: Add @Inject decorators to Use Cases and fix build errors
0d5ee6a - feat: Add Controllers, NestJS module setup, and configuration
93ee5ff - Merge feature/use-cases into develop
ca61de9 - feat: Implement all use-cases for golf swing analysis system
```

## 다음 단계

### 즉시 가능한 작업
1. ✅ **기능 테스트**: 실제 데이터로 E2E 테스트
2. ✅ **버그 수정**: E2E 테스트에서 발견된 이슈 수정
3. ⏳ **PDF 생성**: PDF 생성 서비스 완성 및 테스트
4. ⏳ **배포 준비**: 프로덕션 환경 설정

### 개선 사항
1. 에러 핸들링 강화
2. 로딩 상태 UI 개선
3. 반응형 디자인 최적화
4. 성능 최적화 (이미지/비디오 압축)
5. 보안 강화 (Rate Limiting, Input Validation)

## 라이선스

이 프로젝트는 내부용 시스템입니다.

## 연락처

문의사항이 있으시면 프로젝트 관리자에게 연락해주세요.

---

## 부록: 분석 결과 샘플

### 정면 체형 분석
```json
{
  "headBalance": { "value": -0.228, "grade": 0 },
  "pelvicBalance": { "value": 0.024, "grade": 0 },
  "shoulderBalance": { "value": -0.511, "grade": 0 },
  "kneeBalance": { "value": -0.263, "grade": 0 },
  "bodyTilt": { "value": 0.056, "grade": 0 },
  "leftLegQAngle": { "value": -2.108, "grade": 0 },
  "rightLegQAngle": { "value": -3.698, "grade": 0 }
}
```

### 측면 체형 분석
```json
{
  "roundShoulder": { "value": 1.454, "grade": 0 },
  "turtleNeck": { "value": 29.656, "grade": 0 },
  "headTilt": { "value": -2.935, "grade": -1 },
  "bodyTilt": { "value": 6.961, "grade": 0 }
}
```

### 후면 체형 분석
```json
{
  "headBalance": { "value": -1.561, "grade": -1 },
  "pelvicBalance": { "value": -0.699, "grade": 0 },
  "shoulderBalance": { "value": 0.06, "grade": 0 },
  "kneeBalance": { "value": -1.047, "grade": 0 },
  "bodyTilt": { "value": 0.067, "grade": 0 },
  "leftLegQAngle": { "value": -2.514, "grade": 0 },
  "rightLegQAngle": { "value": -3.903, "grade": 0 }
}
```

등급 기준:
- **-2**: 위험 (왼쪽으로 심하게 기울어짐)
- **-1**: 주의 (왼쪽으로 기울어짐)
- **0**: 정상
- **1**: 주의 (오른쪽으로 기울어짐)
- **2**: 위험 (오른쪽으로 심하게 기울어짐)
