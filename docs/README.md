# 프로젝트 분석 문서 (docs)

**작성일**: 2026-08-26
**대상 커밋**: `7e34b47` (main, origin/main 과 동일)
**분석 범위**: 코드 구성 / 시스템 구성 / 실행 상태 / 문제점

---

## 문서 목록

| 문서 | 내용 |
|------|------|
| [01-system-overview.md](./01-system-overview.md) | 이 시스템이 무엇인지 — 도메인, 아키텍처, 데이터 모델, API 표면, 외부 연동 |
| [02-runtime-status.md](./02-runtime-status.md) | **Git 동기화 상태 / 현재 실행 상태 검증 결과** (근거 명령어·출력 포함) |
| [03-issue-analysis.md](./03-issue-analysis.md) | 문제 분석 — 심각도별 15건 (P0 3건 / P1 5건 / P2 4건 / P3 3건) |
| [04-remediation-plan.md](./04-remediation-plan.md) | 복구 런북 및 수정 계획 (즉시 조치 → 단기 → 중기) |
| [05-integration-status.md](./05-integration-status.md) | **연동 검토** — GitHub / REMO AI API / 포트 / 서버 구조 (서버 이전 후속작업 누락 분석) |
| [06-execution-plan.md](./06-execution-plan.md) | 실행 플랜 상세 — Phase 0~6 작업 지시서 (파일:라인 단위 diff · 검증 · 롤백). **07번이 순서·범위를 재조정했으므로 diff 참조용으로 사용** |
| [07-deployment-architecture.md](./07-deployment-architecture.md) | 배포 아키텍처 판정 — Vercel 이전 가능성, 30~60초 문제, 백엔드 필요성, DB 진단 (**판단 근거**) |
| [08-detailed-work-plan.md](./08-detailed-work-plan.md) | ⭐ **실행 기준 문서 (확정본)** — 전략: 프론트만 Vercel · 백엔드+DB 서버 유지. 작업 ID 22개 · 체크리스트 · 위험요소 |

---

## 한 줄 요약

> 골프 스윙 + 체형(자세) AI 분석 SaaS. NestJS(Clean Architecture) + Next.js 16 + MySQL,
> 실제 분석은 외부 **REMO API** 에 위임하는 오케스트레이션 백엔드.
> **Git 은 원격과 완전 동기화 상태이나, 서비스는 외부에서 접근 자체가 불가능하다.**
> 서버 이전 후 DNS가 죽은 구 IP를 가리키고 있고, DB 컨테이너도 기동되지 않아
> 백엔드는 49,000회 이상 크래시 재시작 중이다.

---

## 결론 요약 (TL;DR)

### Git 상태 — 동기화됨 ✅
- `main` == `origin/main` == `7e34b47` (ahead 0 / behind 0)
- 미푸시 커밋 없음, 브랜치 분기 없음
- 단, 미추적 파일 `golf_swing_db_dump.sql`(265KB, bcrypt 해시·개인정보 포함)이 **.gitignore 에 없음** → 실수 커밋 위험
- 마지막 커밋 2026-01-15 → 약 7개월간 변경 없음

### 실행 상태 — 부분 장애 ❌
| 구성요소 | 상태 | 근거 |
|----------|------|------|
| Frontend (3000) | 🟡 로컬만 정상 | `GET /` → 200 (단, 외부에서 도달 불가) |
| Backend (3003) | 🔴 **크래시 루프** | pm2 restarts **49,368회**, uptime 21초, 포트 미개방 |
| MySQL (3306) | 🔴 **중지** | `golf_mysql` 컨테이너 **2026-06-15 `Exited (255)`**, 재시작 정책 `no` |
| nginx (로컬) | 🟢 정상 | `Host: golf.remo.re.kr` 로컬 요청 → 200 |
| **`https://golf.remo.re.kr`** | 🔴 **응답 없음(000)** | DNS가 죽은 구 IP를 가리킴 — 502조차 아님 |

**최상위 원인**: **서버가 새 환경으로 이전되며 공인 IP가 바뀌었는데
(`49.168.236.221` → `49.169.8.19`), 이후 실행 세팅이 하나도 수행되지 않았다.**

```
서버 이전 + IP 변경 (2026년 중반)
   ├─ ① DNS A 레코드 미갱신  → 5개 도메인이 죽은 구 IP를 가리킴 → 외부 접근 전면 불가 🔴
   ├─ ② golf_mysql 컨테이너 미기동 → 백엔드 크래시 루프 49,368회 🔴
   ├─ ③ GitHub Actions SERVER_HOST 미갱신 → 배포 파이프라인 무효 🟠
   └─ ④ next.config.mjs 에 구 IP 박제 잔존 🟡
```

**중요**: 코드도, 서버도, AI API도 멀쩡하다. nginx·포트포워딩·인증서·빌드 산출물 모두 준비 완료
상태다. **"이사 후 주소 이전 신고를 안 한 것"** 이 본질이다.
→ [05-integration-status.md](./05-integration-status.md) 및
[04-remediation-plan.md](./04-remediation-plan.md) 참조.

### 연동 현황 — AI API는 정상, 배포 파이프라인은 무효
| 대상 | 판정 |
|------|------|
| GitHub 저장소 연결 | 🟢 정상 (원격·인증·동기화 모두 OK) |
| GitHub Actions 배포 | 🟡 **구 서버를 향함** — `SERVER_HOST` 2026-01-13 이후 미갱신 |
| **REMO AI API 서버** | 🟢 **정상 작동** — 80/443 OPEN, 엔드포인트 응답 확인 |
| REMO 연동 설정 | 🟠 백엔드가 평문 `http://` 로 호출 / 프론트 `api.rfremo.com` 은 NXDOMAIN(미사용) |
| 로컬 인프라 (nginx·NAT·인증서) | 🟢 **준비 완료 — DNS만 바꾸면 즉시 서비스** |

### 코드 품질 — 구조는 양호, 운영·보안 공백
- Clean Architecture 계층 분리가 실제로 지켜짐 (presentation → application → infrastructure)
- 소유권 검증(IDOR 방어)이 16개 지점에 일관되게 적용됨 — **잘 된 부분**
- 반면 **테스트 0건**, **DB 마이그레이션 0건**, 인증 토큰 설계 결함, 미인증 파일 서빙 경로 존재

---

## 이 문서들을 읽는 순서

1. **지금부터 무엇을 할지 알고 싶다** → **08** (실행 기준) → 판단근거는 07, 추가 diff 는 06
2. 서버 이전 후속작업이 무엇이 남았는지 → **05**
3. 시스템을 처음 인수인계 받았다 → **01 → 02 → 05 → 03 → 06**
4. 왜 이 작업이 필요한지 근거가 궁금하다 → **03** (문제) → **06** (해법)

> ✅ **2026-08-26 골프 서비스 복구 완료.** DNS·MySQL·백엔드·인증서·외부접속 검증됨.
> 이후 작업은 [06-execution-plan.md](./06-execution-plan.md) 를 따른다.

> ⚠️ **1순위는 DNS A 레코드 변경이다.** 서버·코드·AI API가 모두 정상이어도
> DNS가 죽은 IP를 가리키는 한 사용자는 서비스에 도달할 수 없다.
