# 09. API 레퍼런스 — 자체 API 구조

**작성일**: 2026-08-27 / **기준 커밋**: `f6ccec0`
**Base URL**: `https://api-golf.remo.re.kr/api` (프로덕션) · `http://localhost:3003/api` (로컬)

> 외부 AI API(REMO) 구조는 [10-remo-api-reference.md](./10-remo-api-reference.md) 참조.

---

# 1. 인증 체계

## 1-1. 토큰 구조

로그인 시 **두 개의 JWT** 를 발급한다. 동일 시크릿(`JWT_SECRET`)으로 서명하지만
**`type` 클레임으로 용도를 구분**한다.

```jsonc
// accessToken
{ "sub": 1, "role": "instructor", "type": "access",  "iat": ..., "exp": ... }  // 1시간

// refreshToken
{ "sub": 1, "role": "instructor", "type": "refresh", "iat": ..., "exp": ... }  // 7일
```

| 토큰 | 만료 | 용도 |
|------|------|------|
| `accessToken` | 1시간 | 모든 보호 API 호출 |
| `refreshToken` | 7일 | `POST /auth/refresh` 전용 |

> ⚠️ **2026-08-26 이전에는 `type` 클레임이 없었다.** 두 토큰의 payload 가 완전히 동일해
> **refreshToken 으로 보호 API 를 호출하면 통과**했다(실측 200). 즉 refresh 토큰이
> 7일짜리 access 토큰으로 동작해 Refresh Token 의 존재 이유가 무력화된 상태였다.
> 현재는 `JwtAuthGuard` 가 `type !== 'access'` 를 거부하고,
> `RefreshTokenUseCase` 가 `type !== 'refresh'` 를 거부한다.

## 1-2. 전달 방식
```http
Authorization: Bearer <accessToken>
```
클라이언트는 `localStorage` 에 보관하며, `frontend/lib/api.ts` 의 axios 요청
인터셉터가 자동으로 첨부한다. 401 응답 시 토큰을 지우고 `/login` 으로 리다이렉트한다
(로그인 요청 자체는 예외 처리).

## 1-3. 가드 적용 방식

| 컨트롤러 | 방식 |
|----------|------|
| `golf-swing` · `subjects` · `history` | **클래스 레벨** `@UseGuards(JwtAuthGuard)` |
| `body-posture` | 메서드별 개별 적용 |
| `auth` | `change-password` 만 적용 |
| `health` | 없음 (의도적 — 모니터링용) |

> `body-posture` 만 메서드별이라 과거 `GET images/*` 하나가 누락됐었다(2026-08-26 수정).
> 신규 엔드포인트 추가 시 가드 누락에 주의할 것.

## 1-4. 공통 에러 형식
```jsonc
{ "message": "인증 토큰이 필요합니다.", "error": "Unauthorized", "statusCode": 401 }
```

| 코드 | 의미 |
|------|------|
| 400 | 검증 실패 · 잘못된 요청 |
| 401 | 토큰 없음/무효/종류 불일치 · 자격증명 오류 |
| 403 | 인증됐으나 소유권 없음 |
| 404 | 리소스 없음 |
| 413 | 업로드 용량 초과 (nginx 100MB) |

---

# 2. 엔드포인트 전체 (24개)

## 2-1. `/auth` — 인증

| Method | Path | 가드 | 설명 |
|--------|------|------|------|
| POST | `/auth/register` | — | 강사 회원가입 |
| POST | `/auth/login` | — | 로그인 |
| POST | `/auth/refresh` | — | Access Token 갱신 |
| POST | `/auth/change-password` | ✅ | 비밀번호 변경 |

### `POST /auth/login`
```jsonc
// Request
{ "email": "test@example.com", "password": "Test1234!" }

// 200
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": 1, "username": "instructor001", "name": "테스트강사",
    "phoneNumber": "010-...", "email": "test@example.com",
    "paymentType": "paid", "isCertified": false,
    "status": "active", "centerId": 1, "centerName": "스윙골프센터"
  }
}
```
**검증 순서**: 이메일 조회 → bcrypt 비교 → `status` 확인(`suspended`/`inactive` 거부)
→ 유료 회원 구독 만료 확인 → `lastLoginAt` 갱신 → 토큰 발급.

> 🔴 **설계 결함(미수정)**: 로그인 키가 `email` 인데 `users.email` 은
> `nullable: true` 이고 **unique 제약이 없다.** 반면 `RegisterUserDto.email` 은
> `@IsOptional()` 이다. 즉 **이메일 없이 가입하면 영원히 로그인할 수 없고**,
> 이메일이 중복되면 `findOne` 결과가 비결정적이다.
> 현재 데이터(강사 5명)는 이메일 중복·NULL 이 0건이라 사고는 없다.

### `POST /auth/refresh`
```http
Authorization: Bearer <refreshToken>
```
```jsonc
// 200
{ "accessToken": "eyJ..." }
```
> refreshToken 은 DB 에 저장되지 않는다. **폐기(revocation) 수단이 없어**
> 로그아웃/비밀번호 변경 후에도 기존 refreshToken 은 7일간 유효하다.

### `POST /auth/change-password`
```jsonc
// Request
{ "currentPassword": "Test1234!", "newPassword": "NewPass1234!" }

// 200
{ "message": "비밀번호가 변경되었습니다." }
```
| 상황 | 응답 |
|------|------|
| 미인증 | 401 |
| 현재 비밀번호 불일치 | 401 `현재 비밀번호가 올바르지 않습니다.` |
| 새 비밀번호 6자 미만 | 400 |
| 새 비밀번호 = 현재 비밀번호 | 400 |

---

## 2-2. `/subjects` — 대상자 관리 (전체 가드 적용)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/subjects` | 담당 대상자 목록 |
| GET | `/subjects/:id` | 상세 |
| POST | `/subjects` | 등록 (201) |
| PUT | `/subjects/:id` | 수정 |
| DELETE | `/subjects/:id` | 삭제 (204) |

### `GET /subjects`
```jsonc
{
  "subjects": [{
    "id": 12, "name": "송미림", "phoneNumber": "010-4657-7272",
    "birthDate": "1958-07-07", "gender": null,
    "height": "165.00", "weight": "50.00", "memo": null,
    "status": "active", "createdAt": "2026-03-19T15:35:39.705Z",
    "analysisCount": { "golfSwing": 2, "posture": 0 }
  }]
}
```
> **멀티테넌시**: `user_id` 기준으로 자동 필터링된다. 모든 상세/수정/삭제 경로에서
> `subject.userId !== req.user.sub` 를 검사한다.

---

## 2-3. `/golf-swing` — 스윙 분석 (클래스 레벨 가드)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/golf-swing/analyze` | 영상 업로드 + 분석 시작 |
| GET | `/golf-swing/analysis/:id` | 결과 조회 (DB) |
| POST | `/golf-swing/analysis/:id/refresh` | **REMO 에서 결과 수신** |
| PUT | `/golf-swing/analysis/:id/memo` | 메모 |
| GET | `/golf-swing/analysis/:id/video` | 결과 영상 URL |
| GET | `/golf-swing/analysis/:id/images` | 8단계 구간 이미지 |
| DELETE | `/golf-swing/analysis/:id` | 삭제 (204) |

### `POST /golf-swing/analyze`
```http
Content-Type: multipart/form-data

video      : <file>          # 최대 100MB
subjectId  : 7
swingType  : full | half
height     : "175"           # 선택, 기본 175
```
```jsonc
// 200 — 즉시 반환
{ "message": "골프 스윙 분석이 시작되었습니다.", "analysisId": 97, "uuid": "28a6cb75-..." }
```

**처리 흐름**
```
1. S3 업로드 (동기)
2. 분석 레코드 생성 → status: pending
3. 응답 반환                        ← 여기까지 실측 0.76초
4. [백그라운드] REMO 분석 요청
     성공 → status: processing (+ waitTime, creditUsed)
     실패 → status: failed
```

> **왜 백그라운드인가**: REMO 요청 응답값은 DB 갱신에만 쓰이고 클라이언트 응답에는
> 포함되지 않는다. `await` 하면 base64 인코딩·전송 시간만큼 사용자를 기다리게 하고,
> nginx 기본 타임아웃(60초)에 잘릴 수 있다.
>
> ⚠️ **한계**: 백그라운드 작업 중 프로세스가 재시작되면 `pending` 으로 남는다.
> `refresh` 는 REMO 에 uuid 가 등록된 경우만 동작하므로 이 상태는 복구 불가다.
> UI 의 "다시 확인" 버튼으로 갈음한다.

### 분석 상태 머신
```
pending ──[REMO 요청 성공]──> processing ──[refresh 결과 수신]──> completed
   │                              │
   └──[REMO 요청 실패]────────────┴──[REMO 520 등 확정 실패]────> failed
```

### `POST /golf-swing/analysis/:id/refresh`
폴링 중 `status === 'processing'` 일 때 프론트가 호출한다.
REMO 에서 결과·각도·결과영상을 받아 DB 에 저장하고 `completed` 로 전이시킨다.

| REMO 응답 | 처리 |
|-----------|------|
| `status: 534` / `533` / `address` 없음 | `processing` 유지 (분석 진행 중) |
| **`520`** | **`failed` 로 전이** + 재촬영 안내 |
| 정상 | 결과 저장 → `completed` |

> `520` 은 REMO 가 영상에서 스윙 구간을 인식하지 못한 경우다
> (`first golf section recognition error`). 2026-08-26 이전에는 이를 반영하지 않아
> **12건이 2026-02~05 부터 `processing` 으로 영구 잔류**했다.

### 폴링 규약 (프론트)
```
5초 간격 × 최대 60회 = 5분
  GET  /analysis/:id            → DB 상태 확인
  status === 'processing' 이면
  POST /analysis/:id/refresh    → REMO 결과 수신 시도
```

---

## 2-4. `/body-posture` — 체형 분석 (메서드별 가드)

| Method | Path | 가드 | 설명 |
|--------|------|------|------|
| POST | `/body-posture/analyze` | ✅ | 이미지 업로드 + **동기 분석** |
| GET | `/body-posture/images/*` | ✅ | 결과 이미지 서빙 |
| GET | `/body-posture/analysis/:id` | ✅ | 결과 조회 |
| PUT | `/body-posture/analysis/:id/memo` | ✅ | 메모 |
| DELETE | `/body-posture/analysis/:id` | ✅ | 삭제 (204) |

### `POST /body-posture/analyze`
```http
Content-Type: multipart/form-data

front      : <file>   # 각 최대 10MB, 1개 이상 필수
leftSide   : <file>
rightSide  : <file>
back       : <file>
subjectId  : 7
```

**골프와 다르게 동기 처리한다.** REMO 체형분석은 결과를 즉시 반환하며
**실측 0.42초**(4방향 병렬 1초 미만)라 비동기화할 이유가 없다.

```
1. sharp 로 이미지 압축
2. REMO 4방향 병렬 호출 (Promise.allSettled)
3. 결과 이미지를 로컬 results/ 에 저장
4. 결과 + uuid + status 를 DB 에 저장
5. 응답 반환
```

> **부분 실패 허용**: `Promise.allSettled` 를 쓴다. 과거 `Promise.all` 이던 시절엔
> 한 방향 실패가 전체를 400 으로 만들어 **이미 성공한 방향의 결과까지 버려졌다.**
> 현재는 전부 실패한 경우에만 요청을 실패로 처리한다.

> 업로드하지 않은 방향은 `pending` 으로 남는다. **이는 실패가 아니라 미사용 상태다.**

### `GET /body-posture/images/*`

**인증 + 소유권 검증**이 적용된다.

```
경로 규약: {folder}/{userId}/{file}
           results/{folder}/{userId}/{file}
```
경로에서 `userId` 를 추출해 `req.user.sub` 와 비교한다.

| 상황 | 응답 |
|------|------|
| 미인증 | 401 |
| 본인 소유 | 200 (이미지 바이너리) |
| 타 강사 소유 | 403 |
| 경로 탐색 (`../.env`) | 403 |
| 허용되지 않는 확장자 | 404 |

허용 확장자: `.jpg .jpeg .png .gif .webp .mp4 .mov` (화이트리스트, 폴백 없음)

> ⚠️ **프론트에서 `<img src>` 로 직접 호출할 수 없다.** img 태그는 Authorization
> 헤더를 보내지 못한다. `lib/api.ts` 의 `fetchImageObjectUrl()` 로 blob 을 받아
> `URL.createObjectURL` 로 표시하고, 언마운트 시 `revokeObjectURL` 로 해제한다.

---

## 2-5. `/history` — 이력 (클래스 레벨 가드)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/history/subject/:subjectId` | 분석 이력 |
| GET | `/history/subject/:subjectId/calendar` | 캘린더 데이터 |

### `GET /history/subject/:subjectId`
```
?type=golf|posture|all   (선택)
&startDate=2026-01-01    (선택)
&endDate=2026-12-31      (선택)
&page=1                  (선택)
&limit=10                (선택)
```

> 🔴 **주의 — 이 엔드포인트는 2026-08-26 까지 400 으로 실패했다.**
> `page`/`limit` 을 `@Query('page', ParseIntPipe) page?: number` 로 받았는데,
> **전역 `ValidationPipe` 의 `transform: true` 가 먼저 실행**되면서
> 파라미터 타입이 `number` 이면 `transformPrimitive` 가 `+undefined` → **`NaN`** 으로
> 바꾼다. 그 뒤 `ParseIntPipe` 는 `NaN` 을 받으므로 `optional: true` 로도 통과하지 못한다.
> 프론트(`lib/history.ts`)는 값이 있을 때만 파라미터를 붙이므로 **이력 화면이 아예 뜨지 않았다.**
>
> **해법**: `@Query('page') page?: string` 로 받아 컨트롤러에서 직접 파싱한다.
> 타입이 `String` 이면 전역 파이프가 값을 건드리지 않는다.
> **선택적 숫자 쿼리 파라미터를 추가할 때 같은 함정에 빠지지 않도록 주의할 것.**

### `GET /history/subject/:subjectId/calendar`
```
?year=2026&month=4   (둘 다 필수)
```

---

## 2-6. `/health` — 헬스체크 (가드 없음)

### `GET /health`
```jsonc
{ "status": "ok", "db": "up", "uptime": 1245, "timestamp": "2026-08-26T10:39:15.032Z" }
```

`SELECT 1` 로 **DB 연결까지 실제 확인**한다. 실패 시 `status: "degraded"`, `db: "down"`.

> 프로세스 생존만 보는 헬스체크는 의미가 없다. 2026-06-15 사고 때
> PM2 는 `online` 이었으나 DB 연결 실패로 서비스는 2.4개월간 죽어 있었다.
> 배포 스크립트와 외부 모니터링이 이 엔드포인트를 사용한다.

---

# 3. 요청 제한

| 항목 | 값 | 설정 위치 |
|------|-----|-----------|
| 영상 업로드 | **100MB** | `golf-swing.controller.ts` `fileSize` + nginx `client_max_body_size` |
| 이미지 업로드 | 10MB × 4 | `body-posture.controller.ts` |
| nginx `proxy_read_timeout` | 300초 | `deploy/api-golf.remo.re.kr.nginx` |
| 프론트 axios (영상) | 180초 | `lib/golf-swing.ts` |
| 프론트 axios (기본) | 30초 | `lib/api.ts` |
| 백엔드 → REMO | 180초 + 재시도 3회(지수 백오프) | `remo-api.service.ts` |

> **상한을 바꿀 때는 세 계층(nginx · NestJS · 프론트)을 함께 바꿔야 한다.**
> 과거 nginx 25MB / NestJS 500MB 로 어긋나 있어 25MB 초과 영상이 413 으로 잘렸다.

---

# 4. CORS

```
CORS_ORIGINS=https://golf.remo.re.kr,https://parkgolf-ai-pro.vercel.app,http://localhost:3000
```

환경변수 화이트리스트로 제한한다. 미설정 시에는 전체 허용으로 폴백해 로컬 개발을 막지 않는다.

Vercel 프리뷰 도메인에서 테스트하려면 해당 URL 을 임시로 추가하고
백엔드를 `pm2 restart golf-backend --update-env` 로 재기동해야 한다.

---

# 5. 데이터 모델 요약

```
centers ──< users(강사) ──< subjects(대상자) ──┬──< golf_swing_analyses
                                              │      ├── golf_swing_results  (99 컬럼)
                                              │      ├── golf_swing_angles
                                              │      └── golf_swing_types    (구간 프레임)
                                              └──< body_posture_analyses
                                                     ├── front_posture_results
                                                     ├── side_posture_results
                                                     └── back_posture_results
notices / notice_reads / admins  ← 스키마만 존재, 컨트롤러 없음
```

| 테이블 | 컬럼 | 비고 |
|--------|------|------|
| `golf_swing_results` | **99** | 구간 × 지표 × (측정값·점수·코멘트) |
| `golf_swing_types` | 20 | full 8단계 / half 5단계 프레임 + fps |
| `body_posture_analyses` | 23 | 4방향 × (url · s3key · status · uuid) |
| 전체 | 14 테이블 / 4.38MB | |

---

# 6. 개발 시 주의사항

| # | 항목 |
|---|------|
| 1 | **선택적 숫자 쿼리 파라미터에 `ParseIntPipe` 를 쓰지 말 것** — 전역 ValidationPipe 가 `NaN` 을 만든다 (§2-5) |
| 2 | **`body-posture` 에 엔드포인트 추가 시 가드를 잊지 말 것** — 이 컨트롤러만 메서드별 방식이다 |
| 3 | **업로드 상한 변경은 3계층 동시에** — nginx · NestJS · 프론트 |
| 4 | **인증이 걸린 이미지는 `<img src>` 불가** — blob 방식 사용 |
| 5 | **소유권 검증을 빠뜨리지 말 것** — 현재 17개 지점에서 `userId !== req.user.sub` 검사 중 |
| 6 | **프로덕션은 `synchronize: false`** — 엔티티를 바꿔도 스키마가 반영되지 않는다. 마이그레이션 미도입 상태 |
