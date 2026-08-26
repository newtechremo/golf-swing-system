# ParkGolf AI Pro — 프로젝트 현재 상태

**최종 업데이트**: 2026-08-26
**브랜치**: `main` (origin 과 동기화, ahead 0 / behind 0)
**최신 커밋**: `24b45cc`
**서비스 상태**: 🟢 **정상 운영 중**

> 상세 분석·계획 문서는 [`docs/`](./docs/) 참조. 작업 이력은 [`.claude/WORK_LOG.md`](./.claude/WORK_LOG.md).

---

## 1. 서비스 개요

**파크골프 전문가 AI 분석 서비스.** 강사가 담당 대상자(회원)의 파크골프 스윙 영상과
체형 사진을 업로드하면 외부 **REMO API** 가 AI 분석을 수행하고, 시스템이 결과를
정규화 저장·시각화한다.

이 백엔드는 AI 분석을 직접 수행하지 않는다. REMO 에 위임하고 결과를 받아
관계형 스키마에 영속화하는 **오케스트레이션 + 저장 계층**이다.
시스템의 가치는 알고리즘이 아니라 **멀티테넌시(센터 → 강사 → 대상자)와 이력 관리**에 있다.

```
Center (센터)
  └── User (강사)      ← 로그인 주체
        └── Subject (대상자)
              ├── GolfSwingAnalysis   (스윙 분석)
              └── BodyPostureAnalysis (체형 분석)
```

---

## 2. 접속 정보

| 대상 | URL | 호스팅 |
|------|-----|--------|
| **서비스** | https://golf.remo.re.kr | **Vercel** (CNAME) |
| **백엔드 API** | https://api-golf.remo.re.kr/api | 자체 서버 `49.169.8.19` |
| 대체 URL | https://parkgolf-ai-pro.vercel.app | Vercel |
| 헬스체크 | https://api-golf.remo.re.kr/api/health | |

### 테스트 계정
```
Email    : test@example.com     # username 은 instructor001
Password : Test1234!
```
> 이전 문서의 `instructor001@golf.com` 은 DB 에 존재하지 않는 값이었다 (2026-08-26 정정).

### 로컬 개발 포트 (고정)
| 서버 | 포트 |
|------|------|
| Backend (NestJS) | 3003 |
| Frontend (Next.js) | 3000 |
| MySQL (Docker `golf_mysql`) | 3306 |

---

## 3. 아키텍처

**프론트만 Vercel · 백엔드 + DB 는 자체 서버 유지**

```
                    ┌──────────────────────────────┐
   브라우저 ────────>│ Vercel (정적 SPA)             │
        │           │ golf.remo.re.kr → CNAME       │
        │           │ git push → 자동배포 (~15초)    │
        │           └──────────────────────────────┘
        │
        │  API 는 Vercel 을 거치지 않고 직접 호출
        │  → Vercel 함수 타임아웃/바디제한 적용 대상 아님
        ▼
   ┌───────────────────────────────────────────────────┐
   │ api-golf.remo.re.kr  (49.169.8.19)                 │
   │   nginx  client_max_body_size 100m / timeout 300s  │
   │     ↓                                              │
   │   NestJS :3003 (PM2 golf-backend)                  │
   │     ├─> MySQL :3306   (Docker, 4.38MB / 14 테이블)  │
   │     ├─> 로컬 results/ (결과 이미지)                  │
   │     ├─> REMO API      (분석 엔진)                   │
   │     └─> AWS S3        (원본 영상, sppb-private)      │
   └───────────────────────────────────────────────────┘
```

### 백엔드를 서버리스로 옮길 수 없는 이유
로컬 파일 저장(`results/`), `@Cron` 스케줄러, **REMO API 키 보관**(프론트에 두면
브라우저에 노출 — 크레딧 과금 API 라 금전 피해), MySQL 커넥션.

### ⚠️ 유일한 함정
`next.config.mjs` 의 `rewrites()` 를 **프로덕션 경로로 쓰면 안 된다.**
쓰는 순간 요청이 Vercel 엣지를 경유해 함수 제한에 걸린다.
로컬 개발 전용으로 격리되어 있으며, 프로덕션은
`NEXT_PUBLIC_API_BASE_URL=https://api-golf.remo.re.kr/api` 절대 URL 을 쓴다.

---

## 4. 기술 스택

### Backend
| 구분 | 기술 |
|------|------|
| Framework | NestJS 10.4 |
| ORM / DB | TypeORM 0.3.19 / MySQL 8.0.44 |
| 인증 | JWT (access 1h / refresh 7d, `type` 클레임 분리) + bcrypt |
| 저장소 | AWS S3 (영상) + 로컬 파일시스템 (결과 이미지) |
| 이미지 | sharp 0.34 |
| 스케줄러 | @nestjs/schedule (일일 파일 정리) |
| Runtime | Node.js v24.13.0 |

### Frontend
| 구분 | 기술 |
|------|------|
| Framework | Next.js 16.0.10 (App Router) |
| UI | React 19.2 + Radix UI + Tailwind CSS 4.1 |
| HTTP | axios 1.13 |
| 배포 | Vercel (`remo-dev/parkgolf-ai-pro`) |

> **14개 페이지 전부 `'use client'` 인 순수 SPA.** API Route·Server Action·Node 전용 API 0건.
> 패키지 매니저는 **npm 으로 통일** (`package-lock.json` 추적 중).

---

## 5. 운영 현황 (2026-08-26 실측)

| 항목 | 상태 |
|------|------|
| `golf.remo.re.kr` | 🟢 200 (Vercel) |
| `api-golf.remo.re.kr/api/health` | 🟢 200 `{"status":"ok","db":"up"}` |
| PM2 `golf-backend` | 🟢 online |
| PM2 `golf-frontend` | 🟢 online (**롤백 창구 — 2026-09-09 까지 유지**) |
| MySQL `golf_mysql` | 🟢 running / `restart=unless-stopped` |
| TLS (양 도메인) | 🟢 Let's Encrypt ~2026-11-24 |

### 데이터
```
강사 5 · 대상자 14 · 스윙분석 completed 72 / failed 17 / processing 2 · 체형분석 40
```

### 배포 방식
| 대상 | 방식 |
|------|------|
| 프론트엔드 | `git push origin main` → **Vercel 자동배포 (~15초)** |
| 백엔드 | 서버에서 `npm run build && pm2 restart golf-backend` |

> 외부 SSH(22) 가 열려 있지 않아 GitHub Actions SSH 배포는 동작하지 않는다.
> 서버에 직접 접근 가능하므로 SSH 를 인터넷에 열 이유도 없다.

---

## 6. 2026-08-26 작업 요약

### 배경 — 2.4개월 서비스 중단
서버가 새 환경으로 이전되며 공인 IP 가 `49.168.236.221` → `49.169.8.19` 로
바뀌었으나 후속 세팅이 수행되지 않았다. 2026-06-15 부터 약 2.4개월간 서비스 중단.

### 복구
| 문제 | 조치 |
|------|------|
| DNS 가 죽은 구 IP 를 가리킴 | Route53 A 레코드 갱신 → 이후 Vercel CNAME 전환 |
| MySQL 컨테이너 미기동 (49,368회 크래시) | 기동 + `restart=unless-stopped` |
| TLS 인증서 만료 (2026-08-05) | 갱신 (~2026-11-24) |
| 크래시 로그 962MB | 6.7MB 로 정리 + `pm2-logrotate` |
| 테스트 계정 문서 오류 | 복구 + 문서 정정 |

### 안정성·기능 개선
| 항목 | 내용 |
|------|------|
| 분석 요청 비동기화 | REMO 호출을 fire-and-forget 으로. 업로드 응답이 REMO 접수 대기에 묶이지 않는다 |
| REMO 실패 반영 | 520(분석 실패)을 `failed` 로 기록. 기존에는 `processing` 으로 영구 잔류해 사용자가 몇 달째 "분석 중" 화면을 봤다 |
| 영상 상한 정합 | 500MB → **100MB** (nginx `client_max_body_size` 와 일치) |
| REMO timeout | 미설정 → **180초** + 지수 백오프 |
| 체형분석 uuid 저장 | `null` 하드코딩되어 재조회가 불가능했던 것 수정 |
| `history` 400 | 전역 `ValidationPipe` 의 `transform:true` 가 `+undefined` → `NaN` 으로 바꿔 이력 화면이 아예 뜨지 않았다 |
| 비밀번호 변경 | 엔드포인트 부재(404) → 구현. 프론트 `await` 누락도 수정 |
| 재시도 UI | 분석 실패 시 막다른 화면 → 상태별 버튼 분기 |
| 부분 실패 허용 | 체형분석 `Promise.all` → `allSettled` |

### 보안
| 항목 | 이전 | 이후 |
|------|------|------|
| Refresh Token 오용 | refreshToken 으로 보호 API 호출 **200** | **401** |
| 이미지 엔드포인트 | 미인증 조회 가능 | 401 / 타인소유 403 |
| 경로 탐색 | `../.env` 노출 가능 | 403 |
| CORS | `origin: true` (전체 허용) | `CORS_ORIGINS` 화이트리스트 |
| `dropSchema` | 환경변수 하나로 전체 삭제 가능 | 제거 |

### PM2 크래시 방지
`min_uptime 10s` / `max_restarts 15` / `restart_delay 5s` 추가.
DB 장애 시 49,368회 재시작·로그 954MB 폭주가 재발하지 않는다.

---

## 7. 알려진 이슈 / 남은 작업

### 판단 필요
| 항목 | 내용 |
|------|------|
| **puppeteer 제거** | `PdfGenerationService` 가 `app.module.ts` 등록 외 **사용처 0건**. `node_modules` 13MB + **Chromium 캐시 563MB**. PDF 리포트 계획이 없으면 제거 대상 |

### 미착수
| 항목 | 사유 |
|------|------|
| DB 마이그레이션 도입 | 프로덕션은 `synchronize:false` 인데 마이그레이션 0건 → **스키마 변경 경로가 없다.** 스키마 변경이 필요해지는 시점이 착수 트리거 |
| 테스트 코드 | 현재 0건. Clean Architecture 로 목 주입이 쉬운 구조인데 활용하지 못하고 있다 |
| 외부 모니터링 | 2.4개월 중단을 아무도 몰랐다. `/api/health` 는 준비됐으나 감시 주체가 없다 |
| `pending` 유실 복구 | 백그라운드 REMO 요청 중 프로세스 재시작 시 `pending` 잔류. UI 재시도 버튼으로 갈음 중 |

### ⚠️ 2026-09-09 까지 유지할 것
**PM2 `golf-frontend` 와 nginx `golf.remo.re.kr` vhost 를 삭제하지 말 것.**
Vercel 전환 롤백 창구다. 문제 시 A 레코드 복귀로 5분 내 복구 가능하며,
그러려면 받아줄 서버가 살아 있어야 한다. 롤백 명령은 `.claude/WORK_LOG.md` 에 기록.

### 이전 미해결 이슈 9건 (C-01, M-01~04, m-01~04)
`CLAUDE.md` §6 에 기록된 항목들은 **2025-12-11 기준**이다.
백엔드가 2026-06-15 ~ 08-26 동안 중단되어 있었으므로 **현재도 유효한지 E2E 재현으로 재판정이 필요**하다.

> 참고: **체형분석 좌측면·후면 실패는 버그가 아니었다.** REMO API 를 실제 이미지로
> 직접 호출한 결과 3방향 모두 정상(`state:True` + uuid 반환)이며, DB 의 해당 컬럼은
> 빈 문자열이었다 — 즉 **업로드되지 않았던 것**이다. 4방향 전부 업로드하는 테스트에서
> 모두 `completed` 확인. C-01 재판정 시 이 점을 참고할 것.

---

## 8. 디렉터리 구조

```
golf-swing-system/
├── CLAUDE.md              작업 규칙 (테스트 계정·포트 등)
├── CURRENT_STATUS.md      이 문서
├── .claude/WORK_LOG.md    작업 이력 (상세)
├── docs/                  분석·계획 문서 8종
│   ├── 01-system-overview.md       시스템 개요
│   ├── 02-runtime-status.md        런타임 검증
│   ├── 03-issue-analysis.md        문제 분석 15건
│   ├── 04-remediation-plan.md      복구 런북
│   ├── 05-integration-status.md    연동 검토 (GitHub/REMO/DNS)
│   ├── 06-execution-plan.md        실행 플랜 상세
│   ├── 07-deployment-architecture.md  배포 아키텍처 판정
│   └── 08-detailed-work-plan.md    상세 작업 플랜
├── deploy/
│   ├── api-golf.remo.re.kr.nginx   nginx vhost
│   └── setup-api-golf.sh           vhost 배치 + 인증서 발급
├── backend/               NestJS (Clean Architecture)
│   └── src/
│       ├── presentation/  controllers(6) · guards
│       ├── application/   use-cases(17) · dto · interfaces
│       └── infrastructure/ entities(14) · repositories(4) · external-services
└── frontend/              Next.js 16 (14 페이지, 전부 client)
```

---

## 9. 실행 명령어

### 백엔드
```bash
cd backend
npm run build && pm2 restart golf-backend
# 로컬 개발
npm run start:dev
```

### 프론트엔드
```bash
cd frontend
npm run dev          # 로컬 (rewrites 로 :3003 프록시)
# 배포는 git push origin main → Vercel 자동
```

### 상태 확인
```bash
curl -s https://api-golf.remo.re.kr/api/health
pm2 list
docker ps | grep golf_mysql
```

### DB 접속
```bash
docker exec -it golf_mysql mysql -ugolf_swing_user -p golf_swing_db
```
