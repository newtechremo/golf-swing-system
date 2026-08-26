# 04. 복구 런북 및 수정 계획

**작성일**: 2026-08-26
**전제**: [02-runtime-status.md](./02-runtime-status.md), [03-issue-analysis.md](./03-issue-analysis.md) 의 진단 결과

> ⚠️ 이 문서의 명령은 **아직 실행되지 않았다.** 분석·계획 단계까지만 수행했으며,
> 실제 조치는 담당자 판단으로 진행한다. 특히 §1 은 프로덕션 서비스에 영향을 준다.

---

# 즉시 조치 — 서비스 복구

> 🔴 **선결 조건: DNS A 레코드 변경**
> 아래 §1 을 완료해도 **외부 사용자는 여전히 서비스에 접근할 수 없다.**
> 서버 이전으로 공인 IP가 `49.168.236.221` → `49.169.8.19` 로 바뀌었는데
> DNS가 갱신되지 않았기 때문이다. **DNS 변경이 진짜 1순위다.**
> → [05-integration-status.md §5](./05-integration-status.md)
>
> ```
> golf.remo.re.kr  A  49.168.236.221  →  49.169.8.19
> ```
> (`remo-data-bridge` / `remobodys` / `scoliosis` / `barrierfree` 도 동일)

목표: 크래시 루프 중단 + API 정상화 (예상 15분).
**코드 수정 없이 인프라 조작만으로 가능하다.**

## §1. 크래시 루프 정지 → DB 기동 → 백엔드 재기동

### 1-1. 먼저 크래시 루프를 멈춘다
DB 를 살리기 전에 백엔드를 멈춰야 로그가 더 쌓이지 않고, 기동 순서도 통제된다.

```bash
pm2 stop golf-backend
```

### 1-2. 백업 — DB 볼륨은 보존되어 있으나 확인 후 진행
`golf_mysql` 의 named volume 은 살아 있다(`docker inspect` 확인).
그래도 기동 전 볼륨 스냅샷을 남긴다.

```bash
# 볼륨 경로: /var/lib/docker/volumes/5b12b5c5.../\_data
sudo tar czf ~/golf_mysql_volume_$(date +%Y%m%d).tar.gz \
  -C /var/lib/docker/volumes/5b12b5c5de472b73422f9de7d66af14c72acfeb4f25443359a7817de39608679 _data
```

### 1-3. MySQL 컨테이너 기동
```bash
docker start golf_mysql

# 기동 로그 확인 — exit 255 의 원인이 디스크/권한/데이터 손상이면 여기서 드러난다
docker logs -f --tail 50 golf_mysql
```

**정상 신호**: `/usr/sbin/mysqld: ready for connections. ... port: 3306`

**만약 다시 실패하면** — 이때는 데이터 손상 가능성이 있으므로 아래로 진행하지 말고
`golf_swing_db_dump.sql`(2026년 시점 덤프)로의 복원 검토가 필요하다.

### 1-4. 연결 확인
```bash
ss -tln | grep 3306                            # LISTEN 확인
docker exec golf_mysql mysqladmin ping -u root -p   # mysqld is alive
```

### 1-5. 재시작 정책 부여 — **재발 방지의 핵심**
`RestartPolicy=no` 였던 것이 이번 장애의 직접 원인이다.

```bash
docker update --restart unless-stopped golf_mysql
docker inspect golf_mysql --format '{{.HostConfig.RestartPolicy.Name}}'   # unless-stopped
```

### 1-6. 백엔드 재기동
```bash
pm2 reset golf-backend      # 49,368 카운터 초기화
pm2 start golf-backend
pm2 logs golf-backend --lines 30
```

**정상 신호**: `🚀 Application is running on: http://localhost:3003/api`

### 1-7. 검증
```bash
ss -tln | grep 3003
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/backend-api/subjects   # 401 기대(인증필요) — 500 이 아니면 성공
curl -k -o /dev/null -w "%{http_code}\n" https://golf.remo.re.kr/                  # 200
```

> `401` 이 나오면 정상이다. 가드가 동작한다는 뜻이므로 500 → 401 전환이 복구 신호다.

---

## §2. 크래시 루프 재발 시 폭주 차단

`ecosystem.config.js` 의 `golf-backend` 항목에 추가한다.
이렇게 하면 DB 가 다시 죽어도 **PM2 가 15회 시도 후 포기**하고 `errored` 상태로 멈춘다.
로그 954MB 같은 2차 피해가 재발하지 않으며, `pm2 list` 에서 장애를 즉시 식별할 수 있다.

```js
{
  name: 'golf-backend',
  // ... 기존 설정 유지 ...
  min_uptime: 10000,        // 10초 이상 살아야 "정상 기동" 으로 인정
  max_restarts: 15,         // 연속 실패 15회 → 포기 (errored 상태로 정지)
  restart_delay: 5000,      // 재시작 간 5초 대기
}
```

적용:
```bash
pm2 reload ecosystem.config.js --env production && pm2 save
```

---

## §3. `golf_swing_db_dump.sql` Git 유출 차단 — **가장 급한 1분 작업**

이 파일은 **bcrypt 해시와 대상자 개인정보를 담고 있으면서 `.gitignore` 에 없다.**
`git add .` 한 번이면 공개 저장소로 올라간다.

`.gitignore` 말미에 추가:
```gitignore
# Database dumps (실데이터 — 절대 커밋 금지)
golf_swing_db_dump.sql
*_db_dump.sql
*_dump.sql

# OMC 도구 상태
.omc/
```

> `*.sql` 일괄 무시는 안 된다 — `database-schema.sql` 과
> `scripts/reset-database.sql` 은 의도적으로 추적 중인 스키마 정의 파일이다.

검증:
```bash
git check-ignore -v golf_swing_db_dump.sql   # 규칙에 매칭되면 성공
git status --short                            # ?? 목록에서 사라져야 함
```

추가로 덤프 파일 자체를 저장소 밖으로 옮기는 것을 권한다:
```bash
mv golf_swing_db_dump.sql ~/backups/
```

---

# 단기 (1~2주) — 보안 결함 수정

## §4. P0-2 · Refresh Token 분리

**파일**: `LoginUserUseCase.ts`, `RefreshTokenUseCase.ts`, `jwt-auth.guard.ts`

```ts
// LoginUserUseCase.ts — type 클레임 추가
private generateTokens(userId: number) {
  const base = { sub: userId, role: 'instructor' };
  return {
    accessToken:  this.jwtService.sign({ ...base, type: 'access'  }, { expiresIn: '1h' }),
    refreshToken: this.jwtService.sign({ ...base, type: 'refresh' }, { expiresIn: '7d' }),
  };
}
```

```ts
// jwt-auth.guard.ts — access 토큰만 허용
const payload = this.jwtService.verify(token);
if (payload.type !== 'access') {
  throw new UnauthorizedException('유효하지 않은 토큰입니다.');
}
request.user = payload;
```

```ts
// RefreshTokenUseCase.ts — refresh 토큰만 허용
const payload = this.jwtService.verify(refreshToken);
if (payload.type !== 'refresh') {
  throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
}
const newAccessToken = this.jwtService.sign(
  { sub: payload.sub, role: payload.role, type: 'access' },
  { expiresIn: '1h' },
);
```

> ⚠️ **배포 시 기존 토큰이 모두 무효화된다** (`type` 클레임이 없으므로).
> 전 사용자 재로그인이 필요하다. 이용자 공지 후 배포하거나,
> 전환 기간 동안 `payload.type === undefined` 를 access 로 허용하는
> 하위호환 코드를 넣고 1주 뒤 제거하는 방식을 권한다.

**후속 (선택)**: refresh 전용 시크릿(`JWT_REFRESH_SECRET`) 분리,
refresh 토큰 DB 저장 + 회전(rotation) + 로그아웃 시 폐기.

## §5. P0-3 · 이미지 엔드포인트 봉쇄

**5-1. 가드 추가** — `body-posture.controller.ts:429`
```ts
@Get('images/*')
@UseGuards(JwtAuthGuard)      // ← 추가
async getImage(...)
```

**5-2. 경로 탐색 차단** — `local-storage.service.ts:223`
```ts
async getFile(relativePath: string) {
  try {
    const isResult = /^results[\/\\]/.test(relativePath);
    const base     = isResult ? this.resultsDir : this.uploadDir;
    const rel      = isResult ? relativePath.replace(/^results[\/\\]/, '') : relativePath;

    const absolutePath = path.resolve(base, rel);
    const baseResolved = path.resolve(base);

    // baseDir 밖으로 나가는 경로 차단
    if (absolutePath !== baseResolved &&
        !absolutePath.startsWith(baseResolved + path.sep)) {
      this.logger.warn(`Path traversal blocked: ${relativePath}`);
      return null;
    }

    if (!fs.existsSync(absolutePath)) return null;

    const ext = path.extname(absolutePath).toLowerCase();
    const mimeTypes: Record<string, string> = { /* 기존과 동일 */ };

    // 화이트리스트: 등록되지 않은 확장자는 거부 (폴백 제거)
    if (!mimeTypes[ext]) {
      this.logger.warn(`Disallowed file type requested: ${ext}`);
      return null;
    }

    return { buffer: await fs.promises.readFile(absolutePath), mimeType: mimeTypes[ext] };
  } catch (error) {
    this.logger.error(`Failed to read file ${relativePath}: ${error.message}`);
    return null;
  }
}
```

**5-3. 소유권 검증 추가** — 현 상태로는 로그인만 하면 타 강사의 대상자 이미지도 조회 가능하다.
경로에서 `userId` 를 추출해 `req.user.sub` 와 비교하거나,
분석 레코드 조회를 거쳐 소유권을 확인하도록 변경한다.
(다른 16개 지점에서는 이미 잘 수행되고 있는 검증이다.)

**5-4. 컨트롤러 가드 방식 통일**
`body-posture.controller.ts` 를 클래스 레벨 `@UseGuards(JwtAuthGuard)` 로 바꾸고,
공개가 필요한 엔드포인트에만 `@Public()` 데코레이터로 예외를 두는 방식이
누락을 구조적으로 방지한다 (`golf-swing`/`subject` 컨트롤러와 동일한 패턴).

## §6. P2-2 · 위험 설정 제거

`app.module.ts:109-110` 에서 삭제:
```ts
// 삭제
// dropSchema: configService.get('DB_DROP_SCHEMA') === 'true',
```
`backend/.env` 에 `DB_DROP_SCHEMA` 항목이 있다면 함께 제거.

## §7. P2-3 · 로그 로테이션

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# P0-1 복구 확인 후 기존 크래시 로그 정리 (954MB 회수)
pm2 flush golf-backend
```

## §8. P3-3 · `axios` 의존성 위치 교정

```bash
cd backend
npm install --save axios      # devDependencies → dependencies 로 이동
```
런타임 코드(`remo-api.service.ts`)가 import 하므로 `dependencies` 가 맞다.

---

# 중기 (1~2개월) — 구조 개선

## §9. P1-1 + P1-5 · 업로드 파이프라인 정합화 — **반드시 함께**

> ⚠️ **nginx 제한만 먼저 올리면 즉시 OOM 크래시가 발생한다.**
> 현재 nginx 25MB 제한이 우연히 P1-5 의 메모리 폭발을 막고 있다.
> 순서를 지켜야 한다.

**순서**:
1. 백엔드를 `memoryStorage()` → `diskStorage()` 로 전환 (스트리밍)
2. base64 전면 적재 제거 — REMO API 가 multipart 를 지원하면 그것으로,
   아니면 스트림 기반 base64 변환으로
3. `max_memory_restart` 를 실제 사용량 측정 후 상향
4. **그 다음에** nginx 상한을 올린다:
   ```nginx
   client_max_body_size 200m;     # 실제 필요량 기준으로 결정
   proxy_read_timeout   300s;
   proxy_send_timeout   300s;
   ```
5. 프론트 axios timeout(300s) 과 nginx `proxy_read_timeout` 을 일치시킨다

**타임아웃 정합표** (목표):
| 계층 | 현재 | 목표 |
|------|------|------|
| nginx `client_max_body_size` | 25m | 200m |
| nginx `proxy_read_timeout` | 60s(기본) | 300s |
| NestJS 영상 `fileSize` | 500MB | 200MB |
| 프론트 axios (영상) | 300s | 300s |
| 백엔드 → REMO axios | 없음 | 60s ([§10](#10-p2-1--remo-api-timeout)) |

<a name="10-p2-1--remo-api-timeout"></a>
## §10. P2-1 · REMO API timeout

`remo-api.service.ts:466` `makeRequestWithRetry`:
```ts
const config = { headers, timeout: 60000 };   // 60초
return method === 'GET'
  ? await axios.get(url, config)
  : await axios.post(url, data, config);
```
재시도 백오프도 선형(`retryDelay * attempt`) → 지수(`retryDelay * 2 ** (attempt - 1)`) 검토.

## §11. P1-3 · DB 마이그레이션 도입

**11-1.** `backend/src/data-source.ts` 작성 (엔티티 목록은 `app.module.ts` 와 공유)

**11-2.** `package.json` 스크립트 추가
```json
"typeorm": "typeorm-ts-node-commonjs -d src/data-source.ts",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert"
```

**11-3.** 현재 스키마를 baseline 마이그레이션으로 생성
```bash
npm run migration:generate -- src/migrations/InitialSchema
```

**11-4.** `app.module.ts` 에서 `synchronize: false` 고정 (개발 환경 포함)

**11-5.** `.github/workflows/deploy.yml` 의 백엔드 빌드 뒤에 삽입
```yaml
cd backend
npm ci --production=false
npm run build
npm run migration:run          # ← 추가
cd ..
```

## §12. P1-2 · 로그인 설계 정리

**A안 (권장 — 최소 변경)**
1. `RegisterUser.dto.ts` 에서 `@IsOptional()` 제거 → 이메일 필수화
2. `user.entity.ts:46` 에 `unique: true` 추가
3. 마이그레이션으로 기존 중복/NULL 이메일 정리 후 UNIQUE 인덱스 부여
   ```sql
   SELECT email, COUNT(*) FROM users
   WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;
   SELECT id, username FROM users WHERE email IS NULL;
   ```
4. `UserRepository.findByEmail` 에 `if (!email) return null;` 가드 추가

**B안** — 로그인 키를 `username`(이미 unique·필수)으로 변경.
프론트 `lib/auth.ts` 와 로그인 UI 도 함께 수정해야 하므로 변경 범위가 크다.

## §13. P1-4 · 테스트 도입

Clean Architecture 로 인터페이스 주입이 되어 있어 목 리포지토리 주입이 쉽다.

**우선순위**:
1. `LoginUserUseCase` — [§4](#4-p0-2--refresh-token-분리) 토큰 분리 회귀 방지
2. 소유권 검증 16개 지점 — 권한 우회 회귀 방지 (**현재 가장 잘 된 부분이므로 반드시 지켜야 함**)
3. `LocalStorageService.getFile` — [§5](#5-p0-3--이미지-엔드포인트-봉쇄) 경로 탐색 차단 검증
4. `RemoApiService` 재시도/에러 처리 (axios mock)

CI 에 `npm test` + `npx tsc --noEmit` 단계 추가.

## §14. P2-4 · REMO API 엔드포인트 정리

1. 정식 엔드포인트 확정 (`api.remo.re.kr` vs `api.rfremo.com`)
2. **https 전환** — 현재 API 키와 신체 이미지가 평문 전송된다
3. 프로덕션에서 키 누락 시 `mock-api-key` 폴백 대신 **부팅 실패**로 변경
   ```ts
   if (!apiKey || !userEmail || !userKey) {
     if (process.env.NODE_ENV === 'production') {
       throw new Error('REMO API 자격증명이 설정되지 않았습니다.');
     }
     this.apiKey = 'mock-api-key';   // 개발 환경에서만 허용
   }
   ```

## §15. 모니터링 — 이번 장애의 진짜 교훈

2.4개월간 서비스가 죽어 있었는데 **아무도 알지 못했다.**
개별 버그 수정보다 이것이 우선이다.

최소 구성:
- 백엔드에 `GET /api/health` 엔드포인트 추가 (DB 연결 상태 포함)
- 외부 모니터링(UptimeRobot 등)으로 `https://golf.remo.re.kr` 감시
- `docker update --restart unless-stopped` 를 golf 관련 전 컨테이너에 적용
- PM2 `errored` 상태 발생 시 알림 (Slack 등 — 이 환경에 `slack-bot-api` 스킬이 이미 있다)

## §16. P3-1 · 문서 정리

1. 스냅샷 성격 문서를 `docs/archive/` 로 이동
   (`INTEGRATION_COMPLETE.md`, `INTEGRATION_UPDATE_LOG.md`,
   `FRONTEND_INTEGRATION_SUMMARY.md`, `RESTRUCTURE_CHANGES.md`,
   `BACKEND_ISSUES_REPORT.md`)
2. `CURRENT_STATUS.md` 갱신 — 현재 브랜치 `main`, 실제 상태 반영
3. `.claude/WORK_LOG.md` 에 본 장애 기록 (프로젝트 규칙 `CLAUDE.md` §3 형식)
4. `README_BRANCHING_STRATEGY.md` 를 실제 브랜치 운영(main 단독)에 맞게 수정하거나 아카이브

## §17. P3-2 · 타입 검사 복원

```bash
cd frontend && npx tsc --noEmit    # 먼저 현재 오류 개수 측정
```
오류 해소 후 `next.config.mjs` 의 `typescript.ignoreBuildErrors` 제거,
CI 에 타입체크 단계 추가.

---

# 실행 순서 요약

| 순서 | 작업 | 소요 | 위험도 |
|------|------|------|--------|
| 0 | **DNS A 레코드 5건 변경** → [05번 §5](./05-integration-status.md) | 10분+전파 | 없음 |
| 1 | [§3](#3-golf_swing_db_dumpsql-git-유출-차단--가장-급한-1분-작업) `.gitignore` 에 덤프 추가 | 1분 | 없음 |
| 2 | [§1](#1-크래시-루프-정지--db-기동--백엔드-재기동) DB 기동 + 백엔드 복구 | 15분 | 중 (서비스 영향) |
| 2b | **GitHub Actions `SERVER_HOST` 갱신 + SSH 키 인증 전환** → [05번 §2-2](./05-integration-status.md) | 20분 | 중 (보안) |
| 3 | [§2](#2-크래시-루프-재발-시-폭주-차단) PM2 재시작 한도 | 5분 | 낮음 |
| 4 | [§7](#7-p2-3--로그-로테이션) 로그 로테이션 + 954MB 정리 | 5분 | 낮음 |
| 5 | — **E2E 재현으로 `CLAUDE.md` 기존 9건 유효성 재판정** | 반나절 | 없음 |
| 6 | [§4](#4-p0-2--refresh-token-분리) [§5](#5-p0-3--이미지-엔드포인트-봉쇄) [§6](#6-p2-2--위험-설정-제거) 보안 수정 | 1~2주 | 중 (재로그인 필요) |
| 7 | [§9](#9-p1-1--p1-5--업로드-파이프라인-정합화--반드시-함께) 업로드 파이프라인 | 2~3주 | 높음 |
| 8 | [§11](#11-p1-3--db-마이그레이션-도입) [§12](#12-p1-2--로그인-설계-정리) [§13](#13-p1-4--테스트-도입) 구조 개선 | 1~2개월 | 중 |
| 9 | [§15](#15-모니터링--이번-장애의-진짜-교훈) 모니터링 | 상시 | 없음 |

> **5번(E2E 재현)이 중요하다.** `CLAUDE.md` 에 기록된 미해결 9건은
> 2025-12-11 기준이며, 백엔드가 2.4개월간 죽어 있어 현재 유효한지 알 수 없다.
> 복구 후 재현부터 해야 실제 남은 작업량이 확정된다.
