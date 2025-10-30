# Golf Swing & Body Posture Analysis System

골프 스윙 분석과 체형 분석을 통합한 웹 기반 분석 시스템

## 프로젝트 개요

이 시스템은 REMO API를 활용하여 사용자의 골프 스윙과 체형을 분석하고, 시간에 따른 변화를 추적합니다. SPPB 시스템과 유사한 구조로 설계되었으며, 센터 기반 멀티 테넌시와 휴대폰 번호 인증을 지원합니다.

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
- NestJS 11+ (TypeScript)
- TypeORM 0.3+ (MySQL)
- JWT 인증
- AWS S3 (파일 저장)
- REMO API 연동

### Frontend
- React 18+
- Tailwind CSS
- React Calendar
- Axios

### Database
- MySQL 8.0+
- utf8mb4 charset

## 프로젝트 구조

```
golf_swing_system/
├── backend/                    # NestJS 백엔드
│   ├── src/
│   │   ├── presentation/       # Controllers, DTOs
│   │   ├── application/        # Use Cases
│   │   ├── domain/            # Entities, Value Objects
│   │   └── infrastructure/    # Repositories, External Services
│   └── package.json
│
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── test_data/                 # 테스트용 데이터
│   ├── swing.mp4              # 골프 스윙 동영상
│   ├── front.jpg              # 정면 사진
│   ├── side.JPG               # 측면 사진
│   └── back.jpg               # 후면 사진
│
├── api-responses/             # API 응답 샘플
│   ├── front-posture.json
│   ├── side-posture.json
│   ├── back-posture.json
│   └── metrics-only.json
│
├── database-schema.sql        # 데이터베이스 스키마
├── SYSTEM_ARCHITECTURE.md     # 시스템 아키텍처 문서
├── test-remo-apis.js         # REMO API 테스트 스크립트
└── README.md                  # 이 파일
```

## API 테스트 결과

### 체형 분석 API
✅ **성공**: 정면, 측면, 후면 분석 모두 정상 작동 확인

**샘플 응답**:
```json
{
  "state": true,
  "status_code": 200,
  "uuid": "...",
  "credit_change": -1,
  "far_head_bal_m_": -0.228,      // 측정값 (degree)
  "far_head_bal_grade": 0,         // 등급 (-2 ~ 2)
  "far_pelvic_bal_m_": 0.024,
  // ... 다른 측정값들
}
```

### 골프 스윙 분석 API
⚠️ **인증 필요**: 유효한 REMO API 크레딧이 필요합니다.

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

## API 명세

### 골프 스윙 분석
- `POST /api/golf-swing/upload`: 동영상 업로드 및 분석 요청
- `GET /api/golf-swing/result/:analysisId`: 분석 결과 조회
- `PATCH /api/golf-swing/:analysisId/memo`: 메모 추가/수정

### 체형 분석
- `POST /api/posture/upload`: 이미지 업로드 및 분석 요청
- `GET /api/posture/result/:analysisId`: 분석 결과 조회
- `PATCH /api/posture/:analysisId/memo`: 메모 추가/수정

### 달력 조회
- `GET /api/analysis/calendar/:userId?year=2025&month=10`: 월별 이력 조회

상세 API 명세는 `SYSTEM_ARCHITECTURE.md` 참조

## 환경 설정

### Backend 환경변수 (.env)
```env
# Database
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=golf_swing_db

# JWT
JWT_SECRET=your_jwt_secret
JWT_ACCESS_TOKEN_EXPIRATION=1h
JWT_REFRESH_TOKEN_EXPIRATION=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name

# REMO API
REMO_API_EMAIL=your_email@example.com
REMO_API_USER_KEY=your_user_key
REMO_API_KEY=your_api_key
REMO_API_BASE_URL=http://api.remo.re.kr
```

## 설치 및 실행

### 데이터베이스 설정
```bash
# MySQL에서 데이터베이스 생성
mysql -u root -p
CREATE DATABASE golf_swing_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 스키마 적용
mysql -u root -p golf_swing_db < database-schema.sql
```

### Backend 설정
```bash
cd backend
npm install
cp .env.example .env
# .env 파일 수정 (위의 환경변수 참조)
npm run start:dev
```

### Frontend 설정
```bash
cd frontend
npm install
npm start
```

## API 테스트

REMO API 연동 테스트:
```bash
# 체형 분석 API 테스트 (test_data 폴더의 이미지 사용)
node test-remo-apis.js
```

테스트 결과는 `api-responses/` 폴더에 저장됩니다.

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

## 구현 참고 사항

### SPPB 시스템과의 유사점
- Clean Architecture (DDD) 구조
- 센터 기반 멀티 테넌시
- 휴대폰 번호 (HP) 인증
- JWT 토큰 기반 인증
- TypeORM + MySQL 사용
- AWS S3 파일 저장

### 주요 차이점
- **분석 타입**: SPPB (보행 분석) → Golf Swing (골프 스윙 분석)
- **추가 기능**: 체형 분석 (정면/측면/후면)
- **결과 뷰**: 달력 기반 이력 조회
- **메모 기능**: 분석 결과에 메모 추가

## 다음 단계

1. **Backend 구현**
   - NestJS 프로젝트 초기화
   - 데이터베이스 엔티티 생성
   - REMO API 서비스 구현
   - S3 업로드 서비스 구현
   - 컨트롤러 및 Use Cases 구현

2. **Frontend 구현**
   - React 프로젝트 초기화
   - 센터 선택 페이지
   - HP 로그인 페이지
   - 동영상/사진 업로드 페이지
   - 달력 조회 페이지
   - 분석 결과 상세 페이지

3. **통합 테스트**
   - End-to-End 테스트
   - 성능 테스트
   - 보안 테스트

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
