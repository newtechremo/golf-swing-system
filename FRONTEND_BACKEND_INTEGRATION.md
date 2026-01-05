# 프론트엔드-백엔드 통합 작업 현황

> **작성일**: 2025-10-31
> **상태**: 진행 중
> **프론트엔드 포트**: http://localhost:5173
> **백엔드 포트**: http://localhost:3003

---

## 1. 완료된 작업

### ✅ 프론트엔드 API 연동 설정
- [x] `.env` 파일 생성 (`VITE_API_BASE_URL=http://localhost:3003/api`)
- [x] Axios 인스턴스 설정 (Base URL: `http://localhost:3003/api`)
- [x] JWT 토큰 자동 갱신 인터셉터 구현
- [x] API 에러 핸들링 유틸리티 구현

### ✅ 서비스 레이어 업데이트
- [x] **AuthService** - 인증 관련 API
- [x] **SubjectService** - 회원(대상자) 관리 API (백엔드 `/members/*` 사용)
- [x] **GolfSwingService** - 골프 스윙 분석 API
- [x] **PostureService** - 체형 분석 API
- [x] **HistoryService** - 분석 이력 조회 API

### ✅ 페이지 컴포넌트 업데이트
- [x] **GolfSwingUpload**: FormData 필드 수정
  - 클럽 종류 → 스윙 타입 (`full` | `half`)
  - 키(height) 입력 필드 추가
- [x] **PostureUpload**: 후면 이미지 필드 추가 (`backImage`)
  - 전면, 측면, 후면 3개 이미지 모두 필수

---

## 2. 발견된 API 엔드포인트 및 필드명 불일치

### ⚠️ 인증 API 엔드포인트

| 항목 | API 명세서 | 백엔드 실제 구현 | 프론트엔드 현재 | 상태 |
|------|-----------|----------------|---------------|------|
| 강사 로그인 | `POST /auth/instructor/login` | `POST /auth/login` | `POST /auth/login` | ✅ 수정됨 |
| 회원 로그인 | `POST /auth/member/login` | `POST /auth/login` | `POST /auth/login` | ✅ 수정됨 |
| 토큰 갱신 | `POST /auth/refresh` | `POST /auth/refresh` | `POST /auth/refresh` | ✅ 일치 |

### ⚠️ 회원 관리 API 엔드포인트

| 항목 | API 명세서 | 백엔드 실제 구현 | 프론트엔드 현재 | 상태 |
|------|-----------|----------------|---------------|------|
| 목록 조회 | `GET /members` | `GET /subjects` | `GET /subjects` | ✅ 수정됨 |
| 상세 조회 | `GET /members/:id` | `GET /subjects/:id` | `GET /subjects/:id` | ✅ 수정됨 |
| 회원 등록 | `POST /members` | `POST /subjects` | `POST /subjects` | ✅ 수정됨 |
| 회원 수정 | `PATCH /members/:id` | `PUT /subjects/:id` | `PUT /subjects/:id` | ⚠️ HTTP Method 차이 |
| 회원 삭제 | `DELETE /members/:id` | `DELETE /subjects/:id` | `DELETE /subjects/:id` | ✅ 수정됨 |

### ⚠️ 체형 분석 API

| 항목 | API 명세서 | 백엔드 실제 구현 | 프론트엔드 현재 | 상태 |
|------|-----------|----------------|---------------|------|
| 엔드포인트 | `POST /posture/analyze` | `POST /body-posture/analyze` | `POST /body-posture/analyze` | ✅ 수정됨 |
| 전면 이미지 필드 | `frontImage` | `front` | `front` | ✅ 수정됨 |
| 측면 이미지 필드 | `sideImage` | `side` | `side` | ✅ 수정됨 |
| 후면 이미지 필드 | `backImage` | `back` | `back` | ✅ 수정됨 |
| subjectId | - | `subjectId` (required) | `subjectId` (required) | ✅ 추가됨 |

### ⚠️ 분석 이력 API

| 항목 | API 명세서 | 백엔드 실제 구현 | 프론트엔드 현재 | 상태 |
|------|-----------|----------------|---------------|------|
| 이력 조회 | `GET /members/:id/history` | `GET /history/subject/:subjectId` | `GET /history/subject/:subjectId` | ✅ 수정됨 |
| 캘린더 조회 | `GET /members/:id/history/calendar` | `GET /history/subject/:subjectId/calendar` | `GET /history/subject/:subjectId/calendar` | ✅ 수정됨 |

### ⚠️ 골프 스윙 분석 API

| 항목 | API 명세서 | 백엔드 실제 구현 | 프론트엔드 현재 | 상태 |
|------|-----------|----------------|---------------|------|
| 비디오 필드 | `video` | `video` | `video` | ✅ 일치 |
| 스윙 타입 | `swingType` | ❌ **미구현** | `swingType` (전송 중) | ❌ 백엔드 미수신 |
| 키 | `height` | `height` (optional) | `height` (required) | ⚠️ 필수 여부 차이 |
| subjectId | - | `subjectId` (required) | `subjectId` (required) | ✅ 일치 |

**중요 이슈:**
- ❗ 백엔드가 `swingType` 파라미터를 받지 않고 있음
- 프론트엔드는 "full" | "half" 스윙 타입을 전송하지만 백엔드에서 처리되지 않음
- 백엔드 개발자와 협의 필요

**필요한 조치:**
1. 백엔드 개발자에게 확인 필요:
   - `swingType` 파라미터가 필요한지?
   - 필요하다면 백엔드 코드 수정 필요
   - 불필요하다면 프론트엔드에서 제거

---

## 3. 현재 프론트엔드 API 엔드포인트 설정

### 인증 (`src/constants/api.js`)
```javascript
AUTH: {
  INSTRUCTOR_LOGIN: '/auth/instructor/login',  // ❌ 실제: /auth/login
  MEMBER_LOGIN: '/auth/member/login',          // ❌ 미구현
  REFRESH: '/auth/refresh',                    // ✅ OK
}
```

### 회원 관리
```javascript
MEMBERS: {
  LIST: '/members',                // ✅ 확인 필요
  CREATE: '/members',              // ✅ 확인 필요
  GET_BY_ID: (id) => `/members/${id}`,
  UPDATE: (id) => `/members/${id}`,
  DELETE: (id) => `/members/${id}`,
  HISTORY: (id) => `/members/${id}/history`,
  HISTORY_CALENDAR: (id) => `/members/${id}/history/calendar`,
}
```

### 골프 스윙 분석
```javascript
GOLF_SWING: {
  ANALYZE: '/golf-swing/analyze',
  GET_RESULT: (id) => `/golf-swing/analysis/${id}`,
  UPDATE_MEMO: (id) => `/golf-swing/analysis/${id}/memo`,
}
```

### 체형 분석
```javascript
POSTURE: {
  ANALYZE: '/posture/analyze',
  GET_RESULT: (id) => `/posture/analysis/${id}`,
  UPDATE_MEMO: (id) => `/posture/analysis/${id}/memo`,
}
```

### PDF 생성
```javascript
PDF: {
  GOLF_SWING: (id) => `/pdf/golf-swing/${id}`,
  POSTURE: (id) => `/pdf/posture/${id}`,
  DOWNLOAD: (token) => `/pdf/download/${token}`,
}
```

---

## 4. 백엔드 확인 필요 사항

### 🔍 컨트롤러별 엔드포인트 확인 체크리스트

#### AuthController
- [x] `POST /auth/login` 확인됨
- [ ] 강사/회원 구분 방법 확인 필요
- [x] `POST /auth/refresh` 확인됨

#### SubjectController (회원 관리)
- [ ] `GET /members` - 목록 조회
- [ ] `POST /members` - 회원 등록
- [ ] `GET /members/:id` - 상세 조회
- [ ] `PATCH /members/:id` - 회원 수정
- [ ] `DELETE /members/:id` - 회원 삭제

#### GolfSwingController
- [ ] `POST /golf-swing/analyze` - 분석 요청
- [ ] `GET /golf-swing/analysis/:id` - 분석 결과 조회
- [ ] `PATCH /golf-swing/analysis/:id/memo` - 메모 수정

#### BodyPostureController
- [ ] `POST /posture/analyze` - 분석 요청
- [ ] `GET /posture/analysis/:id` - 분석 결과 조회
- [ ] `PATCH /posture/analysis/:id/memo` - 메모 수정

#### HistoryController
- [ ] `GET /members/:id/history` - 분석 이력 조회
- [ ] `GET /members/:id/history/calendar` - 캘린더 데이터 조회

---

## 5. 다음 작업 계획

### 즉시 처리 필요
1. [ ] 백엔드 개발자와 인증 API 엔드포인트 협의
2. [ ] 실제 백엔드 라우트 확인 및 테스트
3. [ ] 프론트엔드 API 상수 최종 수정
4. [ ] 프론트엔드 개발 서버 재시작 (.env 적용)

### 통합 테스트
1. [ ] 로그인 기능 테스트
2. [ ] 회원 CRUD 테스트
3. [ ] 골프 스윙 분석 업로드 테스트
4. [ ] 체형 분석 업로드 테스트
5. [ ] 분석 이력 조회 테스트

### 문서화
1. [ ] 최종 API 엔드포인트 정리
2. [ ] 프론트엔드 개발 가이드 작성
3. [ ] 테스트 시나리오 문서화

---

## 6. CORS 설정 확인

### 백엔드 설정 (`backend/src/main.ts`)
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // ⚠️ 5173으로 변경 필요
  credentials: true,
});
```

**문제점:**
- 프론트엔드는 `localhost:5173`에서 실행
- 백엔드 CORS는 `localhost:3000`만 허용

**필요 조치:**
- 백엔드 `.env` 파일에 `FRONTEND_URL=http://localhost:5173` 추가 필요

---

## 7. 연락처 및 이슈 리포팅

**프론트엔드 개발자**: [이름]
**백엔드 개발자**: [이름]

### 이슈 발생 시
1. 이 문서의 해당 섹션에 `❌` 표시 및 상세 내용 기록
2. 백엔드 개발자에게 Slack/Email로 알림
3. 해결 후 `✅` 로 변경 및 해결 방법 기록

---

## 8. 변경 이력

| 날짜 | 작업자 | 변경 내용 |
|------|--------|----------|
| 2025-10-31 | Frontend | 초기 문서 작성 및 API 연동 설정 완료 |
| 2025-10-31 | Frontend | 모든 백엔드 컨트롤러 확인 및 불일치 사항 발견 |
| 2025-10-31 | Frontend | ✅ 인증 API: `/auth/login`으로 수정 |
| 2025-10-31 | Frontend | ✅ 회원 관리: `/subjects`로 수정 |
| 2025-10-31 | Frontend | ✅ 체형 분석: `/body-posture`, 필드명 `front/side/back`으로 수정 |
| 2025-10-31 | Frontend | ✅ 분석 이력: `/history/subject/:id`로 수정 |
| 2025-10-31 | Frontend | ❌ 골프 스윙 `swingType` 파라미터 백엔드 미구현 발견 |

---

## 부록: 테스트 명령어

### 백엔드 API 테스트 (curl)
```bash
# 로그인 테스트 (실제 구현)
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"instructor001","password":"password123"}'

# 회원 목록 조회 테스트
curl -X GET http://localhost:3003/api/members \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 프론트엔드 개발 서버
```bash
cd frontend
npm run dev
# http://localhost:5173
```

### 백엔드 개발 서버
```bash
cd backend
npm run start:dev
# http://localhost:3003
```
