# 작업 로그 (Work Log)

> 이 문서는 Claude가 작업할 때마다 업데이트합니다.
> 새 세션에서도 이전 작업 내용을 파악할 수 있습니다.

---

## 현재 진행 중인 작업

**없음** - 대기 중

> ⚠️ **2026-08-26 기준 서비스 장애 상태**
> 서버 이전(공인 IP `49.168.236.221` → `49.169.8.19`) 후 실행 세팅이 수행되지 않았다.
> ✅ **도메인 전환 완료** (2026-08-26) — https://golf.remo.re.kr 이 Vercel 서비스 중
>   백엔드 API: https://api-golf.remo.re.kr/api (자체 서버 유지)
>   ⚠️ **2026-09-09 까지 PM2 golf-frontend + nginx golf vhost 삭제 금지** (롤백 창구)
> ✅ Vercel 배포 (2026-08-26)
>   대체 URL: https://parkgolf-ai-pro.vercel.app
>   백엔드 API: https://api-golf.remo.re.kr/api (health 200, 로그인·대상자·분석결과 검증 완료)
>   ⚠️ `golf.remo.re.kr` 은 아직 자체 서버 → **실서비스 영향 없음**
> ✅ GitHub ↔ Vercel 연동 완료 — `git push` 자동배포 동작 (브랜치 `feature/vercel-migration`)
> ✅ **잔여 개선 완료** — change-password / 이미지 보안 / 재시도 UI / allSettled
> ▶ **다음**: ① QA ② puppeteer 제거 여부 판단(Chromium 563MB) ③ DB 마이그레이션 도입
> ✅ golf.remo.re.kr 완전 복구 확인 (2026-08-26)
>   DNS·MySQL·백엔드·인증서(~11/24)·외부접속 전부 검증 완료
> ✅ **GitHub Actions `SERVER_HOST`/`PROJECT_PATH` 갱신 완료**
> 🔴 **잔여1: 외부 SSH(22) 미개방** → Actions 배포 불가. self-hosted runner 등 방식 재설계 필요
> 🟠 **잔여2: DNS 죽은 구 IP 8건** (되살릴 서비스만 선별 필요)
> ℹ️ 타 서버로 이전된 도메인 9건의 로컬 인증서 잔재는 **사용자 영향 없음 — 방치 가능**

---

## 작업 이력

### 2026-08-26

### [2026-08-26] 잔여 개선 작업 완료 (비밀번호 변경 / 이미지 보안 / 재시도 UI)

**🔵 체형분석 비동기화는 불필요 — 실측으로 확인**
REMO 체형분석 API 단일 호출 실측: **0.406 / 0.413 / 0.430초** (3회 평균 0.42초)
4방향 병렬이면 1초 미만. 골프 스윙(접수 후 30~60초 분석 + 폴링)과 달리
**결과를 즉시 반환하는 동기 API** 다(응답에 far_coords 등 15개 필드 포함).
→ 비동기화하면 불필요한 상태 관리만 늘어난다. **동기 유지 결정, 작업목록에서 제외.**

**① change-password 엔드포인트 구현**
프론트(`lib/auth.ts:116`)가 호출하는데 백엔드에 없어 항상 404 였다.
- `ChangePasswordDto` / `ChangePasswordUseCase` 신규
- 현재 비밀번호 bcrypt 검증 → 동일 비밀번호 차단 → 새 해시 저장(라운드 10)
- 검증 전 케이스 통과:
```
미인증 401 / 현재비번오류 401 / 6자미만 400 / 동일비번 400
정상변경 200 → 새 비번 로그인 200, 옛 비번 401 → 원복 200
```

**② 이미지 엔드포인트 보안 (백엔드 + 프론트 동시 적용)**
- `GET /body-posture/images/*` 만 가드가 빠져 있었다.
  경로만 알면 **누구나 대상자의 체형 사진 조회 가능**했다(신체 촬영 이미지).
- `JwtAuthGuard` + **소유권 검증** 추가.
  경로 규약 `{folder}/{userId}/{file}` 에서 userId 추출 → `req.user.sub` 비교.
  가드만으로는 로그인한 타 강사가 볼 수 있다.
- ⚠️ `<img src>` 는 Authorization 헤더를 못 보내므로 가드만 붙이면 이미지가 전멸한다.
  **같은 커밋에서 프론트를 blob 방식으로 전환**:
  `axios responseType:'blob'` → `URL.createObjectURL` → `<img src="blob:...">`
  `blobUrlsRef` 로 추적해 재조회/언마운트 시 `revokeObjectURL` (메모리 누수 방지)
- 검증:
```
미인증 401 / 본인소유 200 / 타인소유(userId=9) 403 / 경로탐색 403
```

**③ 분석 대기 화면 재시도 UI**
에러 시 아무 조작도 못 하는 막다른 화면이었다. status 별로 버튼을 분기:
| status | 버튼 | 동작 |
|--------|------|------|
| `failed` | 다시 촬영 | REMO 가 스윙 구간 인식 실패 → 재업로드 페이지 |
| `pending` 잔류 / 폴링 타임아웃 | 다시 확인 | 폴링 카운터 초기화 후 재조회 |
| 공통 | 회원 정보로 | 회원 상세로 복귀 |

기존 `handleRetry`(재업로드용)와 이름이 충돌해 `handleReupload` 로 분리.

**④ 체형분석 부분 실패 허용**
`Promise.all` 은 한 방향 실패가 전체를 400 으로 만들어 **이미 성공한 방향의 결과까지 버렸다.**
`allSettled` 로 전환 — 부분 성공을 저장하고 전부 실패한 경우에만 요청 실패 처리.

**배포**
`62f447a` main 푸시 → Vercel 자동배포 15초 내 READY
```
https://golf.remo.re.kr/                     → 200
https://golf.remo.re.kr/login                → 200
https://golf.remo.re.kr/password             → 200
https://golf.remo.re.kr/body-analysis-result → 200
회귀검증: health / subjects / history / golf-swing/analysis 전부 200
```

**puppeteer 판단 보류 (제품 결정 필요)**
`PdfGenerationService` 는 `app.module.ts` 등록 외 **사용처 0건**.
`node_modules/puppeteer-core` 13MB + **Chromium 캐시 563MB**.
PDF 리포트 기능 계획이 없다면 제거 대상. 계획이 있으면 유지.

### [2026-08-26] 도메인 전환 완료 — golf.remo.re.kr → Vercel

**개선 작업 2건**
| ID | 문제 | 원인 | 결과 |
|----|------|------|------|
| 1 | 체형분석 uuid 유실 | `frontUuid: null` 등 4개 하드코딩. REMO 는 uuid 를 반환하는데 버리고 있었다 → 재조회 경로(`if status==='pending' && xxxUuid`)가 죽어 있었음 | 4방향 업로드 시 **uuid 4개 저장 + 전부 completed** 확인 |
| 2 | `history/subject/:id` 400 | **`ParseIntPipe` 가 아니라 전역 `ValidationPipe`** 가 원인. `transform:true` 가 먼저 실행되며 파라미터 타입이 number 면 `transformPrimitive` 가 `+undefined` → **NaN** 으로 바꾼다. 그래서 `optional:true` 로도 통과 불가 | string 으로 받아 직접 파싱 → **파라미터 6종 전부 200**, 이력 20건 조회 |

**🔵 체형분석 leftSide/back — 버그가 아니었음 (이전 보고 정정)**
- REMO API 를 실제 이미지로 직접 호출한 결과 **front/side/back 3방향 모두 `state:True` + uuid 반환**
- DB 실측: `left_side_image_url` = `[]` **빈 문자열** → 애초에 업로드되지 않음
  (앞서 `IS NULL` 로 검사해 빈 문자열을 "있음"으로 오판했다)
- 4방향 전부 업로드하는 테스트에서 **leftSide·back 모두 completed** → 정상 동작 확인
- 결론: 원래 안 되던 게 아니라 **사용자가 정면·우측면만 촬영**했던 것

**PR #1 병합**
https://github.com/newtechremo/golf-swing-system/pull/1 (커밋 6건)
main 병합 → Vercel 자동배포 45초 내 READY

**도메인 전환 (golf.remo.re.kr → Vercel)**
1. Vercel 프로젝트에 도메인 추가 (CLI 가 도메인 구매 흐름으로 빠져 **REST API 사용**)
2. 소유권 검증 TXT — `_vercel.remo.re.kr` 에 **기존 4건 보존하며** golf 1건 추가 (총 5건)
   ⚠️ UPSERT 는 전체 교체이므로 기존 값을 반드시 함께 넣어야 한다
3. 검증 통과 → A 레코드 DELETE + CNAME CREATE
   `A 49.169.8.19` → `CNAME 6ab47e2c9278e9ac.vercel-dns-016.com`
4. `misconfigured: false` 확인, Let's Encrypt 인증서 자동 발급 (~2026-11-24)

**최종 검증**
```
https://golf.remo.re.kr/           → 200
https://golf.remo.re.kr/login      → 200  (ParkGolf AI Pro 정상 렌더)
https://golf.remo.re.kr/main       → 200
번들 api-golf.remo.re.kr 인라인    → ✅
로그인 (Origin: golf.remo.re.kr)   → ✅ 테스트강사 / 스윙골프센터
CORS preflight                     → Access-Control-Allow-Origin: https://golf.remo.re.kr
TLS                                → CN=golf.remo.re.kr, Let's Encrypt, ~2026-11-24
```

**⚠️ 롤백 창구 — 2026-09-09 까지 유지할 것**
- PM2 `golf-frontend` (online) 와 nginx `golf.remo.re.kr` vhost 를 **삭제 금지**
- 문제 발생 시 5분 내 복구:
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0575940EHXG9YRNO7QK --profile remo-aws \
  --change-batch '{"Changes":[
    {"Action":"DELETE","ResourceRecordSet":{"Name":"golf.remo.re.kr.","Type":"CNAME","TTL":300,
      "ResourceRecords":[{"Value":"6ab47e2c9278e9ac.vercel-dns-016.com."}]}},
    {"Action":"CREATE","ResourceRecordSet":{"Name":"golf.remo.re.kr.","Type":"A","TTL":300,
      "ResourceRecords":[{"Value":"49.169.8.19"}]}}]}'
```

### [2026-08-26] GitHub ↔ Vercel 연동 완료 — git push 자동배포 동작

**❌ 이전 보고 정정 — "CLI 버그"가 아니었다**
`vercel env add ... preview` 가 `git_branch_required` 를 반환한 것은
**프로젝트에 Git 이 연결되어 있지 않았기 때문**이다.
Preview 배포는 Git 브랜치 개념에 묶여 있어, Git 미연결 프로젝트에는
preview 브랜치가 존재하지 않는다. CLI 의 정상 동작이었다.
(다만 Git 연결 후에도 CLI 는 계속 거부 → **REST API 로 우회 성공**)

**작업 내역**
| # | 작업 | 결과 |
|---|------|------|
| 1 | 브랜치 `feature/vercel-migration` 생성 + 커밋 3건 | 백엔드 / 프론트 / 문서·운영 분리 |
| 2 | 양쪽 빌드 검증 후 GitHub push | backend `nest build` ✅ / frontend 14라우트 ✅ |
| 3 | `vercel git connect` | `newtechremo/golf-swing-system` 연결 |
| 4 | `rootDirectory` `.` → **`frontend`** (REST API) | 모노레포 대응. 안 바꾸면 Git 배포 시 빌드 실패 |
| 5 | preview 환경변수 (REST API `POST /v10/projects/{id}/env`) | 3개 환경 전부 설정 완료 |
| 6 | 빈 커밋 push → 자동배포 검증 | **30초 내 BUILDING → READY** ✅ |

**커밋**
```
9a716ba chore: Trigger Vercel deployment
7ad228c docs: Add analysis docs, deploy scripts, and PM2 crash protection
fbf7145 feat: Prepare frontend for Vercel deployment
0c5fa67 fix: Make REMO analysis async and harden auth/file serving
```
브랜치: `feature/vercel-migration` (main 미병합 — 검수 후 PR 예정)

**Vercel 프로젝트 최종 상태**
```
rootDirectory   : frontend
Git 연결        : github newtechremo/golf-swing-system
프로덕션 브랜치 : main
framework       : nextjs
env             : NEXT_PUBLIC_API_BASE_URL (production/preview/development)
```

**⚠️ preview 배포는 SSO 보호로 302**
`ssoProtection: {deploymentType: 'all_except_custom_domains'}` (팀 기본값).
preview URL 은 Vercel 로그인 없이 접근 불가 → **검수는 production 별칭 사용**:
**https://parkgolf-ai-pro.vercel.app** (200 확인)
필요 시 대시보드 Settings → Deployment Protection 에서 조정 가능.

**실서비스 영향 없음**
`golf.remo.re.kr` A 레코드 = `49.169.8.19` (자체 서버) 유지.
커스텀 도메인 미연결 상태이므로 기존 서비스 정상 동작.

### [2026-08-26] Vercel 배포 완료 — 검수 가능 상태

**배포 결과**
| 항목 | 값 |
|------|-----|
| Vercel 프로젝트 | `remo-dev/parkgolf-ai-pro` |
| **검수 URL** | **https://parkgolf-ai-pro.vercel.app** |
| 배포 ID | `dpl_5WzARmtG3qqzgmk9hBgspEHuzDPE` |
| 백엔드 API | `https://api-golf.remo.re.kr/api` (인증서 ~2026-11-24) |

**S2 인프라 (사용자가 `deploy/setup-api-golf.sh` 실행)**
- nginx vhost 배치 + Let's Encrypt 발급 완료
- 검증: `/api/health` → 200 `{"status":"ok","db":"up"}` / `/api/subjects` → 401
- 외부 관점 확인 완료 (r.jina.ai 경유로 health 응답 수신)

**S3 Vercel**
- `vercel link` → `parkgolf-ai-pro` 생성 (Next.js 자동 감지)
- `NEXT_PUBLIC_API_BASE_URL` = `https://api-golf.remo.re.kr/api` (production/development)
  ⚠️ preview 환경은 CLI가 `git_branch_required` 를 반복 반환해 미설정.
     커스텀 도메인 미연결 상태라 production 배포로 우회함
- 배포 성공 → 14개 라우트 정적 생성
- 번들에 `api-golf.remo.re.kr` 인라인 확인 (`/_next/static/chunks/fe7c4287843eee4a.js`)

**CORS 추가 조치**
Vercel 도메인이 화이트리스트에 없어 preflight 가 `Access-Control-Allow-Origin` 없이 반환됨.
`backend/.env` 의 `CORS_ORIGINS` 에 `https://parkgolf-ai-pro.vercel.app` 추가 후 재기동.
→ preflight 204 + `Access-Control-Allow-Origin: https://parkgolf-ai-pro.vercel.app` 확인

**엔드투엔드 검증 (Vercel Origin 헤더 포함)**
```
페이지        /  /login  /main            → 200 200 200
title                                     → ParkGolf AI Pro | 파크골프 전문가 AI 분석 서비스
로그인        POST /api/auth/login        → 200 (테스트강사 / 스윙골프센터)
대상자        GET  /api/subjects          → 200 (송미림·문재연 등 실데이터)
분석결과      GET  /golf-swing/analysis/91→ 200
헬스체크      GET  /api/health            → 200
```

**⚠️ 실서비스 영향 없음 확인**
`golf.remo.re.kr` 은 여전히 A 레코드 `49.169.8.19`(자체 서버)를 가리킨다.
Vercel 에 커스텀 도메인을 연결하지 않았으므로 기존 서비스는 그대로 동작한다.
검수 완료 후 CNAME 전환 예정 (롤백 창구 2주 유지 조건).

**기존 이슈로 확인된 것 (마이그레이션 무관)**
`GET /api/history/subject/:id` → 400 `Validation failed (numeric string is expected)`
localhost 직접 호출에서도 동일하게 재현됨 → **이전부터 있던 버그**. 별도 조사 필요.

### [2026-08-26] STEP 1 + Vercel 준비 실행 완료

**목표**: Vercel 검수까지 가는 최단 경로. 체형분석(body-posture) 이슈는 의도적으로 후순위.

**백엔드 수정 (전부 검증 통과)**
| ID | 작업 | 파일 | 검증 결과 |
|----|------|------|-----------|
| S1-1 | REMO 호출 fire-and-forget | `golf-swing.controller.ts` | **응답 30~60초 → 0.76초** ✅ |
| S1-12 | REMO 520 을 `failed` 로 반영 | 〃 `refreshAnalysisResult` | 무한 processing 해소 ✅ |
| S1-3 | 영상 상한 500MB → **100MB** | 〃 `fileSize` | 120MB → **413** ✅ |
| S1-3 | REMO axios `timeout: 180000` + 지수백오프 | `remo-api.service.ts` | ✅ |
| S1-3 | REMO 기본 URL `http` → `https` | 〃 | ✅ |
| S1-5 | 토큰 `type` 클레임 분리 | `LoginUserUseCase` / `jwt-auth.guard` / `RefreshTokenUseCase` | **P0-2 차단 ✅** |
| S1-6a | 경로탐색 차단 + mime 화이트리스트 | `local-storage.service.ts` | `../../.env` → **404** ✅ |
| S1-7 | CORS 화이트리스트 (`CORS_ORIGINS`) | `main.ts` + `.env` | ✅ |
| S1-8 | `dropSchema` 제거 / `axios` → dependencies | `app.module.ts`, `package.json` | ✅ |
| S1-10 | `/api/health` 신규 (DB 연결까지 확인) | `health.controller.ts` | `{"status":"ok","db":"up"}` ✅ |
| S1-4 | `max_memory_restart` 1G → 2G | `ecosystem.config.js` | ✅ |

**🔴 P0-2 취약점 차단 실증**
```
             수정 전  수정 후
refresh → /subjects       200  →  401  ★
access  → /auth/refresh   200  →  401  ★
access  → /subjects       200  →  200
refresh → /auth/refresh   200  →  200
```
토큰 payload 에 `type: 'access'` / `type: 'refresh'` 가 정상 포함됨을 디코딩으로 확인.
**하드 컷오버 — 기존 토큰 전부 무효화. 사용자 재로그인 필요.**

**프론트 수정**
| ID | 작업 | 비고 |
|----|------|------|
| S1-11 | 비밀번호 변경 `await` 누락 수정 | 핸들러를 `async` 로 함께 변경 (안 하면 **빌드 실패**) |
| S1-3 | 업로드 timeout 300s → 180s | |
| S3-2 | `getApiBaseUrl()` 절대 URL 전환 | `getImageUrl` 도 동반 수정 |
| S3-3 | `rewrites()` 로컬 전용 격리 (주석 명시) | |
| S3-1 | `.gitignore` 락파일 추적 활성화 | Vercel 빌드 재현성 |
| S3-1 | `"latest"` 4개 버전 고정 | dialog 1.1.15 / slider 1.3.6 / analytics 1.6.1 / recharts 3.6.0 |
| S3-1 | `engines: {node:">=22"}` + 프로젝트명 `parkgolf-ai-pro-frontend` | |

**🔴 Vercel 빌드 블로커 2건 사전 발견·해결**
1. **`vaul@0.9.9` 가 React 19 미지원** → `npm install` 이 ERESOLVE 로 실패.
   기존 락파일은 `--legacy-peer-deps` 로 만들어진 것으로 추정.
   → **미사용 컴포넌트**임을 확인 후 `vaul@1.1.2`(React 19 지원)로 업그레이드. 충돌 해소
2. **`await` 추가로 빌드 실패** — 핸들러가 `async` 가 아니었다. `async` 로 변경

**프로덕션 빌드 검증**
```
NEXT_PUBLIC_API_BASE_URL=https://api-golf.remo.re.kr/api npm run build
→ ✓ 14개 라우트 전부 정적 생성 성공
→ 번들에 api-golf.remo.re.kr 인라인 확인 (.next/static/chunks/*.js)
```

**인프라 (S2)**
- ✅ Route53 `api-golf.remo.re.kr` A → `49.169.8.19` (INSYNC, 8.8.8.8 전파 확인)
- ⏸ nginx vhost — **sudo 필요**. `deploy/api-golf.remo.re.kr.nginx` + `deploy/setup-api-golf.sh` 준비 완료

**보류 항목 (사용자 지시로 후순위)**
- S1-2 body-posture REMO 4회 비동기화
- S1-6b 이미지 엔드포인트 인증 가드 + S1-9 프론트 blob 로딩
  → 가드를 붙이면 `<img src>` 가 깨지므로 프론트와 **한 배포에 묶어야 함**.
     경로탐색(위험한 부분)은 S1-6a 로 이미 차단됨
- S1-13 체형 leftSide/back 실패 조사

### [2026-08-26] STEP 0 실행 완료 (S0-1 ~ S0-3)

**S0-1 테스트 계정 복구 ✅**
- `id=1 / instructor001 / test@example.com` 비밀번호를 `Test1234!` 로 재설정 (bcrypt 라운드 10)
- 로그인 검증 성공 — 테스트강사 / 스윙골프센터 / active / paid
- 인증 API 동작 확인: `GET /subjects` → **11명** 정상 반환
- `CLAUDE.md` 정정: 테스트계정 / 서비스명(**ParkGolf AI Pro — 파크골프**) / `pnpm dev`→`npm run dev` /
  미해결 9건에 "2025-12-11 기준, E2E 재현 필요" 경고 추가

**🔴 P0-2 취약점 실측 확인 (이론 아님)**
```
refreshToken 으로 GET /subjects 호출 → HTTP 200
```
refresh 토큰이 access 토큰으로 그대로 통용됨을 **실제로 재현**. S1-5 수정 후 401 이 되어야 정상.

**S0-2 멈춘 레코드 회수 ✅ — 원인 규명**
`user_id=1` 소유 12건에 `POST /analysis/:id/refresh` 실행. **전부 REMO Error 520 반환:**
```
first golf section recognition error, error: list index out of range   (8건)
get golf result error, error: list index out of range                  (3건)
get golf score error, error: bad operand type for abs(): 'NoneType'    (1건)
```
- **우리 시스템 문제가 아니라 REMO 가 영상에서 스윙 구간을 인식하지 못해 분석 실패**한 것
- 🔴 **진짜 버그: REMO 의 520 에러를 `failed` 로 반영하지 않고 `processing` 을 유지**한다.
  `refresh` 는 534(진행중)만 처리하고 520 은 예외를 던져 status 를 갱신하지 않는다.
  → 사용자는 몇 달째 "분석 중"으로만 본다. **S1 에 항목 추가 필요**
- ✅ **REMO 결과 보관기간이 최소 7개월** 임을 확인 (2026-01-17 건도 응답함) — 향후 재시도 정책 근거
- 12건을 `failed` 로 정리 → `processing 14 → 2` (남은 2건은 `user_id=6` 소유, 2026-05-17)

**🔴 신규 발견 — 체형분석 leftSide/back 구조적 실패 (11건 동일 패턴)**
```
front: completed / rightSide: completed / leftSide: pending / back: pending
```
- 이미지는 **4방향 모두 업로드되어 있다** (URL 존재 확인) → 미업로드가 아니라 실제 실패
- `body-posture.controller.ts:334-337` — `analysisResults.X ? 'completed' : 'pending'`
  → leftSide/back 의 REMO 결과가 falsy
- `body-posture.controller.ts:328-331` — **`frontUuid: null, leftSideUuid: null, ...` 로 저장**
- `body-posture.controller.ts:509` — `if (status==='pending' && analysis.leftSideUuid)`
  → **uuid 가 null 이라 복구 경로가 절대 실행되지 않는다**
- 즉 체형분석 pending 11건은 **복구 불가**. REMO 에 물어볼 uuid 자체가 없다
- `Promise.all` 실패 시 이미 할당된 front/rightSide 만 저장되는 구조가 이 패턴을 만든 것으로 추정
- **`CLAUDE.md` C-01 "체형 분석 이미지 필드 부족(0/3)" 과 연관 가능성 높음** → 별도 조사 필요

**S0-3 PM2 안정화 ✅**
- `ecosystem.config.js` — golf-backend/golf-frontend 양쪽에
  `min_uptime:10000` / `max_restarts:15` / `restart_delay:5000` 추가
- `pm2-logrotate` 3.0.0 설치 (max_size 10M / retain 7 / compress / 매일 0시)
- **로그 962MB → 6.7MB** (955MB 회수)

**STEP 0 완료 후 상태**
```
golf-backend  online  재시작 1  |  golf-frontend online  재시작 3
API 가드      401 (정상)        |  TLS 검증      200 (정상)
MySQL         running / restart=unless-stopped
golf 분석     completed 72 / failed 17 / processing 2
```


#### [완료] 상세 작업 플랜 확정 (2차 개정) — docs/08-detailed-work-plan.md  ⭐실행 기준
- **확정 전략**: **프론트만 Vercel · 백엔드 + DB 는 현 서버 유지**
  | 계층 | 확정 | 근거 |
  |------|------|------|
  | 프론트(Next.js 16) | ✅ Vercel | 14/14 페이지 `'use client'` 순수 SPA |
  | 백엔드(NestJS) | ❌ 서버 유지 | REMO 키 보관 · 로컬 파일 · `@Cron` · DB 커넥션 |
  | MySQL | ❌ 서버 유지 | 4.38MB/14테이블, 이전 이득 없음 |
  | 결과 이미지 | ❌ 서버 유지 | 서버리스는 영속 디스크 없음 |
  | API 진입점 | 🔄 `api-golf.remo.re.kr` 신설 | rewrites 사용 불가해짐 |
- **신규 발견 (2차 검토)**
  - 🔴 **비밀번호 변경이 항상 "성공"으로 표시** — `app/password/page.tsx:44` 에서
    `changePassword()` 에 **`await` 누락**. `Promise<boolean>` 은 항상 truthy →
    실패해도 성공 UI + `/main` 리다이렉트. 게다가 **백엔드에 `POST /auth/change-password`
    엔드포인트 자체가 없다** (auth.controller 는 register/login/refresh 뿐) → S1-11 신설
  - 🟡 프론트 타입오류 **9건** (`ignoreBuildErrors` 로 가려짐) — 8건은 `components/ui/chart.tsx`
    (shadcn+recharts 업스트림 이슈, 동작 무영향), 1건이 위 버그 → 플래그는 이번엔 유지
  - 🟡 `engines` 미지정 → Vercel 기본 Node 사용. 로컬 v24 와 어긋날 수 있어 고정 필요
  - 빌드 자산: `.next` 74MB / `public` 4.6MB(25파일) — Vercel 한도 내
- **플랜**: STEP 0(선결 0.5일) / STEP 1(백엔드 2일) / STEP 2(인프라+DB 0.5일) / STEP 3(Vercel 1일) = **4일**
  작업 ID **22개** (S0-1~S3-7), 각각 `대상·diff·검증·소요` 명시
- **동시 배포 필수 묶음**: S1-5(토큰) + S1-6(이미지가드) + S1-9(프론트 blob)
- **데이터 소실 위험**: S2-5 `docker-compose.yml` 은 `external: true` 필수
- **순서 제약**: S1-5~S1-7(보안) 완료 **전에는 S2 의 api-golf 를 공개하지 말 것**
- **수정 파일**: `docs/08-detailed-work-plan.md` (전면 개정), `docs/README.md`
- **작업 내용**: 07번 3-STEP 플랜을 코드·DB 실측으로 재검증 → **빈틈 8건 발견** → STEP 0 신설 및 범위 확대
- **검토에서 드러난 빈틈**
  | # | 내용 | 영향 |
  |---|------|------|
  | 1 | 🔴 **테스트 계정이 없다** — `CLAUDE.md` 의 `instructor001@golf.com` 은 DB 부재, 비번도 불일치 | 모든 검증 시나리오 실행 불가 → STEP 0 신설 |
  | 2 | 🔴 **body-posture 도 동기** — `POST /analyze` 가 REMO 를 **4회** 동기호출(253/266/279/292), 조회도 4회(494/511/527/543) | golf 만 고치면 절반만 해결 |
  | 3 | 🔴 **멈춘 레코드 18건** — golf `processing` 14 + posture `pending` 4. 2026-02~05 분포, **크레딧 차감됐는데 결과 없음** | 실제 운영 손실. `refresh` 로 회수 시도 필요 |
  | 4 | 🟠 S3 업로드도 동기 구간 → "응답 2~5초"는 낙관치 | 1차는 유지, 실측 후 판단 |
  | 5 | 🟠 fire-and-forget 유실 시 `pending` 잔류 → `refresh` 복구 **불가** (REMO 가 uuid 를 모름) | UI 재시도 버튼으로 갈음 |
  | 6 | 🟠 `NEXT_PUBLIC_*` 은 빌드타임 인라인 → Vercel env 변경만으론 반영 안 됨 | 재배포 필수, 문서화 |
  | 7 | 🟡 비동기화가 동시 업로드를 늘림 → 100MB×3 ≈ 700MB 피크 | `max_memory_restart` 1G→2G |
  | 8 | 🟡 크로스오리진 전환 시 OPTIONS preflight | nginx 통과 검증 항목 추가 |
- **결과 플랜**: STEP 0(선결 0.5일) / STEP 1(백엔드 2일) / STEP 2(인프라+DB 0.5일) / STEP 3(Vercel 1일) = **4일**
  - 작업 ID 21개(S0-1~S3-7), 각각 `대상·diff·검증·소요` 명시
  - **동시 배포 필수 묶음**: S1-5(토큰) + S1-6(이미지가드) + S1-9(프론트 blob)
    → 따로 나가면 체형분석 이미지가 전부 깨짐
  - **데이터 소실 위험 1건**: S2-5 `docker-compose.yml` 은 `external: true` 필수(빠뜨리면 빈 볼륨 생성)
- **멈춘 레코드 실측**
  ```
  golf_swing_analyses   : processing 14 / completed 72 / failed 5
  body_posture_analyses : pending 4 / completed 27 / failed 9
  id 96,95 (2026-05-17) / 73,72 (2026-03-20) / 63,52,46,44 (2026-02) ...
  ```
  프론트 폴링이 60회×5초=**5분에서 포기**하므로 REMO 분석이 5분 초과 시 영구 `processing` 잔류
- **수정 파일**: `docs/08-detailed-work-plan.md` (신규), `docs/README.md`

#### [완료] 배포 아키텍처 판정 — docs/07-deployment-architecture.md
- **작업 내용**: Vercel 이전 가능성, 30~60초 분석요청 대응, 백엔드 서버 필요성, DB 구성 진단
- **핵심 발견 — 30~60초는 불필요한 `await` 였다**
  - 시스템은 **이미 비동기 설계**: DB 상태머신(`pending→processing→completed`) +
    프론트 폴링(`pollGolfSwingAnalysis` 60회×5초) 모두 존재
  - 그런데 `golf-swing.controller.ts:100-132` 가 REMO 호출을 `await` 로 붙잡음
  - **`remoResult` 는 응답에 쓰이지도 않는다** (DB 업데이트 전용) → 기다릴 이유가 없음
  - 게다가 nginx 에 `proxy_read_timeout` 미설정 → **기본 60초에 이미 잘리고 있었을 가능성**
  - 해법: fire-and-forget → 응답시간 **30~60초 → 2~5초**. 프론트 코드 변경 불필요
- **판정 결과**
  | 질문 | 답 |
  |------|-----|
  | Vercel 프론트 이전 가능? | ✅ 가능. 14/14 페이지 `'use client'` 순수 SPA |
  | 30~60초가 Vercel 제약에 걸리나? | ❌ 무관. 브라우저→백엔드 직접 호출이라 Vercel 함수가 경로에 없음 |
  | 백엔드 서버 필요? | ✅ **필요**. 로컬 파일저장(`results/` 5.5MB, 실사용) + `@Cron` 스케줄러 → 서버리스 불가 |
  | DB 구성 문제? | ✅ 문제없음. 4.38MB/14테이블. 자동백업 cron + docker-compose 코드화만 추가 |
- **🔴 Vercel 이전의 유일한 함정**: `next.config.mjs` 의 `rewrites()` 를 프로덕션에 쓰면
  요청이 Vercel 엣지를 경유해 함수 타임아웃/바디제한에 걸린다.
  → 로컬 전용으로 격리하고 프로덕션은 `NEXT_PUBLIC_API_BASE_URL` 절대 URL 직접 호출
- **06번 대비 변경**: 영상상한 200MB→**100MB** / `diskStorage`·스트리밍base64 **불필요**
  (상한 낮추면 메모리 피크 370MB로 `max_memory_restart 1G` 안에 들어옴)
  / 전체 소요 12~18일 → **3~4일** / Phase 7개 → **3단계**
- **덤**: `PdfGenerationService`(puppeteer, Chromium ~300MB)가 app.module 에 등록만 되고
  **어떤 컨트롤러도 사용하지 않음** → 계획 없으면 제거 검토
- **수정 파일**: `docs/07-deployment-architecture.md` (신규), `docs/README.md`

#### [완료] 실행 플랜 수립 — docs/06-execution-plan.md
- **작업 내용**: 분석 결과를 Phase 0~6 실행 단위로 분해. 파일:라인 단위 diff · 검증 명령 · 롤백 절차 포함
- **결과**:
  | Phase | 내용 | 소요 | 위험 |
  |-------|------|------|------|
  | 0 | 즉시 안정화 (PM2 폭주방지, 로그 954MB, 문서정정) | 30분 | 없음 |
  | 1 | 보안 P0 (refresh token 분리, 이미지 봉쇄, CORS, dropSchema) | 3~5일 | 중 |
  | 2 | nginx 재구성 + `api-golf.remo.re.kr` 신설 | 1일 | 중 |
  | 3 | 업로드 파이프라인 (diskStorage, 스트리밍 base64, nginx 200m) | 4~6일 | 높음 |
  | 4 | Vercel 프론트 이전 | 2~3일 | 중 |
  | 5 | 배포 파이프라인 정리 (SSH 폐기 → Backend CI + 로컬 스크립트) | 1일 | 낮음 |
  | 6 | 운영 기반 (헬스체크·모니터링·마이그레이션·테스트) | 지속 | 낮음 |
- **절대규칙 3가지**:
  1. Phase 1 완료 전 Phase 4 금지 (Vercel = 백엔드 인터넷 노출 → P0 결함 위험 직결)
  2. nginx `client_max_body_size` 단독 상향 금지 (현 25m 가 P1-5 OOM 을 막고 있음)
  3. Phase 4 전 락파일 커밋 필수 (`.gitignore` 가 `package-lock.json` 제외 + `"latest"` 의존성 4개)
- **신규 발견**: `frontend/package-lock.json` 이 `.gitignore` 로 git 미추적 → Vercel 빌드 비결정적
- **신규 발견**: Phase 1-2 로 이미지에 인증이 걸리면 `<img src>` 가 깨짐
  → `body-analysis-result/page.tsx` 8개 호출부를 axios blob 방식으로 **같은 배포에 묶어야 함**
- **수정 파일**: `docs/06-execution-plan.md` (신규), `docs/README.md`


#### [완료] 프로젝트 전체 분석 및 docs/ 문서화
- **작업 내용**: 코드 구성·시스템 구성 분석, Git 동기화 상태 및 런타임 실행 상태 검증, 문제 분석
- **결과**: `docs/` 폴더 신규 생성 (5개 문서, 약 1,870줄)
  - `docs/README.md` — 인덱스 및 TL;DR
  - `docs/01-system-overview.md` — 도메인/아키텍처/데이터모델/API/외부연동
  - `docs/02-runtime-status.md` — Git·런타임 검증 (실측 근거 포함)
  - `docs/03-issue-analysis.md` — 문제 15건 (P0 3 / P1 5 / P2 4 / P3 3)
  - `docs/04-remediation-plan.md` — 복구 런북 및 수정 계획
- **수정 파일**: `docs/*` (신규 5개), `.claude/WORK_LOG.md`

---

### [2026-08-26] 인증서 집계 오류 정정 + GitHub Actions secret 갱신

**❌ 이전 보고 오류 — "인증서 17건 만료" 는 과대집계**
- 검증 방법 오류: `openssl s_client -connect 127.0.0.1:443 -servername <도메인>` 으로
  **이 서버가 내어주는 인증서**를 읽었으나, 해당 도메인들은 DNS가 타 서버를 가리켜
  **사용자는 이 서버에 도달하지 않는다.** 로컬 인증서 파일 잔재를 실제 장애로 오분류함
- 실제 DNS 목적지로 재검증한 결과:

| 도메인 | 실제 IP | HTTP | 인증서 |
|--------|---------|------|--------|
| hongtong.kr | 216.198.79.1 | **200** | 2026-11-20 ✅ |
| barrierfree.eumc.ac.kr | 76.76.21.21 | **200** | 2026-11-11 ✅ |
| remo-ai-doc.remo.re.kr | 76.76.21.21 | 307 | 2026-10-14 ✅ |
| remo-test.online | 104.21.91.235 | 530(CF origin) | 2026-11-07 ✅ |
| well-aging.kr 5건 | 218.50.254.48 | 000 | 해당 서버 무응답 — **별도 인프라 소관** |

- 결론: **타 서버로 이전된 도메인들은 정상 서비스 중.** 이 서버의 vhost·인증서 잔재는
  사용자 영향 없음 → **방치해도 무해** (비용은 갱신 실패 로그 노이즈뿐)
- 정정된 실제 상황: DNS→신IP 3건 정상 / DNS→죽은 구IP **8건**만 진짜 장애 / 타서버 9건 무관

**✅ GitHub Actions secret 갱신**
| Secret | 이전 | 변경 |
|--------|------|------|
| `SERVER_HOST` | 2026-01-13 (구 IP 추정) | **`golf.remo.re.kr`** — IP 재변경 시 DNS 따라 자동 추종 |
| `PROJECT_PATH` | 2026-01-13 | **`/home/finefit-temp/Desktop/project/golf-swing-system`** |
| `SERVER_USER` / `SERVER_PORT` / `SERVER_PASSWORD` | 미변경 | 값 확인 불가, 아래 이슈로 재설계 필요 |

**🔴 신규 발견 — 외부에서 SSH 포트 도달 불가 (배포 파이프라인 근본 무력)**
- 로컬 sshd: `active`, `Port 22`, `0.0.0.0:22 LISTEN`
- **외부 관점 포트체크: `49.169.8.19:22` → status=false (미개방), 2222 도 미개방**
- 이 서버는 NAT 뒤(`192.168.219.44`)이며 **80/443만 포워딩**되어 있다
- → `SERVER_HOST` 를 고쳐도 **GitHub Actions 러너가 SSH 접속 자체를 못 한다.**
  2026-01-15 마지막 배포는 구 환경(포트 개방 상태)에서 성공했던 것
- 선택지:
  1. **self-hosted runner** (권장) — pull 방식, 인바운드 포트 불필요. NAT 환경에 적합
  2. 라우터에 SSH 포워딩 + **비밀번호→키 인증 전환 필수** (현재 password 인증은 인터넷 노출 시 위험)
  3. Tailscale / Cloudflare Tunnel
  4. 워크플로 비활성화 + 수동 배포
- ⚠️ 어느 선택지든 `deploy.yml` 의 `password:` → `key:` 전환 권장
  (`8d302cd` 커밋이 키→비밀번호로 되돌린 상태)

### [2026-08-26] 인증서 갱신 검증 — 골프 복구 완료 확인

**✅ golf.remo.re.kr 완전 복구 (외부 접속 실증)**
| 항목 | 결과 |
|------|------|
| 인증서 | `CN=golf.remo.re.kr`, Let's Encrypt, **2026-08-26 ~ 2026-11-24 유효** |
| TLS 검증 접속 | `/login` → **200** (만료 시 000 이던 것) |
| **외부 실제 접속** | ✅ 페이지 정상 렌더 — title `ParkGolf AI Pro \| 파크골프 전문가 AI 분석 서비스`, 로그인폼 표시 |
| DNS | 8.8.8.8 → `49.169.8.19` |
| MySQL | running / **restart=unless-stopped** |
| 백엔드 | online, **재시작 0회 / uptime 24분** |
| API 가드 | `/backend-api/subjects` → 401 |

**⚠️ 이전 보고 정정 — 자동갱신은 꺼져있지 않았다**
- `certbot.timer`(deb)가 masked 인 것을 보고 "자동갱신 꺼짐" 이라 보고했으나 **오판**
- 실제로는 **snap certbot 5.7.0** 설치 환경이며 **`snap.certbot.renew.timer` 가 active**
  (하루 2회, 최근 2026-08-26 15:18 실행 / 다음 08-27 06:36)
- deb `certbot.timer` masked 는 snap 병행 설치 시 **정상 구성**
- 즉 타이머는 계속 돌았고, **DNS가 죽은 IP를 가리켜 HTTP-01 챌린지가 실패**해 만료된 것.
  원래 진단(“DNS가 죽으면 인증서 갱신도 실패”)은 정확했다

**🔴 서버 전체 인증서 현황 — 20개 중 17개 만료**
`snap.certbot.renew.service` 는 오늘 15:25 **exit-code 1 로 실패** (다수 도메인 갱신 실패)

DNS 도달 여부와 인증서 유효성이 **정확히 1:1 대응** — 인과관계 확증:

| 구분 | 건수 | 도메인 |
|------|------|--------|
| ✅ 유효 (DNS→`49.169.8.19`) | **3** | golf(11/24) · finefit-simpro(10/06) · whisper-api(10/10) |
| 🔴 만료 (DNS→죽은 구 IP) | **8** | barrierfree.remo / remo-data-bridge / remobodys / scoliosis / notebooklm-dev / admin-dev.healthwings / api-dev.healthwings / con-admin.tongpeoples |
| 🔴 만료 (DNS→타 서버) | **9** | well-aging 4건(218.50.254.48) · barrierfree.eumc(76.76.21.21) · remo-ai-doc(76.76.21.21) · hongtong.kr(216.198.79.1) · remo-test.online(104.21.91.235) · api-dev.well-aging |

- **타 서버 9건**: 이미 Vercel/Cloudflare/타 IP 로 이전됨 → 이 서버의 nginx vhost·인증서는 **잔재**.
  갱신이 영원히 실패하며 하루 2회 에러 발생 → **정리 대상** (`certbot delete` + vhost 제거)
- **죽은 구 IP 8건**: 실제 이전 대상. DNS 변경 시 다음 타이머 주기에 자동 갱신됨
- 가장 오래된 만료: `hongtong.kr` 2026-06-01

**정정 — 서비스 정체**
이 시스템은 일반 골프가 아니라 **파크골프(ParkGolf)** 전문 서비스다.
`frontend/app/layout.tsx:12` title = `ParkGolf AI Pro | 파크골프 전문가 AI 분석 서비스`

### [2026-08-26] 서비스 복구 실행 (완료 / 인증서 1건 잔여)

**실행 완료**
| # | 작업 | 결과 |
|---|------|------|
| 1 | `pm2 stop golf-backend` | 크래시 루프 정지 (누적 49,5xx회) |
| 2 | `docker start golf_mysql` | ✅ 기동. XA crash recovery 정상 완료, **데이터 무손실** |
| 3 | 데이터 검증 | centers 2 / users 5 / subjects 14 / swing 91 / posture 40, 14테이블 전부 정상, 한글 정상 |
| 4 | mysqldump 백업 | `~/backups/golf_swing_db_20260826_1629.sql` (891KB, 14테이블) |
| 5 | `docker update --restart unless-stopped golf_mysql` | ✅ **재발 방지** (기존 `no`) |
| 6 | `pm2 reset && start golf-backend` | ✅ 정상 기동, 재시작 0회, 전 라우트 매핑 |
| 7 | `backend/.env` REMO_API_URL | `http://` → **`https://api.remo.re.kr`** |
| 8 | `frontend/.env.local` | 미사용 `REMO_API_BASE_URL`(NXDOMAIN `api.rfremo.com`) + `REMO_API_KEY` 제거 |
| 9 | `frontend/next.config.mjs` | 구 IP `49.168.236.221`/`192.168.0.244` → **`49.169.8.19`/`192.168.219.44`** |
| 10 | `.gitignore` | `*_dump.sql`, `.omc/` 추가 → DB덤프 유출 위험 차단 (검증 완료) |
| 11 | **Route53 DNS** | `golf.remo.re.kr` A: `49.168.236.221` → **`49.169.8.19`** (change `C09956791BSPVRQG4ILXW`, INSYNC) |

**검증 결과**
- `:3306` / `:3003` / `:3000` 전부 LISTEN
- `/backend-api/subjects` → **500 → 401** (가드 정상 동작, 복구 신호)
- DNS: 권위NS·8.8.8.8·1.1.1.1 모두 `49.169.8.19` 응답
- nginx 경유 `/login` → 200, `http` → 301 → `https`
- 백엔드 에러 로그 0건 (기동 후)
- 편집 전 원본 백업: `~/backups/golf-config-20260826/`

**🔴 잔여 1건 — TLS 인증서 만료 (사용자 실행 필요)**
- `CN=golf.remo.re.kr` **notAfter=2026-08-05** → **21일 경과 만료**
- 원인: DNS가 죽은 구 IP를 가리켜 Let's Encrypt HTTP-01 챌린지 실패. 게다가 `certbot.timer` **inactive**
- 영향: DNS·서버·API 모두 복구됐으나 **브라우저가 인증서 경고를 표시**. TLS 검증 연결은 여전히 실패
- 조치 (sudo 필요, Claude 실행 불가):
  ```
  sudo certbot renew --cert-name golf.remo.re.kr --nginx
  sudo systemctl enable --now certbot.timer   # 자동갱신 재활성화
  ```
- ⚠️ 같은 서버의 다른 도메인 인증서도 동일하게 만료됐을 가능성 높음 → `sudo certbot certificates` 로 일괄 확인 권장

**미실행 (사용자 미선택)**
- PM2 `min_uptime`/`max_restarts` 폭주 방지, `pm2-logrotate` + 크래시 로그 954MB 정리
- GitHub Actions `SERVER_HOST` 갱신 + SSH 키 인증 전환 → **구 IP 향한 상태, push 시 위험**
- DNS 나머지 10건 (golf 1건만 승인됨)

**참고 — 테스트 계정 문서 오류**
`CLAUDE.md` 의 `instructor001@golf.com` 은 **DB에 없다.** 실제는 `instructor001` / `test@example.com`.
`Test1234!` 로 test/coach1/broj 모두 401 → 비밀번호도 불일치. 문서 갱신 필요.
마지막 로그인: broj 2026-06-01, instructor001 2026-05-21 / 마지막 스윙분석 2026-05-17

### [2026-08-26] 연동 검토: 서버 이전 후속작업 누락 (최상위 원인 규명)
- **문제**: `https://golf.remo.re.kr` 외부 접근 **응답 없음(000)**. 502조차 아님
- **원인**: 서버가 새 환경으로 이전되며 **공인 IP 변경**(`49.168.236.221` → `49.169.8.19`).
  DNS A 레코드가 갱신되지 않아 죽은 구 IP를 계속 가리킴.
  `*.remo.re.kr` **5개 도메인 전부** 동일 (golf / remo-data-bridge / remobodys / scoliosis / barrierfree)
  → 이 서버의 다른 프로젝트들도 외부 접근 불가 상태로 추정
- **검증 결과**:
  - REMO AI API 서버: 🟢 **정상** — `api.remo.re.kr` 80/443 OPEN, 엔드포인트 400/413 응답(생존)
  - GitHub 저장소: 🟢 정상 (원격·gh인증·동기화 OK)
  - GitHub Actions: 🟡 `SERVER_HOST` 등 secret 이 2026-01-13 이후 미갱신 → **구 서버 향함**.
    `SERVER_PASSWORD` 방식이라 IP 재할당 시 타 서버로 비밀번호 전송 위험 → **SSH 키 인증 전환 필요**
  - 로컬 인프라: 🟢 **준비 완료** — nginx active, 0.0.0.0:80/443 LISTEN,
    포트포워딩 제3자 검증 OPEN, `Host: golf.remo.re.kr` 로컬 요청 200, 인증서 존재
  - `api.rfremo.com` (frontend/.env.local): **NXDOMAIN**. 단 코드 사용처 없음 → 죽은 설정
  - `REMO_API_URL=http://` (평문) → 308 리다이렉트로 동작하나 API키·영상이 평문 첫 홉 노출
- **해결**: **미조치**. 1순위 = DNS A 레코드 5건 변경. 절차는 `docs/05-integration-status.md` §5
- **파일**: `docs/05-integration-status.md` 신규, `docs/README.md`·`02`·`04` 근본원인 계층 보정

### [2026-08-26] P0-1: 백엔드 크래시 루프 (서비스 전면 중단)
- **문제**: `golf-backend` PM2 프로세스가 49,368회 재시작 반복, 포트 3003 미개방, 모든 API 실패
- **원인**: `golf_mysql` 도커 컨테이너가 **2026-06-15 13:49 UTC 에 ExitCode 255 로 비정상 종료**.
  컨테이너 재시작 정책이 `no` 라 자동 복구되지 않음 → TypeORM 연결 실패(9회 재시도) →
  NestJS bootstrap 실패 → PM2 `autorestart:true` 가 즉시 재기동 → 무한 루프
- **해결**: **미조치 (분석·계획까지만 수행)**. 절차는 `docs/04-remediation-plan.md` §1 참조
  ```
  pm2 stop golf-backend
  docker start golf_mysql && docker logs -f --tail 50 golf_mysql
  docker update --restart unless-stopped golf_mysql   # 재발 방지
  pm2 reset golf-backend && pm2 start golf-backend
  ```
- **파일**: 코드 수정 없음 (인프라 장애). 빌드 산출물·소스 모두 정상 확인됨
- **2차 피해**: `backend/logs/` 에 크래시 로그 954MB 누적 (pm2-logrotate 미설정)

### [2026-08-26] 신규 발견 이슈 (미해결)
| ID | 제목 | 심각도 |
|----|------|--------|
| P0-1 | MySQL 부재로 백엔드 크래시 루프 | 🔴 치명 |
| P0-2 | Refresh Token 이 Access Token 으로 그대로 사용 가능 | 🔴 치명 |
| P0-3 | 미인증 이미지 서빙 엔드포인트 + 경로 탐색 미차단 | 🔴 치명 |
| P1-1 | nginx 25MB vs 백엔드 500MB — 영상 업로드 구조적 불가 | 🟠 높음 |
| P1-2 | 이메일 로그인 설계 결함 (가입 시 선택 + unique 아님) | 🟠 높음 |
| P1-3 | DB 마이그레이션 부재 — 프로덕션 스키마 변경 경로 없음 | 🟠 높음 |
| P1-4 | 테스트 0건 | 🟠 높음 |
| P1-5 | 500MB 영상 메모리 적재 + base64 → OOM | 🟠 높음 |
| P2-1~4 | REMO timeout 미설정 / dropSchema 잔존 / 로그 954MB / REMO 엔드포인트 불일치·평문 HTTP | 🟡 보통 |
| P3-1~3 | 문서 중복 / ignoreBuildErrors / axios devDeps 위치 | 🔵 낮음 |

> 상세: `docs/03-issue-analysis.md`

### [2026-08-26] Git 상태 검증 결과
- `main` == `origin/main` == `7e34b47` (ahead 0 / behind 0) — **완전 동기화**
- `.env` 커밋 이력 없음 (히스토리 전체 스캔) — 시크릿 위생 양호
- ⚠️ **`golf_swing_db_dump.sql`(265KB, bcrypt 해시·개인정보 포함)이 `.gitignore` 에 없음**
  → `git add .` 시 공개 저장소 유출 위험. 조치: `docs/04-remediation-plan.md` §3

---

### 2025-12-11

#### [완료] 프로젝트 상태 문서화
- **작업 내용**: 현재 코드 상황 파악 및 CURRENT_STATUS.md 업데이트
- **결과**:
  - 백엔드 100% 완료 (14 Entity, 13 Use Case, 5 Controller)
  - 프론트엔드 100% 완료 (Next.js 16, 15 페이지)
  - 통합 테스트 95% (9개 이슈 발견)

#### [완료] 작업 추적 시스템 구축
- **작업 내용**: .claude 폴더에 설정 및 작업 로그 시스템 구축
- **결과**: CLAUDE.md 규칙 파일 생성

---

## 미해결 이슈 (9개)

### Critical (1개)
| ID | 이슈 | 상태 |
|----|------|------|
| C-01 | 체형 분석 이미지 필드 부족 (0/3) | 미해결 |

### Major (4개)
| ID | 이슈 | 상태 |
|----|------|------|
| M-01 | 로그인 후 리다이렉트 실패 | 미해결 |
| M-02 | 회원 목록 렌더링 이슈 | 미해결 |
| M-03 | 스윙 타입 옵션 부족 | 미해결 |
| M-04 | 키 입력 필드 누락 | 미해결 |

### Minor (4개)
| ID | 이슈 | 상태 |
|----|------|------|
| m-01 | UI 요소 표시 문제 1 | 미해결 |
| m-02 | UI 요소 표시 문제 2 | 미해결 |
| m-03 | UI 요소 표시 문제 3 | 미해결 |
| m-04 | UI 요소 표시 문제 4 | 미해결 |

---

## 해결된 이슈 기록

### 템플릿
```
### [YYYY-MM-DD] 이슈 ID: 제목
- **문제**: 문제 설명
- **원인**: 근본 원인
- **해결**: 수정 내용
- **파일**: 수정된 파일 목록
```

---

## 다음 작업 예정

1. E2E 테스트 이슈 수정 (우선순위: Critical → Major → Minor)
2. REMO API 실제 분석 테스트
3. PDF 템플릿 완성
