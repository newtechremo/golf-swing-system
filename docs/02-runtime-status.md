# 02. Git 동기화 · 실행 상태 검증 보고서

**검증 시각**: 2026-08-26 15:1x KST
**검증 방법**: 실제 명령 실행 및 HTTP 프로브 (문서 기반 추정 아님)

---

## 요약

| 검증 항목 | 결과 |
|-----------|------|
| Git 원격 동기화 | ✅ **완전 동기화** (ahead 0 / behind 0) |
| 작업 트리 청결도 | 🟡 수정 1건 + 미추적 2건 (1건은 gitignore 누락) |
| Frontend 실행 | 🟡 **로컬만 정상** (외부 도달 불가) |
| Backend 실행 | ❌ **크래시 루프 (49,368회 재시작)** |
| MySQL 실행 | ❌ **중지 (2026-06-15 종료, 재시작 정책 `no`)** |
| 공개 도메인 서비스 | ❌ **외부 접근 자체 불가** ([05번 문서](./05-integration-status.md)) |

---

## 1. Git 상태 검증

### 1.1 브랜치 및 원격 동기화 — ✅ 동기화됨

```console
$ git remote -v
origin  https://github.com/newtechremo/golf-swing-system (fetch)
origin  https://github.com/newtechremo/golf-swing-system (push)

$ git fetch origin
ok fetched

$ git rev-list --left-right --count origin/main...main
0       0
```

| 항목 | 값 |
|------|-----|
| 현재 브랜치 | `main` |
| 로컬 HEAD | `7e34b47` |
| `origin/main` | `7e34b47` |
| **Ahead / Behind** | **0 / 0** |
| 로컬 브랜치 | `main` 단일 |
| 원격 브랜치 | `origin/main` 단일 |

**결론: 미푸시 커밋 없음, 미수신 커밋 없음, 브랜치 분기 없음. 완전 동기화 상태.**

### 1.2 커밋 이력

```
7e34b47  2026-01-15  fix: Limit login page height to image aspect ratio    ← HEAD
5df5b8d              Merge branch 'feature/controllers' into main
ca7c4d4              feat: Redesign login page with Figma design
8d302cd              fix: Update deploy workflow to use password authentication
546541c              feat: Add PM2 config and GitHub Actions deployment workflow
03edda1              feat: Add reverse proxy support for backend API
5a91ef4              chore: Disable debug logging and update favicon to golf theme
ba8f169              feat: Major frontend rebuild with Next.js 16 and security update
```

⚠️ **마지막 커밋이 2026-01-15 — 약 7개월간 코드 변경이 없다.**
개발이 중단된 상태로 판단된다.

`README_BRANCHING_STRATEGY.md` 는 `feature/* → develop → main` 전략을 기술하지만,
현재 원격에는 `main` 만 남아 있어 문서와 실제가 불일치한다.

### 1.3 작업 트리 상태 — 🟡 주의

```console
$ git status --short
 M frontend/next-env.d.ts
?? .omc/
?? golf_swing_db_dump.sql
```

| 파일 | 상태 | 평가 |
|------|------|------|
| `frontend/next-env.d.ts` | 수정됨 | **무해**. Next.js 가 자동 생성하는 파일로, `.next/dev/types/routes.d.ts` → `.next/types/routes.d.ts` 경로 1줄 변경. `next build` 실행 시 자동 갱신됨 |
| `.omc/` | 미추적 | 이번 세션의 도구 상태 디렉터리. `.gitignore` 추가 권장 |
| `golf_swing_db_dump.sql` | 미추적 | 🔴 **문제** — 아래 참조 |

#### 🔴 `golf_swing_db_dump.sql` — gitignore 미등록

```console
$ git check-ignore -v golf_swing_db_dump.sql
(출력 없음 → 무시되지 않음)
```

- 크기 **265KB**, 14개 테이블 전체 스키마 + `INSERT` 11건
- **bcrypt 패스워드 해시(`$2b$10$...`) 포함**
- 대상자(subject) 개인정보(이름/전화번호/생년월일/신체정보) 포함 가능

`.gitignore` 에는 `*.sqlite`, `*.db`, `*.csv` 는 있으나 `*.sql` 규칙이 없다.
오히려 `database-schema.sql`, `scripts/reset-database.sql` 은 의도적으로 추적 중이라
일괄 `*.sql` 무시도 부적절하다. → **해당 파일명만 명시적으로 무시해야 한다.**

`git add .` 한 번이면 실운영 데이터가 GitHub 공개 저장소로 올라간다.
→ 조치: [04번 문서 즉시조치 §3](./04-remediation-plan.md)

### 1.4 시크릿 노출 점검 — ✅ 이상 없음

```console
$ git ls-files | grep -iE '\.env|secret|credential|\.pem|\.key$'
(없음)

$ git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep -iE '\.env|secret|credential'
(없음)
```

**`.env` 파일이 현재도, 히스토리에도 커밋된 적 없음.** `.gitignore` 가 잘 관리되고 있다.

단, 추적 중인 `CLAUDE.md` 에 테스트 계정 자격증명(`instructor001@golf.com` / `Test1234!`)이
평문으로 기록되어 있다 — 테스트 계정이므로 즉시 위험은 아니나,
동일 비밀번호가 다른 계정에 재사용되지 않았는지 확인이 필요하다.

---

## 2. 실행 상태 검증

### 2.1 PM2 프로세스 목록

이 서버에는 여러 프로젝트가 함께 구동 중이다. 본 프로젝트 관련은 2개다.

| id | name | status | pid | uptime | **restarts** |
|----|------|--------|-----|--------|--------------|
| **0** | **golf-backend** | online* | 변동 | **21초** | **🔴 49,368** |
| **1** | **golf-frontend** | online | 295455 | 2일 | 2 |
| 3 | remo-data-bridge | online | 295467 | 2일 | 2 |
| 4~10 | espotec-*, wellaging-* | online | | 14일 | 0 |

\* `golf-backend` 의 `online` 은 **재시작 직후 순간의 상태**일 뿐이다.
uptime 이 계속 20초 내외로 초기화되며, 실제로는 부팅 → 실패 → 종료 → 재시작을 반복한다.

```console
$ pm2 describe golf-backend
 restarts     : 49368
 uptime       : 21s
 created at   : 2026-03-20T22:49:26.129Z
 script path  : .../backend/dist/main.js
 exec mode    : fork_mode
 node.js      : 24.13.0
 node env     : production
```

**누적 재시작 49,368회.**

> `created at` 2026-03-20 은 PM2 에 프로세스가 **처음 등록된** 시각이며,
> 크래시 시작 시점이 아니다. 아래 §2.4 · §3 의 타임라인 참조 —
> 실제 크래시는 **2026-06-15 MySQL 종료 이후** 시작됐다.

### 2.2 포트 리스닝 상태

```console
$ ss -tln | grep -E ':(3000|3003|3306)'
LISTEN  0  511  *:3000  *:*  users:(("next-server (v1",pid=295455))
```

| 포트 | 서비스 | 상태 |
|------|--------|------|
| 3000 | Next.js frontend | 🟢 **LISTEN** |
| 3003 | NestJS backend | 🔴 **미개방** |
| 3306 | MySQL | 🔴 **미개방** |

### 2.3 HTTP 프로브 (실측)

```console
$ curl -o /dev/null -w "%{http_code}" http://localhost:3000/
200                                          ← 프론트엔드 정상 (0.014s)

$ curl -o /dev/null -w "%{http_code}" http://localhost:3000/login
200                                          ← 로그인 페이지 정상

$ curl -o /dev/null -w "%{http_code}" http://localhost:3000/backend-api/subjects
500                                          ← Next rewrite → 백엔드 도달 실패

$ curl --max-time 5 http://localhost:3003/api
000  (Connection refused)                    ← 백엔드 직접 접속 불가

$ curl -k --max-time 5 https://localhost/
502                                          ← nginx 업스트림 오류 (로컬 프로브)
```

> ⚠️ **위 502 는 `localhost` 프로브 결과다. 실제 공개 도메인은 이보다 심각하다.**
> ```
> $ curl --max-time 10 https://golf.remo.re.kr/
> (응답 없음 — exit 28 timeout)
> ```
> 서버 이전으로 공인 IP가 바뀌었는데 DNS가 갱신되지 않아
> **외부 트래픽이 이 서버에 도달조차 하지 않는다.**
> 상세: [05-integration-status.md](./05-integration-status.md)

**판정: 프론트엔드는 페이지 렌더링까지만 정상. 로그인·데이터 조회 등 모든 기능은 동작 불가.**

### 2.4 데이터베이스 상태

```console
$ systemctl is-active mysql mariadb
inactive
inactive

$ docker ps -a | grep -i mysql
golf_mysql               mysql:8.0   Exited (255) 2 months ago   0.0.0.0:3306->3306/tcp
healthwings-local-db     mysql:8.0   Up 5 days (healthy)         0.0.0.0:13308->3306/tcp
espotec-local-db         mysql:8.0   Up 5 days (healthy)         0.0.0.0:13307->3306/tcp

$ docker inspect golf_mysql --format '{{.State.StartedAt}} {{.State.FinishedAt}} {{.State.ExitCode}}'
2026-01-05T00:28:19Z   2026-06-15T13:49:48Z   255

$ docker inspect golf_mysql --format '{{.HostConfig.RestartPolicy.Name}}'
no                                  ← 자동 재시작 정책 없음

$ docker inspect golf_mysql --format '{{range .Mounts}}{{.Source}}{{end}}'
/var/lib/docker/volumes/5b12b5c5.../\_data → /var/lib/mysql     ← 데이터 볼륨 보존됨
```

| 항목 | 값 |
|------|-----|
| 이미지 | `mysql:8.0` (8.0.44) |
| DB / 계정 | `golf_swing_db` / `golf_swing_user` — `backend/.env` 와 일치 ✅ |
| 포트 매핑 | `0.0.0.0:3306->3306` — `.env` 의 `DB_HOST=localhost:3306` 과 일치 ✅ |
| 가동 기간 | 2026-01-05 ~ **2026-06-15** (약 5.3개월 정상 가동) |
| 종료 | **2026-06-15 13:49 UTC, ExitCode 255** |
| 재시작 정책 | **`no`** ⚠️ |
| 데이터 볼륨 | named volume 존재 — **데이터 유실 없음으로 추정** |

- 호스트 MySQL 서비스: **미설치/비활성** (DB는 Docker 로만 제공)
- 같은 서버의 다른 프로젝트 MySQL 컨테이너들은 정상 가동 중 → **Docker 데몬 자체 문제 아님**
- MySQL 로그의 마지막 정상 활동은 `2026-05-23`, 그 이후 정상 종료(shutdown) 로그 없이
  ExitCode 255 로 끝났다 → **호스트 재부팅 또는 Docker 데몬 재시작 중 비정상 종료로 추정.**
  `restart: no` 정책 때문에 되살아나지 못했다.

---

## 3. 근본 원인 (Root Cause)

### 타임라인 (실측)

| 시각 | 사건 | 근거 |
|------|------|------|
| 2026-01-05 00:28 | `golf_mysql` 컨테이너 기동 | `docker inspect .State.StartedAt` |
| 2026-01-15 | 마지막 코드 커밋 `7e34b47` / 백엔드 마지막 빌드 | `git log`, `dist` mtime |
| 2026-03-20 22:49 | `golf-backend` PM2 등록 | `pm2 describe .created at` |
| 2026-05-23 09:52 | MySQL 마지막 정상 쿼리 활동 | `docker logs golf_mysql` |
| **2026-06-15 13:49** | **`golf_mysql` 비정상 종료 (exit 255)** — 서비스 장애 시작 | `.State.FinishedAt` |
| 2026-07-07 19:05 | 현재 크래시 로그 파일 기록 시작 | `head backend-error-0.log` |
| 2026-08-12 10:41 | PM2 데몬 재시작 (호스트 재부팅 추정) | `ps -o lstart` |
| **2026-08-26 (현재)** | 크래시 루프 지속 — 누적 49,368회 | `pm2 describe` |

**→ 시스템은 2026-06-15 까지는 정상 동작했다. 약 2.4개월째 장애 상태다.**
코드 문제가 아니라 인프라 문제임을 타임라인이 뒷받침한다.

### ⚠️ 상위 원인 — 서버 이전

아래 인과 사슬은 **백엔드 크래시 루프**의 원인이다. 그러나 그보다 상위에
**"서버가 새 환경으로 이전되며 공인 IP가 변경됐고 이후 실행 세팅이 수행되지 않았다"**
는 사실이 있다. 크래시 루프는 그 후속작업 누락 중 하나일 뿐이며,
**서비스 접근 불가의 직접 원인은 DNS 미갱신**이다.
→ [05-integration-status.md](./05-integration-status.md) 참조

### 인과 사슬 (백엔드 크래시)

```
① golf_mysql 컨테이너 비정상 종료 (2026-06-15, exit 255)
   + RestartPolicy=no → 자동 복구 안 됨
   ※ 서버 이전 후 아무도 재기동하지 않음
        ↓
② backend/.env 의 DB_HOST=localhost:3306 연결 불가
        ↓
③ TypeORM 이 9회 재시도 후 포기
   "Unable to connect to the database. Retrying (1..9)..."
   "Error: connect ECONNREFUSED 127.0.0.1:3306"
        ↓
④ NestJS ExceptionHandler → bootstrap 실패 → 프로세스 종료
        ↓
⑤ PM2 autorestart:true → 즉시 재시작 → ①로 회귀 (무한 루프)
```

### 실제 에러 로그 (`backend/logs/backend-error-0.log`)

```
2026-08-26 15:16:14 [Nest] ERROR [TypeOrmModule] Unable to connect to the database. Retrying (6)...
Error: connect ECONNREFUSED 127.0.0.1:3306
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
...
2026-08-26 15:16:23 [Nest] ERROR [ExceptionHandler] connect ECONNREFUSED 127.0.0.1:3306
```

동일 패턴이 로그 전체에 반복된다.

### 🔴 2차 피해 — 로그 파일 폭증

```console
$ ls -la backend/logs/
backend-error-0.log   587.8M
backend-out-0.log     366.4M
backend-error-7.log     5.0M
backend-out-7.log       1.6M
```

**크래시 로그만 약 954MB 누적** (에러 로그는 약 520만 줄).
현재 크래시 로그 파일은 2026-07-07 기록 시작 → 약 50일 만에 588MB 가 쌓였다.
디스크 여유는 460GB(49% 사용)로 당장 위험하진 않으나 계속 증가 중이며,
`pm2-logrotate` 가 설치되어 있지 않다.

부수적으로 이 크래시 루프는 2.4개월간 **CPU·메모리·디스크 I/O 를 지속 소모**하며,
같은 서버에서 구동 중인 다른 8개 프로젝트(espotec, wellaging, remo-data-bridge 등)와
자원을 경합한다.

---

## 4. 빌드 산출물 상태

| 항목 | 값 | 평가 |
|------|-----|------|
| 최신 소스 (`backend/src`) | 2026-01-05 (`jwt-auth.guard.ts`) | |
| 최신 빌드 (`backend/dist`) | 2026-01-15 | ✅ 소스보다 최신 — 빌드 최신 상태 |
| `frontend/.next/BUILD_ID` | `YWA5AB2PXeMs9myoBCzJl` | ✅ 존재 |
| Node.js | v24.13.0 | ⚠️ `@types/node` 는 `^20` — 버전 간극 |
| npm / pnpm | 11.6.2 / 9.15.9 | |

**빌드 산출물은 정상이며 재빌드 없이 기동 가능하다.**
즉, 이 장애는 **코드 문제가 아니라 순수한 인프라(DB) 문제**다.

---

## 5. 최종 판정

### Git — ✅ 정상
원격과 완전 동기화되어 있고, 시크릿 유출 이력도 없다.
단 `golf_swing_db_dump.sql` 의 gitignore 누락은 즉시 조치가 필요하다.

### 실행 — ❌ 서비스 불가
`https://golf.remo.re.kr` 은 **응답 자체가 없다.** DNS가 죽은 구 IP를 가리키기 때문이다.
DNS를 고쳐 트래픽이 도달하더라도, MySQL이 없어 로그인부터 실패한다.

**두 가지를 모두 조치해야 서비스가 복구된다:**
1. **DNS A 레코드를 `49.169.8.19` 로 변경** (최우선)
2. **`golf_mysql` 컨테이너 기동** + 재시작 정책 부여

다행히 서버 쪽 준비는 끝나 있다 — nginx·포트포워딩·인증서·빌드 산출물 모두 정상이다.
절차: [05-integration-status.md §5](./05-integration-status.md) 및
[04-remediation-plan.md](./04-remediation-plan.md)
