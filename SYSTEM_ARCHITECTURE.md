# Golf Swing & Body Posture Analysis System
## 시스템 아키텍처 문서

## 목차
1. [시스템 개요](#시스템-개요)
2. [시스템 구조](#시스템-구조)
3. [주요 기능](#주요-기능)
4. [데이터 플로우](#데이터-플로우)
5. [API 명세](#api-명세)
6. [데이터베이스 스키마](#데이터베이스-스키마)
7. [기술 스택](#기술-스택)

---

## 시스템 개요

### 목적
골프 스윙 분석과 체형 분석을 통해 사용자의 자세를 평가하고, 시간에 따른 변화를 추적하는 시스템

### 주요 특징
- 센터 기반 멀티 테넌시 구조
- 사용자 HP(휴대폰 번호) 기반 인증
- REMO API를 활용한 골프 스윙 및 체형 분석
- 달력 기반 측정 이력 관리
- 분석 결과에 대한 메모 기능

---

## 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - 센터 선택                                                  │
│  - 유저 HP 로그인                                             │
│  - 동영상/사진 업로드                                          │
│  - 달력 기반 결과 조회                                         │
│  - 분석 결과 상세보기 + 메모                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Presentation Layer (Controllers)             │ │
│  │  - AuthController                                      │ │
│  │  - UserController                                      │ │
│  │  - GolfSwingController                                 │ │
│  │  - PostureAnalysisController                           │ │
│  │  - AdminController                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Application Layer (Use Cases)                  │ │
│  │  - StartGolfSwingAnalysis                              │ │
│  │  - GetGolfSwingResult                                  │ │
│  │  - UploadPostureImages                                 │ │
│  │  - GetPostureAnalysisResult                            │ │
│  │  - AddMemoToAnalysis                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Domain Layer (Entities)                   │ │
│  │  - User, Center, Admin                                 │ │
│  │  - GolfSwingAnalysis, BodyPostureAnalysis              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       Infrastructure Layer (Repositories & Services)   │ │
│  │  - TypeORM Repositories                                │ │
│  │  - REMOApiService (외부 API)                            │ │
│  │  - S3StorageService (파일 저장)                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌──────────────────┐  ┌─────────────┐
          │   MySQL Database │  │   AWS S3    │
          │  - 사용자 정보    │  │ - 비디오    │
          │  - 분석 결과      │  │ - 이미지    │
          └──────────────────┘  └─────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │   REMO API       │
          │  - Golf Analysis │
          │  - Posture Analysis │
          └──────────────────┘
```

---

## 주요 기능

### 1. 센터 선택 및 사용자 인증
- **센터 선택**: 드롭다운에서 센터 선택
- **HP 로그인**: 휴대폰 번호로 사용자 인증
  - 기존 사용자: 즉시 로그인
  - 신규 사용자: 기본 정보 입력 후 자동 가입

### 2. 골프 스윙 분석
**워크플로우**:
1. 사용자가 골프 스윙 동영상 업로드 (mp4)
2. 백엔드에서 S3에 동영상 저장
3. REMO Golf Analysis API 호출
   - `POST /api/analysis-golf`: 분석 요청
   - 대기 시간 후 결과 조회
4. 분석 결과 저장:
   - `golf_swing_analyses`: 기본 정보 및 상태
   - `golf_swing_results`: 각 스윙 단계별 측정값
   - `golf_swing_angles`: 프레임별 각도 데이터 (JSON)
5. 사용자에게 결과 표시 + 메모 추가 가능

**분석 단계**:
- Address (어드레스)
- Takeback (테이크백)
- Backswing (백스윙)
- Backswing Top (백스윙 탑)
- Downswing (다운스윙)
- Impact (임팩트)
- Follow-through (팔로우스루)
- Finish (피니시)

### 3. 체형 분석
**워크플로우**:
1. 사용자가 3장의 사진 업로드 (정면, 측면, 후면)
2. 백엔드에서 S3에 이미지 저장
3. REMO Skeleton Analysis API 호출 (3개의 API):
   - `POST /api/analysis-skeleton-v2-front`: 정면 분석
   - `POST /api/analysis-skeleton-v2-side`: 측면 분석
   - `POST /api/analysis-skeleton-v2-back`: 후면 분석
4. 각 분석 결과를 별도 테이블에 저장:
   - `front_posture_results`: 정면 체형 분석 결과
   - `side_posture_results`: 측면 체형 분석 결과
   - `back_posture_results`: 후면 체형 분석 결과
5. 통합 결과 화면에 표시 + 메모 추가 가능

**측정 항목**:

#### 정면 (Front)
- 머리 균형 (Head Balance)
- 골반 균형 (Pelvic Balance)
- 어깨 균형 (Shoulder Balance)
- 무릎 균형 (Knee Balance)
- 전신 기울기 (Body Tilt)
- 좌/우 다리 Q각 (Left/Right Leg Q-angle)

#### 측면 (Side)
- 라운드 숄더 (Round Shoulder)
- 거북목 (Turtle Neck)
- 머리 기울기 (Head Tilt)
- 전후 기울기 (Body Tilt)

#### 후면 (Back)
- 머리 균형 (Head Balance)
- 골반 균형 (Pelvic Balance)
- 어깨 균형 (Shoulder Balance)
- 무릎 균형 (Knee Balance)
- 전신 기울기 (Body Tilt)
- 좌/우 다리 각도 (Left/Right Leg Angle)

### 4. 달력 기반 결과 조회
- 월간 달력 뷰에서 측정 날짜 표시
- 날짜 클릭 시 해당 날짜의 분석 결과 조회
- 골프 스윙 / 체형 분석 구분 표시

### 5. 메모 기능
- 각 분석 결과에 메모 추가/수정 가능
- 트레이너나 사용자가 관찰 사항 기록

---

## 데이터 플로우

### 골프 스윙 분석 플로우

```
[사용자]
    │
    ├─ 1. 동영상 업로드 (mp4)
    ▼
[Frontend]
    │
    ├─ 2. POST /api/golf-swing/upload
    │     - FormData: video file
    │     - Body: { userId, height }
    ▼
[Backend]
    │
    ├─ 3. S3에 동영상 저장
    ├─ 4. DB에 분석 레코드 생성 (status: 'pending')
    ├─ 5. REMO API 호출
    │     POST /api/analysis-golf
    │     {
    │       bucket_url: s3_url,
    │       id: email,
    │       uuid: unique_id,
    │       height: "170",
    │       credit: 1000
    │     }
    │     Response: { state, wait_time, uuid }
    ├─ 6. 상태 'processing'으로 변경
    ▼
[REMO API] - 분석 처리 (wait_time 초)
    │
    ├─ 7. 분석 완료 후 결과 조회
    │     POST /api/analysis-golf-result { id, uuid }
    │     POST /api/analysis-golf-angle { id, uuid }
    │     POST /api/analysis-golf-draw { id, uuid }
    ▼
[Backend]
    │
    ├─ 8. 결과 파싱 및 DB 저장
    │     - golf_swing_results 테이블
    │     - golf_swing_angles 테이블
    ├─ 9. 상태 'completed'로 변경
    ▼
[Frontend] - 결과 화면 표시
```

### 체형 분석 플로우

```
[사용자]
    │
    ├─ 1. 3장의 사진 업로드 (정면, 측면, 후면)
    ▼
[Frontend]
    │
    ├─ 2. POST /api/posture/upload
    │     FormData: frontImage, sideImage, backImage
    │     Body: { userId }
    ▼
[Backend]
    │
    ├─ 3. S3에 이미지 저장
    ├─ 4. DB에 분석 레코드 생성
    ├─ 5. 이미지를 base64로 변환
    ├─ 6-1. REMO API 호출 (정면)
    │       POST /api/analysis-skeleton-v2-front
    │       { Email, UserKey, APIKey, forigimg: base64 }
    ├─ 6-2. REMO API 호출 (측면)
    │       POST /api/analysis-skeleton-v2-side
    │       { Email, UserKey, APIKey, sorigimg: base64 }
    ├─ 6-3. REMO API 호출 (후면)
    │       POST /api/analysis-skeleton-v2-back
    │       { Email, UserKey, APIKey, borigimg: base64 }
    ▼
[REMO API] - 즉시 분석 (동기)
    │
    ├─ 7. 각 분석 결과 수신
    │     {
    │       state, status_code, uuid,
    │       *_m_: 측정값(degree),
    │       *_grade: 등급,
    │       *origimg: 결과 이미지(base64),
    │       *_coords: 좌표 데이터(JSON)
    │     }
    ▼
[Backend]
    │
    ├─ 8. 결과 파싱 및 DB 저장
    │     - front_posture_results
    │     - side_posture_results
    │     - back_posture_results
    ├─ 9. 결과 이미지 S3 저장
    ▼
[Frontend] - 통합 결과 화면 표시
```

---

## API 명세

### 인증 (Auth)

#### POST /api/auth/login
사용자 로그인 (HP 기반)

**Request**:
```json
{
  "centerId": 1,
  "phoneNumber": "010-1234-5678"
}
```

**Response**:
```json
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": 1,
    "name": "홍길동",
    "phoneNumber": "010-1234-5678",
    "centerId": 1
  }
}
```

#### POST /api/auth/register
신규 사용자 등록

**Request**:
```json
{
  "centerId": 1,
  "phoneNumber": "010-1234-5678",
  "name": "홍길동",
  "birthDate": "1990-01-01",
  "gender": "M",
  "height": 175.5,
  "weight": 70.0
}
```

---

### 골프 스윙 분석

#### POST /api/golf-swing/upload
골프 스윙 동영상 업로드 및 분석 요청

**Request** (multipart/form-data):
- `video`: File (mp4)
- `userId`: number
- `height`: string (cm)

**Response**:
```json
{
  "analysisId": 123,
  "uuid": "abc-123-def",
  "status": "processing",
  "waitTime": 15
}
```

#### GET /api/golf-swing/result/:analysisId
골프 스윙 분석 결과 조회

**Response**:
```json
{
  "analysis": {
    "id": 123,
    "userId": 1,
    "uuid": "abc-123-def",
    "analysisDate": "2025-10-30",
    "status": "completed",
    "videoUrl": "https://...",
    "memo": "스윙 개선 필요"
  },
  "result": {
    "address": {
      "frame": 10,
      "stance": 1.2,
      "upperBodyTilt": 15.3,
      "shoulderTilt": 2.1,
      "headLocation": 0.5
    },
    "takeback": { ... },
    "backswing": { ... },
    // ... 다른 단계들
  },
  "angles": {
    "kneeLine": [[0, -1.657, 2.209], ...],
    "pelvis": [[-17.104, 1.751, -2.743], ...],
    "shoulderLine": [[31.057, 5.993, 3.145], ...]
  }
}
```

#### PATCH /api/golf-swing/:analysisId/memo
분석 결과에 메모 추가/수정

**Request**:
```json
{
  "memo": "백스윙 시 어깨 회전 부족"
}
```

---

### 체형 분석

#### POST /api/posture/upload
체형 분석 이미지 업로드 및 분석 요청

**Request** (multipart/form-data):
- `frontImage`: File (jpg/png)
- `sideImage`: File (jpg/png)
- `backImage`: File (jpg/png)
- `userId`: number

**Response**:
```json
{
  "analysisId": 456,
  "frontStatus": "completed",
  "sideStatus": "completed",
  "backStatus": "completed"
}
```

#### GET /api/posture/result/:analysisId
체형 분석 결과 조회

**Response**:
```json
{
  "analysis": {
    "id": 456,
    "userId": 1,
    "analysisDate": "2025-10-30",
    "memo": "자세 개선 중"
  },
  "front": {
    "headBalance": { "value": -0.228, "grade": 0 },
    "pelvicBalance": { "value": 0.024, "grade": 0 },
    "shoulderBalance": { "value": -0.511, "grade": 0 },
    "kneeBalance": { "value": -0.263, "grade": 0 },
    "bodyTilt": { "value": 0.056, "grade": 0 },
    "leftLegQAngle": { "value": -2.108, "grade": 0 },
    "rightLegQAngle": { "value": -3.698, "grade": 0 },
    "resultImageUrl": "https://..."
  },
  "side": {
    "roundShoulder": { "value": 1.454, "grade": 0 },
    "turtleNeck": { "value": 29.656, "grade": 0 },
    "headTilt": { "value": -2.935, "grade": -1 },
    "bodyTilt": { "value": 6.961, "grade": 0 },
    "resultImageUrl": "https://..."
  },
  "back": { ... }
}
```

---

### 달력 기반 조회

#### GET /api/analysis/calendar/:userId
사용자의 월별 분석 이력 조회

**Query Parameters**:
- `year`: number
- `month`: number (1-12)

**Response**:
```json
{
  "year": 2025,
  "month": 10,
  "analyses": [
    {
      "date": "2025-10-15",
      "golfSwing": [
        { "id": 123, "time": "14:30" }
      ],
      "posture": [
        { "id": 456, "time": "15:00" }
      ]
    },
    {
      "date": "2025-10-20",
      "golfSwing": [
        { "id": 124, "time": "10:00" }
      ]
    }
  ]
}
```

---

## 데이터베이스 스키마

상세 스키마는 `database-schema.sql` 참조

### 핵심 테이블 구조

```
centers (센터)
  ↓ (1:N)
users (사용자)
  ↓ (1:N)
  ├─ golf_swing_analyses (골프 스윙 분석)
  │    ↓ (1:1)
  │    ├─ golf_swing_results (스윙 결과)
  │    └─ golf_swing_angles (각도 데이터)
  │
  └─ body_posture_analyses (체형 분석)
       ↓ (1:1)
       ├─ front_posture_results (정면 결과)
       ├─ side_posture_results (측면 결과)
       └─ back_posture_results (후면 결과)
```

### Grade 스케일
- **정면/후면 균형**: -2 (위험) ~ 0 (정상) ~ 2 (위험)
- **측면 자세**: 0 (정상), 1 (주의), 2 (위험)

---

## 기술 스택

### Frontend
- **Framework**: React 18+
- **State Management**: React Context API or Redux Toolkit
- **UI Library**:
  - Tailwind CSS (스타일링)
  - React Calendar (달력 뷰)
  - React Dropzone (파일 업로드)
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Backend
- **Framework**: NestJS 11+
- **Language**: TypeScript
- **Architecture**: Clean Architecture (DDD)
  - Presentation Layer (Controllers, DTOs)
  - Application Layer (Use Cases)
  - Domain Layer (Entities, Value Objects)
  - Infrastructure Layer (Repositories, External Services)
- **ORM**: TypeORM 0.3+
- **Authentication**: JWT (Passport-JWT)
- **File Upload**: Multer
- **Validation**: class-validator, class-transformer

### Database
- **Primary DB**: MySQL 8.0+
- **Charset**: utf8mb4 (이모지 지원)
- **Engine**: InnoDB (트랜잭션 지원)

### Storage
- **File Storage**: AWS S3
  - 동영상 파일
  - 이미지 파일
  - 분석 결과 이미지

### External APIs
- **REMO API**
  - Golf Analysis API
  - Skeleton Analysis API (Front/Side/Back)

### DevOps
- **Version Control**: Git
- **Package Manager**: npm
- **Environment**: Node.js 22+

---

## 보안 고려사항

1. **인증**
   - JWT 기반 토큰 인증
   - Access Token + Refresh Token 전략
   - 센터별 데이터 격리

2. **데이터 보호**
   - 개인정보 암호화 (필요 시)
   - S3 Private Bucket 사용
   - Presigned URL로 임시 접근 권한 부여

3. **API 보안**
   - REMO API Key 환경변수 관리
   - Rate Limiting (요청 제한)
   - CORS 설정

---

## 확장 가능성

1. **알림 기능**
   - 분석 완료 시 푸시 알림
   - 정기 검사 알림

2. **비교 분석**
   - 이전 결과와 현재 결과 비교
   - 개선도 그래프 표시

3. **AI 추천**
   - 분석 결과 기반 운동 추천
   - 자세 개선 가이드

4. **다국어 지원**
   - i18n 적용

5. **모바일 앱**
   - React Native 또는 Flutter

---

## 참고 문서
- REMO API 문서: https://remo.gitbook.io/remo-api-docs/
- sppb-system 구조 참조
- database-schema.sql
- test-remo-apis.js (API 테스트 스크립트)
