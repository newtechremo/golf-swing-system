# Golf Swing System - Setup Guide

## 프로젝트 구조

```
golf_swing_system/
├── backend/                    # NestJS 백엔드
│   ├── src/
│   │   ├── application/       # Application Layer
│   │   │   ├── dto/          # Data Transfer Objects
│   │   │   ├── interfaces/   # Repository Interfaces
│   │   │   └── use-cases/    # Business Logic
│   │   ├── infrastructure/    # Infrastructure Layer
│   │   │   └── database/
│   │   │       ├── entities/ # TypeORM Entities
│   │   │       └── repositories/
│   │   ├── presentation/      # Presentation Layer
│   │   │   ├── controllers/  # API Controllers
│   │   │   └── guards/       # Auth Guards
│   │   ├── app.module.ts     # Main Module
│   │   └── main.ts           # Entry Point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
└── frontend/                  # React 프론트엔드

```

## 백엔드 설치 및 실행

### 1. 의존성 설치

```bash
cd backend
npm install
```

### 2. 데이터베이스 설정

MySQL 데이터베이스를 생성합니다:

```sql
CREATE DATABASE golf_swing_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 환경 변수 설정

`.env` 파일을 확인하고 데이터베이스 정보를 수정합니다:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=golf_swing_system
```

### 4. 애플리케이션 실행

개발 모드:
```bash
npm run start:dev
```

프로덕션 빌드:
```bash
npm run build
npm run start:prod
```

### 5. API 테스트

애플리케이션이 실행되면:
- API Base URL: `http://localhost:4000/api`
- Swagger Documentation (예정): `http://localhost:4000/api/docs`

## API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/login` - 강사 로그인
- `POST /api/auth/refresh` - 토큰 갱신

### 대상자 관리 (Subjects)
- `GET /api/subjects` - 대상자 목록
- `GET /api/subjects/:id` - 대상자 상세
- `POST /api/subjects` - 대상자 등록
- `PUT /api/subjects/:id` - 대상자 수정
- `DELETE /api/subjects/:id` - 대상자 삭제

### 골프 스윙 분석 (Golf Swing)
- `POST /api/golf-swing/analyze` - 스윙 비디오 업로드
- `GET /api/golf-swing/analysis/:id` - 분석 결과 조회
- `PUT /api/golf-swing/analysis/:id/memo` - 메모 업데이트

### 신체 자세 분석 (Body Posture)
- `POST /api/body-posture/analyze` - 자세 이미지 업로드
- `GET /api/body-posture/analysis/:id` - 분석 결과 조회
- `PUT /api/body-posture/analysis/:id/memo` - 메모 업데이트

### 이력 조회 (History)
- `GET /api/history/subject/:subjectId` - 분석 이력
- `GET /api/history/subject/:subjectId/calendar` - 캘린더 데이터

## 다음 단계 (TODO)

### 1. Dependency Injection 수정 필요

모든 UseCase 파일에서 Repository 주입 시 `@Inject()` 데코레이터 추가 필요:

```typescript
// Before
constructor(private readonly repository: IRepository) {}

// After
constructor(
  @Inject('IRepository')
  private readonly repository: IRepository,
) {}
```

### 2. REMO API 연동

`backend/src/infrastructure/external/remo/` 디렉토리에 REMO API 서비스 구현:
- `RemoGolfService` - 골프 스윙 분석 API
- `RemoPostureService` - 신체 자세 분석 API

### 3. S3 파일 업로드

`backend/src/infrastructure/external/s3/` 디렉토리에 S3 서비스 구현:
- 비디오/이미지 업로드
- Presigned URL 생성

### 4. PDF 생성

`backend/src/infrastructure/external/pdf/` 디렉토리에 PDF 서비스 구현:
- 분석 결과 PDF 생성
- 템플릿 관리

### 5. 테스트 작성

- Unit tests for Use Cases
- Integration tests for Controllers
- E2E tests

## 문제 해결

### TypeORM synchronize 관련

개발 환경에서는 `synchronize: true`로 자동 스키마 동기화가 활성화되어 있습니다.
프로덕션에서는 반드시 Migration을 사용하세요.

### JWT Secret

`.env` 파일의 `JWT_SECRET`을 반드시 변경하세요.

### Database Connection

MySQL 8.0+ 사용을 권장합니다.

## 참고 문서

- [RESTRUCTURE_CHANGES.md](../RESTRUCTURE_CHANGES.md) - 시스템 구조 변경 사항
- [CURRENT_STATUS.md](../CURRENT_STATUS.md) - 현재 개발 상태
- [API_SPECIFICATION.md](../API_SPECIFICATION.md) - API 상세 문서
