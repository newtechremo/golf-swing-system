# 11. 작업 완료 보고서

**작업 기간**: 2026-08-26 ~ 2026-08-27
**대상**: ParkGolf AI Pro (파크골프 AI 분석 서비스)
**결과**: 🟢 **서비스 정상 운영 중** — https://golf.remo.re.kr

---

# 요약

**2.4개월간 중단되어 있던 서비스를 복구하고, 프론트엔드를 Vercel 로 이전했다.**
복구 과정에서 발견된 보안 결함 5건과 기능 버그 4건을 함께 수정했다.

| 구분 | 건수 |
|------|------|
| 복구 조치 | 5 |
| 보안 수정 | 5 |
| 기능 버그 수정 | 4 |
| 인프라 변경 | 4 |
| 작성 문서 | 11 |

---

# 1. 무엇이 잘못되어 있었나

## 근본 원인 — 서버 이전 후속작업 누락

서버가 새 환경으로 이전되며 공인 IP 가 바뀌었으나 아무 세팅도 수행되지 않았다.

```
49.168.236.221  →  49.169.8.19

   ├─ ① DNS A 레코드 미갱신     → 외부 접근 전면 불가
   ├─ ② golf_mysql 컨테이너 미기동 → 백엔드 49,368회 크래시 루프
   ├─ ③ TLS 인증서 갱신 실패     → DNS 가 죽어 HTTP-01 챌린지 불가
   └─ ④ GitHub Actions SERVER_HOST 미갱신 → 배포 파이프라인 무효
```

### 타임라인 (실측)
| 시각 | 사건 |
|------|------|
| 2026-01-15 | 마지막 코드 커밋 · 마지막 정상 배포 |
| 2026-05-17 | 마지막 스윙 분석 |
| 2026-06-01 | 마지막 로그인 |
| **2026-06-15 13:49** | **`golf_mysql` 비정상 종료 (exit 255)** — 서비스 중단 시작 |
| 2026-08-05 | TLS 인증서 만료 |
| 2026-08-26 | 복구 착수 |

**MySQL 컨테이너의 재시작 정책이 `no` 였다.** 이것이 자동 복구를 막았다.

---

# 2. 복구 조치

| # | 문제 | 조치 | 검증 |
|---|------|------|------|
| 1 | DNS 가 죽은 구 IP 를 가리킴 | Route53 A 레코드 갱신 | 8.8.8.8 전파 확인 |
| 2 | MySQL 미기동 | 컨테이너 기동 + `restart=unless-stopped` | XA crash recovery 정상, **데이터 무손실** |
| 3 | TLS 인증서 만료 | certbot 갱신 | ~2026-11-24 |
| 4 | 크래시 로그 962MB | `pm2 flush` + `pm2-logrotate` | **6.7MB** (955MB 회수) |
| 5 | 테스트 계정 문서 오류 | 비밀번호 재설정 + 문서 정정 | 로그인 200 |

### 데이터 무손실 확인
```
강사 5 · 대상자 14 · 스윙분석 91 · 체형분석 40 · 14 테이블 전부 정상 · 한글 정상
백업: ~/backups/golf_swing_db_20260826_1629.sql (891KB)
```

---

# 3. 보안 수정

## 3-1. 🔴 Refresh Token 이 Access Token 으로 통용됨

**실측으로 재현했다.**

```
수정 전:  refreshToken 으로 GET /subjects  →  200   ← 뚫림
수정 후:  refreshToken 으로 GET /subjects  →  401
```

두 토큰이 동일 시크릿·동일 payload 로 서명되고 만료시간만 달랐다.
`JwtAuthGuard` 가 종류를 구분하지 않아 **refreshToken 이 7일짜리 액세스 권한**이 됐다.

**조치**: payload 에 `type: 'access'` / `type: 'refresh'` 클레임 추가.
가드와 `RefreshTokenUseCase` 양쪽에서 종류를 검증한다.

> 하드 컷오버로 배포했다. 기존 토큰은 전부 무효화되어 재로그인이 필요했다.
> 강사 계정이 5개뿐이라 유예 기간을 두는 것보다 즉시 차단이 나았다.

## 3-2. 🔴 미인증 이미지 조회 + 경로 탐색

`GET /body-posture/images/*` 만 인증 가드가 빠져 있었다.
**경로만 알면 누구나 대상자의 체형 사진을 볼 수 있었다** — 신체 촬영 이미지다.

또한 `path.join()` 이 `..` 를 해석하므로 `../.env` 로
`JWT_SECRET`·DB비번·AWS키·REMO키가 노출될 수 있었다.

| 검증 | 결과 |
|------|------|
| 미인증 | **401** |
| 본인 소유 | 200 |
| 타 강사 소유 | **403** |
| 경로 탐색 `../../.env` | **403** |
| 비허용 확장자 | 404 |

**조치**: `JwtAuthGuard` + 소유권 검증(경로에서 `userId` 추출) +
`path.resolve` 후 baseDir 접두사 검증 + mime 화이트리스트(폴백 제거).

> ⚠️ 가드를 붙이면 `<img src>` 가 헤더를 못 보내 이미지가 전멸한다.
> **프론트 blob 전환을 같은 커밋에 묶어** 처리했다.

## 3-3. 기타

| 항목 | 이전 | 이후 |
|------|------|------|
| CORS | `origin: true` (전체 허용) | `CORS_ORIGINS` 화이트리스트 |
| `dropSchema` | 환경변수 하나로 전체 데이터 삭제 가능 | 제거 |
| REMO 통신 | `http://` (평문) | `https://` |

---

# 4. 기능 버그 수정

## 4-1. 🔴 분석 실패가 "분석 중"으로 영구 표시

REMO 가 `520`(분석 실패)을 반환하는데 코드가 `534`(진행중)만 처리하고
`520` 은 예외를 던져 **status 를 갱신하지 않았다.**

결과: **12건이 2026-02~05 부터 `processing` 으로 잔류.**
크레딧은 차감됐는데 사용자는 몇 달째 "분석 중" 화면만 봤다.

```
실측 원인:
  first golf section recognition error, error: list index out of range   (8건)
  get golf result error, error: list index out of range                  (3건)
  get golf score error, error: bad operand type for abs(): 'NoneType'    (1건)
```
→ REMO 가 영상에서 스윙 구간을 인식하지 못한 것. **우리 시스템 문제가 아니었다.**

**조치**: 520 을 `failed` 로 전이 + 재촬영 안내. 기존 12건은 정리했다.
부수 소득으로 **REMO 결과 보관기간이 최소 7개월**임을 확인했다.

## 4-2. 🔴 이력 화면이 아예 뜨지 않음

`GET /history/subject/:id` 가 `page`/`limit` 없이 호출되면 400 이었다.
프론트는 값이 있을 때만 파라미터를 붙이므로 **항상 실패**했다.

원인이 예상과 달랐다. `ParseIntPipe` 가 아니라 **전역 `ValidationPipe`** 였다:

```
transform: true 가 먼저 실행
  → 파라미터 타입이 number 이면 transformPrimitive 가 +undefined → NaN
  → ParseIntPipe 가 NaN 을 받음
  → optional: true 로도 통과 불가
```

**조치**: `string` 으로 받아 직접 파싱. 파라미터 조합 6종 전부 200, 이력 20건 조회.

## 4-3. 🔴 비밀번호 변경이 항상 "성공"

```ts
const result = changePassword(...)   // await 누락 → Promise 는 항상 truthy
if (result) { /* 실패해도 성공 UI + /main 리다이렉트 */ }
```

게다가 **백엔드에 `POST /auth/change-password` 엔드포인트 자체가 없었다** (404).

**조치**: `await` 추가(핸들러도 `async` 로) + `ChangePasswordUseCase` 신규 구현.
전 케이스 검증 통과.

## 4-4. 🟠 체형분석 uuid 유실

REMO 응답에 `uuid` 가 포함되는데 `frontUuid: null` 로 하드코딩되어 있었다.
재조회 경로가 `if (status === 'pending' && analysis.xxxUuid)` 조건이라
**uuid 가 없으면 영영 다시 가져올 수 없었다.**

**조치**: 응답의 uuid 를 저장. 4방향 업로드 테스트에서 uuid 4개 저장 + 전부 `completed` 확인.

---

# 5. 성능·안정성

| 항목 | 이전 | 이후 |
|------|------|------|
| 업로드 응답 | REMO 접수 대기에 묶임 | **0.76초** (S3 업로드만) |
| 영상 상한 | nginx 25MB / NestJS 500MB (불일치) | **100MB 정합** |
| REMO timeout | **없음** (무한 대기) | **180초** + 지수 백오프 |
| nginx timeout | 기본 60초 | **300초** |
| PM2 크래시 방지 | 없음 | `min_uptime 10s` / `max_restarts 15` |
| 헬스체크 | 없음 | `/api/health` (DB 연결까지 확인) |
| 체형분석 부분 실패 | `Promise.all` — 하나 실패 시 전체 400 | `allSettled` — 부분 성공 저장 |

### 분석 요청 비동기화
`remoResult` 는 응답에 쓰이지 않고 DB 갱신에만 사용된다.
`await` 할 이유가 없어 fire-and-forget 으로 전환했다.

```
POST /analyze
  ├─ S3 업로드 (동기)
  ├─ 레코드 생성 → pending
  ├─ 응답 반환                      ← 0.76초
  └─ [백그라운드] REMO 요청 → processing | failed
```

> **정정**: 초기 보고에서 "30~60초 → 0.76초"라고 했으나, 30~60초는 **REMO 의 분석
> 소요시간**이지 업로드 응답시간이 아니었다. 수정 전 응답시간을 측정하지 않고 단정한
> 오류다. 실제 개선은 "REMO 접수 대기를 응답 경로에서 제거"한 것이다.

---

# 6. 인프라 변경

## 6-1. 아키텍처 — 프론트만 Vercel

```
                    ┌──────────────────────────────┐
   브라우저 ────────>│ Vercel (정적 SPA)             │
        │           │ golf.remo.re.kr → CNAME       │
        │           │ git push → 자동배포 (~15초)    │
        │           └──────────────────────────────┘
        │  API 는 Vercel 을 거치지 않고 직접 호출
        ▼
   ┌───────────────────────────────────────────────┐
   │ api-golf.remo.re.kr (49.169.8.19)              │
   │   nginx 100m / 300s → NestJS :3003             │
   │     ├─> MySQL :3306  ├─> 로컬 results/          │
   │     ├─> REMO API     └─> AWS S3                │
   └───────────────────────────────────────────────┘
```

### 백엔드를 서버리스로 옮길 수 없는 이유
로컬 파일 저장(`results/` 5.5MB, 실사용) · `@Cron` 스케줄러 ·
**REMO API 키 보관**(프론트에 두면 브라우저 노출 — 크레딧 과금 API 라 금전 피해) ·
MySQL 커넥션.

### 30~60초 분석이 Vercel 제약에 걸리지 않는 이유
브라우저가 `api-golf.remo.re.kr` 을 **직접 호출**하므로 Vercel 함수가 경로에 없다.
단 `next.config.mjs` 의 `rewrites()` 를 프로덕션에서 쓰면 엣지를 경유해 제한에 걸리므로
**로컬 개발 전용으로 격리**했다.

## 6-2. 신규 구성

| 항목 | 내용 |
|------|------|
| `api-golf.remo.re.kr` | A → `49.169.8.19` + nginx vhost + 인증서 |
| `golf.remo.re.kr` | A → **CNAME `6ab47e2c9278e9ac.vercel-dns-016.com`** |
| Vercel 프로젝트 | `remo-dev/parkgolf-ai-pro`, rootDirectory `frontend` |
| GitHub 연동 | `git push origin main` → 자동배포 (~15초) |

> **TXT 레코드 주의**: `_vercel.remo.re.kr` 에 기존 4개 도메인 검증값이 있었다.
> UPSERT 는 전체 교체이므로 **기존 값을 함께 넣어** 5건으로 처리했다.
> 빠뜨렸다면 다른 4개 도메인의 Vercel 검증이 깨졌을 것이다.

## 6-3. Vercel 빌드 블로커 2건 사전 해결

| 문제 | 조치 |
|------|------|
| `vaul@0.9.9` 가 React 19 미지원 → `npm install` ERESOLVE 실패 | 미사용 확인 후 `1.1.2` 로 업그레이드 |
| 락파일이 `.gitignore` 로 미추적 + `"latest"` 의존성 4개 | 락파일 추적 + 버전 고정 |

## 6-4. 배포 파이프라인

외부 SSH(22) 가 열려 있지 않아 GitHub Actions SSH 배포는 **구조적으로 불가**하다
(제3자 포트체크 `status: false`). 서버에 직접 접근 가능하므로 SSH 를 인터넷에 열 이유도 없다.

| 대상 | 방식 |
|------|------|
| 프론트엔드 | `git push origin main` → Vercel 자동 |
| 백엔드 | 서버에서 `npm run build && pm2 restart golf-backend` |

---

# 7. 조사 결과가 뒤집힌 2건

작업 중 **초기 진단이 틀렸음을 확인한 항목**이다. 재조사를 막기 위해 기록한다.

## 7-1. 체형분석 좌측면·후면 실패 → **버그가 아니었다**

11건이 `front: completed / rightSide: completed / leftSide: pending / back: pending`
패턴으로 실패한 것처럼 보였다.

**검증**: REMO API 를 실제 이미지로 직접 호출 → **3방향 모두 정상**
(`state: True` + uuid 반환).

**진짜 원인**: DB 의 `left_side_image_url` 이 `[]` **빈 문자열**이었다.
`IS NULL` 로 검사해 빈 문자열을 "있음"으로 오판한 것이 초기 오진의 원인이다.
즉 **사용자가 정면·우측면만 촬영**했고, 나머지는 기본값 `pending` 으로 남은 것이다.

4방향 전부 업로드하는 테스트에서 **모두 `completed`** 확인.

## 7-2. 체형분석 비동기화 → **불필요**

골프와 같은 처리가 필요하다고 판단했으나, REMO 체형분석은 **동기 API** 다.

```
실측: 0.406 / 0.413 / 0.430초  (4방향 병렬 1초 미만)
```
응답에 결과가 그대로 들어온다(`far_coords` 등 15~18 필드).
비동기화하면 불필요한 상태 관리만 늘어난다. **동기 유지 결정.**

---

# 8. 검증 결과

## 보안
```
refresh 토큰 → 보호 API        200 → 401  ✅
access 토큰 → /auth/refresh    200 → 401  ✅
미인증 이미지                        401  ✅
타 강사 이미지                       403  ✅
경로 탐색 ../../.env                403  ✅
```

## 기능
```
업로드 응답시간                  0.76초  ✅
120MB 업로드                       413  ✅
history 파라미터 6종           전부 200  ✅ (이력 20건)
체형분석 4방향 업로드   uuid 4개 + 전부 completed  ✅
비밀번호 변경                  전 케이스  ✅
/api/health          {"status":"ok","db":"up"}  ✅
```

## 서비스
```
https://golf.remo.re.kr/            200
https://golf.remo.re.kr/login       200  (ParkGolf AI Pro 렌더)
https://golf.remo.re.kr/password    200
로그인 (Origin: golf.remo.re.kr)     ✅  테스트강사 / 스윙골프센터
CORS preflight                       ✅  Access-Control-Allow-Origin
TLS (양 도메인)      Let's Encrypt ~2026-11-24
```

---

# 9. 남은 작업

## 판단 필요
| 항목 | 내용 |
|------|------|
| ~~puppeteer 제거~~ | **2026-08-27 해소** — 제거가 아니라 완성으로 결론. 결과서(PDF) 기능 실사용 중 (`docs/09-api-reference.md` §2-6) |

## 미착수
| # | 항목 | 사유 |
|---|------|------|
| 1 | DB 자동 백업 cron | 현재 수동 백업 1회뿐 |
| 2 | `docker-compose.yml` | DB 구성이 코드에 없어 재현 불가 (⚠️ `external: true` 필수 — 빠뜨리면 데이터 소실) |
| 3 | DB 마이그레이션 도입 | 프로덕션 `synchronize:false` + 마이그레이션 0건 = **스키마 변경 경로 없음** |
| 4 | 테스트 코드 | 0건. Clean Architecture 로 목 주입이 쉬운데 활용 못 함 |
| 5 | 외부 모니터링 | 2.4개월 중단을 아무도 몰랐다. `/api/health` 는 준비됨 |
| 6 | 이메일 로그인 설계 | `email` 이 로그인 키인데 nullable + unique 없음. 가입 시엔 선택 |
| 7 | REMO 자격증명 폴백 | 프로덕션에서도 `mock-api-key` 로 조용히 폴백 |

## ⚠️ 2026-09-09 까지 유지할 것
**PM2 `golf-frontend` 와 nginx `golf.remo.re.kr` vhost 를 삭제하지 말 것.**
Vercel 전환 롤백 창구다. A 레코드 복귀로 5분 내 복구되나 받아줄 서버가 살아 있어야 한다.
롤백 명령은 `.claude/WORK_LOG.md` 에 기록되어 있다.

## 이전 미해결 이슈 9건
`CLAUDE.md` §6 의 C-01, M-01~04, m-01~04 는 **2025-12-11 기준**이다.
백엔드가 2.4개월 중단되어 있었으므로 **E2E 재현으로 재판정이 필요**하다.
C-01(체형 분석 이미지 필드) 재판정 시 §7-1 을 참고할 것.

---

# 10. 문서 구성

| 문서 | 용도 |
|------|------|
| [`CURRENT_STATUS.md`](../CURRENT_STATUS.md) | **현재 상태 요약** — 새 세션 시작 시 첫 확인 |
| [`.claude/WORK_LOG.md`](../.claude/WORK_LOG.md) | 작업 이력 상세 + 롤백 명령 |
| [01-system-overview](./01-system-overview.md) | 시스템 개요 · 데이터 모델 |
| [02-runtime-status](./02-runtime-status.md) | 런타임 검증 (사고 당시) |
| [03-issue-analysis](./03-issue-analysis.md) | 문제 분석 15건 |
| [04-remediation-plan](./04-remediation-plan.md) | 복구 런북 |
| [05-integration-status](./05-integration-status.md) | 연동 검토 (GitHub · REMO · DNS) |
| [06-execution-plan](./06-execution-plan.md) | 실행 플랜 상세 (diff 참조용) |
| [07-deployment-architecture](./07-deployment-architecture.md) | 배포 아키텍처 판정 |
| [08-detailed-work-plan](./08-detailed-work-plan.md) | 작업 플랜 + **진행 현황** |
| [**09-api-reference**](./09-api-reference.md) | **자체 API 구조 (24 엔드포인트)** |
| [**10-remo-api-reference**](./10-remo-api-reference.md) | **REMO AI API 구조 (실측 기반)** |
| [11-completion-report](./11-completion-report.md) | 이 문서 |

---

# 11. 커밋 이력

```
f6ccec0  docs: Update project status after Vercel migration
24b45cc  docs: Record remaining improvements
62f447a  feat: Add change-password, secure image endpoint, and retry UI
0a0d4ff  Merge work log update
1136403  Merge pull request #1 from newtechremo/feature/vercel-migration
331a123  fix: Save REMO posture uuid and fix history query param parsing
9a716ba  chore: Trigger Vercel deployment
7ad228c  docs: Add analysis docs, deploy scripts, and PM2 crash protection
fbf7145  feat: Prepare frontend for Vercel deployment
0c5fa67  fix: Make REMO analysis async and harden auth/file serving
```

PR: https://github.com/newtechremo/golf-swing-system/pull/1
