# 백엔드 - 프론트엔드 통합 작업 현황

> **작성일**: 2025-10-31
> **작성자**: 백엔드 개발팀
> **버전**: 1.0.0

---

## 📋 작업 개요

프론트엔드팀에서 제출한 통합 이슈 문서(`FRONTEND_INTEGRATION_SUMMARY.md`)를 기반으로 백엔드 수정 작업을 완료했습니다.

**백엔드 서버**: `http://localhost:3003/api`
**프론트엔드 서버**: `http://localhost:5173`
**데이터베이스**: `golf_swing_db` (MySQL 8.0+)

---

## ✅ 완료된 작업

### 🔴 우선순위 높음 (모두 완료)

#### 1. 골프 스윙 `swingType` 파라미터 구현 ✅

**이슈**:
- 프론트엔드에서 "풀스윙(full)" / "하프스윙(half)" 선택 UI 구현됨
- 백엔드에서 `swingType` 파라미터를 전혀 받지 않음
- 사용자가 선택한 스윙 타입이 무시됨

**해결**:
- ✅ `GolfSwingController.uploadVideo()` 메서드에 `swingType` 파라미터 추가
- ✅ `UploadSwingVideoUseCase.execute()` 메서드에 `swingType` 처리 로직 추가
- ✅ `SwingTypeEntity` 레코드 자동 생성 로직 구현
- ✅ 유효성 검증 추가 (값이 "full" 또는 "half"가 아니면 400 에러)

**수정된 파일**:
- `src/presentation/controllers/golf-swing.controller.ts`
- `src/application/use-cases/golf-swing/UploadSwingVideoUseCase.ts`

**API 변경사항**:
```typescript
// 이전
POST /api/golf-swing/analyze
{
  video: File,
  subjectId: number,
  height?: string
}

// 현재
POST /api/golf-swing/analyze
{
  video: File,
  subjectId: number,
  swingType: 'full' | 'half',  // ✅ 필수 파라미터로 추가
  height?: string
}
```

**데이터베이스 저장**:
```sql
-- golf_swing_types 테이블에 자동 저장
INSERT INTO golf_swing_types (analysis_id, swing_type)
VALUES (1, 'full');  -- 또는 'half'
```

---

#### 2. CORS 설정 업데이트 ✅

**이슈**:
- 백엔드 CORS: `http://localhost:3000` 허용
- 프론트엔드: `http://localhost:5173` (Vite 기본 포트)
- CORS 에러 발생 가능성

**해결**:
- ✅ `.env` 파일 `FRONTEND_URL` 업데이트: `http://localhost:5173`
- ✅ `main.ts`의 CORS 설정이 환경변수 우선 사용하도록 이미 구현됨

**수정된 파일**:
- `.env`

**설정 변경**:
```env
# 이전
FRONTEND_URL=http://localhost:3000

# 현재
FRONTEND_URL=http://localhost:5173
```

---

### 🟡 우선순위 중간

#### 3. HTTP Method 통일 (참고사항)

**현황**:
- API 명세서: `PATCH /members/:id` (부분 수정)
- 백엔드 실제: `PUT /subjects/:id` (전체 교체)
- 프론트엔드: `PUT /subjects/:id` (백엔드에 맞춤)

**조치**:
- 현재는 `PUT` 방식으로 통일되어 작동 중
- RESTful 베스트 프랙티스 관점에서 부분 수정은 `PATCH` 권장
- 향후 개선 시 고려 사항으로 기록

**권장 사항**:
- 회원 정보 부분 수정 API를 `PATCH`로 변경 검토
- 또는 API 명세서를 `PUT`으로 수정하여 일관성 유지

---

### 🟢 우선순위 낮음 (문서화 완료)

#### 4. API 명세서 업데이트 ✅

**변경된 엔드포인트 및 필드명**:

| 항목 | API 명세서 | 실제 구현 | 상태 |
|------|-----------|----------|------|
| 인증 | `/auth/instructor/login`<br>`/auth/member/login` | `/auth/login` | ✅ 명세서 업데이트 |
| 회원 경로 | `/members` | `/subjects` | ✅ 명세서 업데이트 |
| 체형 분석 | `/posture` | `/body-posture` | ✅ 명세서 업데이트 |
| 체형 필드 | `frontImage`<br>`sideImage`<br>`backImage` | `front`<br>`side`<br>`back` | ✅ 명세서 업데이트 |
| 이력 조회 | `/members/:id/history` | `/history/subject/:id` | ✅ 명세서 업데이트 |
| 골프 스윙 | `swingType` 미기재 | `swingType` 필수 | ✅ 명세서 업데이트 |

**조치**:
- ✅ `API_DOCUMENTATION.md` 업데이트 완료
- ✅ 모든 엔드포인트 실제 구현과 일치하도록 수정
- ✅ `swingType` 파라미터 추가 및 설명 보강

---

## 🧪 테스트 결과

### 서버 상태
```
✅ Server Status: Running
✅ Port: 3003
✅ Database: Connected (golf_swing_db)
✅ REMO API Service: Initialized
✅ S3 Upload Service: Initialized (bucket: sppb-private)
✅ PDF Generation Service: Initialized
✅ CORS: http://localhost:5173 (allowed)
```

### API 테스트 결과

#### 1. 인증 API
```bash
✅ POST /api/auth/login
   - Status: 200 OK
   - Response: accessToken, refreshToken, user
```

#### 2. 회원(Subject) API
```bash
✅ GET /api/subjects
   - Status: 200 OK (with auth)
   - Status: 401 Unauthorized (without auth)

✅ GET /api/subjects/:id
   - Status: 200 OK
   - Response: 상세 정보 포함

✅ PUT /api/subjects/:id
   - Status: 200 OK
   - Memo 업데이트 정상 작동
```

#### 3. 골프 스윙 API (swingType 검증)
```bash
✅ POST /api/golf-swing/analyze (swingType 없음)
   - Status: 400 Bad Request
   - Message: "스윙 타입은 'full' 또는 'half'여야 합니다."

✅ POST /api/golf-swing/analyze (swingType='middle')
   - Status: 400 Bad Request
   - Message: "스윙 타입은 'full' 또는 'half'여야 합니다."

✅ POST /api/golf-swing/analyze (swingType='full', video 없음)
   - Status: 400 Bad Request
   - Message: "비디오 파일이 필요합니다."

✅ 검증 로직 정상 작동 확인
```

#### 4. 체형 분석 API
```bash
✅ POST /api/body-posture/analyze
   - 필드명: front, side, back (정상)
   - multipart/form-data 정상 처리
```

---

## 📁 수정된 파일 목록

### 백엔드 코드
```
backend/
├── .env                                                    # FRONTEND_URL 수정
├── src/
│   ├── presentation/controllers/
│   │   └── golf-swing.controller.ts                      # swingType 파라미터 추가
│   └── application/use-cases/golf-swing/
│       └── UploadSwingVideoUseCase.ts                    # swingType 처리 로직 추가
└── docs/
    ├── API_DOCUMENTATION.md                               # API 명세 업데이트
    └── BACKEND_INTEGRATION_STATUS.md                      # 본 문서 (신규)
```

### 테스트 스크립트
```
backend/scripts/
└── test-swingtype.sh                                      # swingType 검증 테스트 (신규)
```

---

## 🔄 변경 사항 상세

### 1. GolfSwingController.uploadVideo()

**Before**:
```typescript
async uploadVideo(
  @Request() req,
  @UploadedFile() file: Express.Multer.File,
  @Body('subjectId', ParseIntPipe) subjectId: number,
  @Body('height') height?: string,
) {
  // ...
  const result = await this.uploadSwingVideoUseCase.execute(
    userId, subjectId, s3Key, url, height
  );
}
```

**After**:
```typescript
async uploadVideo(
  @Request() req,
  @UploadedFile() file: Express.Multer.File,
  @Body('subjectId', ParseIntPipe) subjectId: number,
  @Body('swingType') swingType: 'full' | 'half',        // ✅ 추가
  @Body('height') height?: string,
) {
  if (!swingType || (swingType !== 'full' && swingType !== 'half')) {
    throw new BadRequestException(
      '스윙 타입은 "full" 또는 "half"여야 합니다.'
    );
  }

  const result = await this.uploadSwingVideoUseCase.execute(
    userId, subjectId, s3Key, url, swingType, height    // ✅ swingType 전달
  );
}
```

---

### 2. UploadSwingVideoUseCase.execute()

**Before**:
```typescript
async execute(
  userId: number,
  subjectId: number,
  videoS3Key: string,
  videoUrl: string,
  height?: string,
): Promise<{ analysisId: number; uuid: string }> {
  // 분석 레코드 생성
  const analysis = await this.analysisRepository.create({
    subjectId, userId, uuid, analysisDate, height, videoUrl, videoS3Key,
    status: 'pending',
  });

  return { analysisId: analysis.id, uuid: analysis.uuid };
}
```

**After**:
```typescript
async execute(
  userId: number,
  subjectId: number,
  videoS3Key: string,
  videoUrl: string,
  swingType: 'full' | 'half',                           // ✅ 추가
  height?: string,
): Promise<{ analysisId: number; uuid: string }> {
  // 분석 레코드 생성
  const analysis = await this.analysisRepository.create({
    subjectId, userId, uuid, analysisDate, height, videoUrl, videoS3Key,
    status: 'pending',
  });

  // ✅ SwingType 레코드 자동 생성
  await this.swingTypeRepository.save({
    analysisId: analysis.id,
    swingType: swingType,
  });

  return { analysisId: analysis.id, uuid: analysis.uuid };
}
```

---

## 🗃️ 데이터베이스 스키마

### SwingType 저장 구조

```sql
-- 분석 기본 정보
golf_swing_analyses
├── id (PK)
├── subject_id
├── user_id
├── uuid
├── video_url
├── video_s3_key
├── status
└── ...

-- 스윙 타입 및 프레임 정보 (OneToOne)
golf_swing_types
├── id (PK)
├── analysis_id (FK, UNIQUE)
├── swing_type (ENUM: 'full', 'half')           ✅ 프론트엔드에서 전송한 값 저장
├── address_frame                               (풀스윙 8단계)
├── takeback_frame
├── backswing_frame
├── top_frame
├── downswing_frame
├── impact_frame
├── followthrough_frame
├── finish_frame
├── half_address_frame                          (하프스윙 5단계)
├── half_takeback_frame
├── half_backswing_frame
├── half_downswing_frame
└── half_impact_frame
```

**관계**:
- `golf_swing_analyses` ←(1:1)→ `golf_swing_types`
- 분석 생성 시 자동으로 `swing_type` 레코드도 함께 생성됨

---

## 📝 프론트엔드 연동 가이드

### 골프 스윙 분석 업로드 (수정됨)

```javascript
// FormData 구성
const formData = new FormData();
formData.append('video', videoFile);            // File
formData.append('subjectId', subjectId);        // number
formData.append('swingType', swingType);        // ✅ 'full' 또는 'half' (필수)
formData.append('height', '175');               // string (선택)

// API 호출
const response = await axios.post(
  '/api/golf-swing/analyze',
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

// 응답
// {
//   "message": "골프 스윙 분석이 시작되었습니다.",
//   "analysisId": 1,
//   "uuid": "550e8400-e29b-41d4-a716-446655440000"
// }
```

### 에러 처리

```javascript
// swingType 누락 또는 잘못된 값
{
  "statusCode": 400,
  "message": "스윙 타입은 \"full\" 또는 \"half\"여야 합니다.",
  "error": "Bad Request"
}

// 비디오 파일 누락
{
  "statusCode": 400,
  "message": "비디오 파일이 필요합니다.",
  "error": "Bad Request"
}
```

---

## 🚀 다음 단계

### 프론트엔드 팀 체크리스트

- [ ] 골프 스윙 업로드 시 `swingType` 파라미터 전송 확인
- [ ] 풀스윙/하프스윙 선택 UI 동작 확인
- [ ] 분석 결과 조회 시 `swingType` 정보 표시 구현
- [ ] CORS 에러 발생 여부 확인 (5173 포트)
- [ ] 통합 테스트 수행

### 백엔드 팀 향후 작업

- [ ] REMO API 실제 호출 시 `swingType`에 따른 분기 처리
- [ ] 풀스윙/하프스윙 프레임 정보 REMO API 응답 파싱
- [ ] HTTP Method 통일 검토 (PUT vs PATCH)
- [ ] API 성능 최적화

---

## 📞 문의

**이슈 발생 시**:
1. `BACKEND_INTEGRATION_ISSUES.md` 문서에 이슈 기록
2. 담당자에게 알림
3. 해결 후 본 문서 업데이트

**담당자**:
- 백엔드: [담당자 이름/연락처]
- 프론트엔드: [담당자 이름/연락처]

---

**마지막 업데이트**: 2025-10-31
**다음 리뷰 예정**: 프론트엔드 통합 테스트 완료 후
