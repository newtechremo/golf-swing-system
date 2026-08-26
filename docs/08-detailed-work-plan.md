# 08. 상세 작업 플랜 — 확정본

**작성일**: 2026-08-26 / **기준 커밋**: `7e34b47` / **개정**: 2차 (전략 확정 반영)
**확정 전략**: **프론트만 Vercel · 백엔드 + DB 는 현 서버 유지**
**대체 관계**: [06](./06-execution-plan.md)·[07](./07-deployment-architecture.md) 을 통합한 **실행 기준 문서**
**전제**: 메인 서비스 아님 → 완벽함보다 **동작하는 상태로 빠르게**

---

# Part I. 확정 아키텍처

## 무엇이 이동하고 무엇이 남는가

| 계층 | 현재 | **확정 후** | 근거 |
|------|------|------------|------|
| **프론트엔드** (Next.js 16) | 서버 `:3000` (PM2) | ✅ **Vercel** | 14/14 페이지 `'use client'` 순수 SPA. API Route·Server Action·Node API 전부 0건 |
| **백엔드** (NestJS) | 서버 `:3003` (PM2) | ❌ **현 서버 유지** | REMO API 키 보관 · 로컬 파일저장 · `@Cron` · DB 커넥션 |
| **MySQL** | 서버 Docker `:3306` | ❌ **현 서버 유지** | 4.38MB / 14테이블. 매니지드 이전 이득 없음 |
| **결과 이미지** | 로컬 `backend/results/` 5.5MB | ❌ **현 서버 유지** | 서버리스는 영속 디스크 없음 |
| **원본 영상** | AWS S3 `sppb-private` | ✅ 이미 외부 | 변경 없음 |
| **API 진입점** | Next rewrites `/backend-api` | 🔄 **`api-golf.remo.re.kr`** | 프론트가 Vercel 로 가면 rewrites 사용 불가 |

## 트래픽 흐름 — before / after

```
[현재]
  golf.remo.re.kr ─> nginx ─> :3000 Next.js ─rewrites─> :3003 NestJS ─> MySQL / REMO / S3
                                  ↑ 프론트가 죽으면 API 도 죽는다
                                  ↑ nginx proxy_read_timeout 미설정(기본 60s) → 30~60초 요청이 잘림

[확정 후]
  golf.remo.re.kr ─CNAME─> Vercel (정적 SPA)        ← git push 자동배포
                                │
                                │ 브라우저가 직접 호출 (Vercel 함수 경유 안 함)
                                ▼
  api-golf.remo.re.kr ─> nginx(100m / 300s) ─> :3003 NestJS ─> MySQL(:3306) / 로컬 results/
                          (49.169.8.19)                      └─> REMO API / AWS S3
```

## 이 구성의 이점

| 항목 | 효과 |
|------|------|
| 프론트 배포 | `git push` 만으로 완결. **SSH 불필요** (외부 22번 포트가 닫혀 있는 현 제약 우회) |
| 서버 재이전 | 프론트 무영향. 이번 같은 사고 시 최소한 화면은 뜬다 |
| 30~60초 분석 | 브라우저→백엔드 직접 호출 → **Vercel 함수 타임아웃 적용 대상 아님** |
| 100MB 업로드 | 〃 Vercel 바디 제한과 무관 |
| 백엔드 배포 | 서버에 직접 접근 가능 → 로컬 스크립트. SSH 를 인터넷에 열 이유가 없음 |
| 비용 | 백엔드/DB 는 기존 서버 재사용(한계비용 ≈ 0), Vercel 은 Hobby 로 충분 |

## 🔴 이 구성의 단 하나의 함정

**`next.config.mjs` 의 `rewrites()` 를 프로덕션 경로로 쓰면 안 된다.**
쓰는 순간 요청이 Vercel 엣지를 경유해 함수 타임아웃·바디제한에 걸린다.
`rewrites` 는 **로컬 개발 전용**으로 격리하고, 프로덕션은
`NEXT_PUBLIC_API_BASE_URL=https://api-golf.remo.re.kr/api` 절대 URL 로 직접 호출한다.
(참고: `destination` 이 `localhost:3003` 이라 Vercel 에서는 어차피 동작하지 않는다.)

---

# Part II. 사전 검토에서 드러난 항목 (10건)

플랜 확정 전 코드·DB 를 실측해 확인한 것들이다. 모두 아래 작업 항목에 반영되어 있다.

| # | 발견 | 반영 |
|---|------|------|
| 1 | 🔴 **테스트 계정 부재** — `CLAUDE.md` 의 `instructor001@golf.com` 은 DB 에 없고(실제 `test@example.com`), 비밀번호도 불일치 | STEP 0 신설 (S0-1) |
| 2 | 🔴 **`body-posture` 도 동기** — `POST /analyze` 가 REMO 를 **4회** 동기호출(`253,266,279,292`), 조회도 4회(`494,511,527,543`) | S1-2 |
| 3 | 🔴 **멈춘 레코드 18건** — golf `processing` 14 + posture `pending` 4. 크레딧 차감됐는데 결과 없음 | S0-2 |
| 4 | 🔴 **비밀번호 변경이 항상 "성공"으로 표시** — `await` 누락 + 백엔드 엔드포인트 자체가 없음 | S1-11 |
| 5 | 🟠 S3 업로드도 동기 구간 → 응답 "2~5초"는 낙관치 | S1-1 주석 (1차 유지) |
| 6 | 🟠 fire-and-forget 유실 시 `pending` 잔류 → `refresh` 로 복구 **불가** | S1-1 주의 + UI 재시도 |
| 7 | 🟠 `NEXT_PUBLIC_*` 은 **빌드타임 인라인** → Vercel env 변경만으론 반영 안 됨 | S3-2 경고 |
| 8 | 🟡 비동기화가 동시 업로드를 늘림 → 100MB×3 ≈ 700MB 피크 | S1-4 (`max_memory_restart` 2G) |
| 9 | 🟡 크로스오리진 전환 시 **OPTIONS preflight** 발생 | S2-2 검증 항목 |
| 10 | 🟡 **타입 오류 9건** (`ignoreBuildErrors` 로 가려짐) — 8건은 `components/ui/chart.tsx`(shadcn+recharts 알려진 이슈), 1건은 #4 의 실제 버그 | S3-1 방침 |

---

# Part III. 작업 플랜

```
STEP 0  선결 정리        0.5일   검증 기반 마련
STEP 1  백엔드 정리      2일     응답시간 · 보안 · 버그
STEP 2  인프라 + DB      0.5일   api-golf · nginx · 백업
STEP 3  Vercel 이전      1일     프론트 이전 · 배포 파이프라인
────────────────────────────────────────────────────
합계                     4일
```

작업 ID: `S<단계>-<번호>` / 각 항목 = `대상 · 내용 · 검증 · 소요`

---

# STEP 0 — 선결 정리 (0.5일)  ✅ **2026-08-26 완료**

> 목적: **검증 가능한 상태**를 먼저 만든다. 이게 없으면 이후 모든 단계가 "아마 될 것"으로 끝난다.

## S0-1. 테스트 계정 복구 · 문서 정정 ★최우선 · 30m  ✅ 완료

**대상**: DB `users`, `CLAUDE.md`

| | `CLAUDE.md` 기재 | 실제 DB |
|---|---|---|
| 이메일 | `instructor001@golf.com` | `test@example.com` (username 은 `instructor001`) |
| 비밀번호 | `Test1234!` | **불일치** |

```bash
# 1) bcrypt 해시 생성 (라운드 10 — 기존 데이터와 동일)
cd backend && node -e "console.log(require('bcrypt').hashSync('Test1234!', 10))"

# 2) 비밀번호 재설정
docker exec golf_mysql mysql -ugolf_swing_user -p'<비번>' golf_swing_db \
  -e "UPDATE users SET password_hash='<위 해시>' WHERE username='instructor001';"

# 3) 확인
curl -s -X POST http://localhost:3003/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test1234!"}' | head -c 200
```

`CLAUDE.md` §4:
```diff
 ### 테스트 계정
-Email: instructor001@golf.com
-Password: Test1234!
+Email: test@example.com          # username 은 instructor001
+Password: Test1234!
```
서비스명도 함께 정정: 일반 골프가 아니라 **파크골프(ParkGolf AI Pro)** (`app/layout.tsx:12`).

**검증**: 로그인 200 + `accessToken` 수신
> ⚠️ 프로덕션 DB 의 실계정을 수정한다. `id=1 / instructor001 / test@example.com` 은
> 마지막 로그인 2026-05-21, 이메일이 `@example.com` 이라 테스트 계정으로 판단되나
> **실사용 계정이 아닌지 확인 후 진행**할 것. 실사용이면 새 계정을 만든다.

## S0-2. 멈춘 레코드 18건 회수 시도 · 1~2h  ✅ 완료 (원인 규명)

**현황**
```
golf_swing_analyses   : processing 14 / completed 72 / failed 5
body_posture_analyses : pending 4 / completed 27 / failed 9

id 96,95  2026-05-17  credit_used 99996
id 73,72  2026-03-20  credit_used 100004
id 63,52,46,44  2026-02
```

프론트 폴링이 **60회×5초 = 5분에서 포기**하므로, REMO 분석이 5분을 넘기면 영구 `processing` 잔류.
**크레딧은 차감됐는데 결과를 못 받은 상태**다.

```bash
AT=$(curl -s -X POST http://localhost:3003/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test1234!"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")

for id in 96 95 73 72 63 52 46 44; do
  echo -n "id=$id → "
  curl -s -X POST "http://localhost:3003/api/golf-swing/analysis/$id/refresh" \
    -H "Authorization: Bearer $AT" | head -c 120; echo
done
```
> 소유자(`user_id`)가 다르면 403 이 난다. 대상 레코드의 `user_id` 를 먼저 확인할 것.

| 응답 | 조치 |
|------|------|
| `completed` | ✅ 회수 성공 |
| `534` / `분석이 진행 중` | 며칠 후 재시도 |
| 404 / 오류 | REMO 보관기간 초과 → `failed` 로 정리 |

```sql
UPDATE golf_swing_analyses SET status='failed'
WHERE status='processing' AND analysis_date < '2026-06-01';
```

**부수 효과**: 이 작업이 **REMO 결과 보관 기간**을 알려준다. 향후 재시도 정책의 근거가 된다.

## S0-3. PM2 안정화 + 로그 정리 · 30m  ✅ 완료 (955MB 회수)

```diff
# ecosystem.config.js — golf-backend, golf-frontend 양쪽
       max_memory_restart: '1G',
+      // DB 장애 시 49,368회 재시작 + 로그 954MB 폭주 재발 방지
+      min_uptime: 10000,
+      max_restarts: 15,
+      restart_delay: 5000,
```
```bash
pm2 reload ecosystem.config.js --env production && pm2 save
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
du -sh backend/logs/ && pm2 flush golf-backend && du -sh backend/logs/
```
**검증**: `pm2 describe golf-backend | grep -E "min uptime|max restarts"` / `df -h /`

---

# STEP 1 — 백엔드 정리 (2일)

## 1-A. 응답시간 · 업로드 (반나절)

### S1-1. `golf-swing` REMO 호출 비동기화 ★핵심 · 2h

**대상**: `backend/src/presentation/controllers/golf-swing.controller.ts:100-132`

`remoResult` 는 응답에 쓰이지 않는다(DB 업데이트 전용). **기다릴 이유가 없다.**

```diff
-    // REMO API 호출하여 분석 시작
-    try {
-      const remoResult = await this.remoApiService.requestGolfSwingAnalysis(
-        file.buffer, result.uuid, height || '175',
-      );
-      await this.analysisRepository.update(result.analysisId, {
-        status: 'processing',
-        waitTime: remoResult.waitTime,
-        creditUsed: remoResult.credit,
-      });
-    } catch (error) {
-      this.logger.error('REMO API 호출 실패:', error.message);
-      await this.analysisRepository.update(result.analysisId, { status: 'failed' });
-    }
+    // 클라이언트는 analysisId 로 폴링한다(pollGolfSwingAnalysis).
+    // await 하면 30~60초를 붙잡아 nginx 타임아웃에 잘린다.
+    void this.startRemoAnalysis(result.analysisId, result.uuid, file.buffer, height);
 
     return {
       message: '골프 스윙 분석이 시작되었습니다.',
       analysisId: result.analysisId,
       uuid: result.uuid,
     };
   }
+
+  /** REMO 분석 요청을 백그라운드로 수행한다. 절대 throw 하지 않는다. */
+  private async startRemoAnalysis(
+    analysisId: number,
+    uuid: string,
+    videoBuffer: Buffer,
+    height?: string,
+  ): Promise<void> {
+    try {
+      const remoResult = await this.remoApiService.requestGolfSwingAnalysis(
+        videoBuffer, uuid, height || '175',
+      );
+      await this.analysisRepository.update(analysisId, {
+        status: 'processing',
+        waitTime: remoResult.waitTime,
+        creditUsed: remoResult.credit,
+      });
+      this.logger.log(`REMO 요청 성공: uuid=${uuid}, wait=${remoResult.waitTime}s`);
+    } catch (error) {
+      this.logger.error(`REMO 요청 실패: uuid=${uuid} - ${error.message}`);
+      await this.analysisRepository
+        .update(analysisId, { status: 'failed' })
+        .catch((e) => this.logger.error(`status 갱신 실패: ${e.message}`));
+    }
+  }
```

> `file` 객체 전체가 아니라 `file.buffer` 만 넘긴다. Multer File 을 통째로 붙잡으면
> 불필요한 참조가 함께 살아남는다.

**주의 2가지**
- **S3 업로드는 여전히 동기다** (`uploadVideoFile` 이 레코드 생성 전에 필요).
  100MB 기준 서버 업링크에 따라 2~15초. **1차에서는 그대로 둔다.** 실측 후 판단.
- **프로세스 재시작 시 `pending` 잔류** → `refresh` 로 복구 불가(REMO 가 uuid 를 모름).
  잡 큐는 이 규모에 과하므로 **UI 재시도 버튼으로 갈음**한다.

**검증**
```bash
dd if=/dev/urandom of=/tmp/t50.mp4 bs=1M count=50 2>/dev/null
time curl -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $AT" \
  -F "video=@/tmp/t50.mp4" -F "subjectId=1" -F "swingType=full" \
  http://localhost:3003/api/golf-swing/analyze
# 기대: 30~60초 → 10초 이내
# DB 에서 status 가 pending → processing 으로 전이하는지 확인
```

### S1-2. `body-posture` REMO 호출 비동기화 · 3h

**대상**: `body-posture.controller.ts:253,266,279,292`

REMO 를 **4회 동기 호출**한다(front/leftSide/rightSide/back). golf 보다 대기가 길다.

```ts
/** 4방향 REMO 요청을 병렬 백그라운드로 수행한다. */
private async startPostureAnalyses(
  analysisId: number,
  images: { front?: Buffer; leftSide?: Buffer; rightSide?: Buffer; back?: Buffer },
): Promise<void> {
  const jobs = Object.entries(images)
    .filter(([, buf]) => !!buf)
    .map(async ([side, buf]) => {
      try {
        const res = await this.remoApiService.requestBodyPostureAnalysis(buf!, side);
        await this.analysisRepository.update(analysisId, {
          [`${side}Uuid`]: res.uuid,
          [`${side}Status`]: 'completed',
        });
      } catch (e) {
        this.logger.error(`체형 분석 요청 실패 (${side}): ${e.message}`);
        await this.analysisRepository
          .update(analysisId, { [`${side}Status`]: 'failed' })
          .catch(() => undefined);
      }
    });
  await Promise.allSettled(jobs);   // 개별 실패가 서로를 막지 않게
}
```
> ⚠️ 위는 **패턴 예시**다. `requestBodyPostureAnalysis` 의 실제 인자·반환 형태와
> 엔티티 필드명(`frontUuid`/`frontStatus` 등)을 코드에서 확인해 맞출 것.

**검증**: `POST /body-posture/analyze` 응답시간 단축 + 4방향 status 순차 갱신

### S1-3. 영상 상한 100MB 확정 · 1h

| 계층 | 현재 | **확정** |
|------|------|---------|
| nginx `client_max_body_size` | 25m | **100m** (S2-2) |
| NestJS `fileSize` | 500MB | **100MB** |
| 프론트 axios timeout | 300s | **180s** |
| 백엔드 → REMO axios | **없음** | **180s** |

```diff
# golf-swing.controller.ts:65
-        fileSize: 500 * 1024 * 1024, // 500MB for video
+        fileSize: 100 * 1024 * 1024, // 100MB (nginx client_max_body_size 와 일치)
```
```diff
# remo-api.service.ts:466  makeRequestWithRetry
     const headers = { 'Content-Type': 'application/json' };
+    // timeout 미설정 시 REMO 무응답에 무기한 대기한다.
+    const config = { headers, timeout: 180000 };
-      if (method === 'GET')  return await axios.get(url, { headers });
-      else                   return await axios.post(url, data, { headers });
+      if (method === 'GET')  return await axios.get(url, config);
+      else                   return await axios.post(url, data, config);
```
```diff
# frontend/lib/golf-swing.ts:109
-      timeout: 300000, // 5분 타임아웃 (최대 500MB 비디오 업로드)
+      timeout: 180000, // 3분 (100MB 업로드 + 즉시응답)
```

**100MB 근거**: 파크골프 스윙은 수 초. 1080p 10초 ≈ 20~40MB.
메모리 피크 = 100(버퍼) + 133(base64) + 133(직렬화) ≈ **370MB**.
**500MB 를 포기하면 `diskStorage` 전환과 스트리밍 base64 가 전부 불필요해진다.**

### S1-4. 동시성 여유 · 30m

```diff
# ecosystem.config.js
-      max_memory_restart: '1G',
+      max_memory_restart: '2G',   // 비동기화로 동시 업로드 증가. 100MB×3 ≈ 700MB 피크
```
**검증**: 100MB 동시 3건 업로드 중 `pm2 describe golf-backend | grep -i memory`, 재시작 0회

---

## 1-B. 보안 · 버그 (하루)

> 🔴 **S1-5 · S1-6 · S1-9 는 반드시 같은 배포에 묶는다.**
> 이미지에 인증이 걸리면 `<img src>` 가 헤더를 못 보내 체형분석 결과 화면이 전멸한다.

### S1-5. 토큰 `type` 클레임 분리 · 2h

**대상**: `LoginUserUseCase.ts:82-93` · `jwt-auth.guard.ts:24` · `RefreshTokenUseCase.ts`

현재 access/refresh 가 **동일 시크릿·동일 payload**로 서명되어, refreshToken 을 Bearer 로
보내면 **7일짜리 액세스 권한**이 된다.

| 파일 | 변경 |
|------|------|
| `LoginUserUseCase` | `{...base, type:'access'}` / `{...base, type:'refresh'}` |
| `jwt-auth.guard` | `if (payload.type !== 'access') throw new UnauthorizedException(...)` |
| `RefreshTokenUseCase` | `if (payload.type !== 'refresh') throw` + 재발급 시 `type:'access'` |

diff 전문은 [06 §1-1](./06-execution-plan.md).

**배포 전략: 하드 컷오버.** 기존 토큰은 `type` 이 없어 전부 무효화된다.
강사 계정 5개뿐이라 하위호환 유예는 **취약점만 연장**한다. 사전 공지 후 배포.

**검증**
```bash
# refresh 토큰으로 보호 API → 401
curl -o /dev/null -w "%{http_code} (401 기대)\n" -H "Authorization: Bearer $RT" \
  http://localhost:3003/api/subjects
# access 토큰으로 /auth/refresh → 401
# 정상: access→subjects 200 / refresh→/auth/refresh 200
```

### S1-6. 이미지 엔드포인트 봉쇄 · 3h

**대상**: `body-posture.controller.ts:429` · `local-storage.service.ts:223`

3중 조치:
1. `@UseGuards(JwtAuthGuard)` 추가 — **이 엔드포인트만 가드가 빠져 있다**
2. 소유권 검증 — 경로 규약 `{folder}/{userId}/{file}` 또는 `results/{folder}/{userId}/{file}`
3. `path.resolve` + baseDir 접두사 검증 + mime **화이트리스트**(폴백 제거)

```ts
// 소유권 검증 (컨트롤러)
const segments = imagePath.split('/').filter(Boolean);
const ownerIdx = segments[0] === 'results' ? 2 : 1;
const ownerId = Number(segments[ownerIdx]);
if (!Number.isInteger(ownerId) || ownerId !== req.user.sub) {
  throw new ForbiddenException('접근 권한이 없습니다.');
}
```
```ts
// 경로 봉쇄 (local-storage.service)
const absolutePath = path.resolve(baseDir, rel);
const baseResolved = path.resolve(baseDir);
if (absolutePath !== baseResolved && !absolutePath.startsWith(baseResolved + path.sep)) {
  this.logger.warn(`Path traversal blocked: ${relativePath}`);
  return null;
}
if (!mimeTypes[ext]) return null;   // 폴백 제거
```
diff 전문은 [06 §1-2](./06-execution-plan.md). `deleteFile()`(line 268)도 동일 봉쇄.
가드 방식도 `golf-swing`(36) · `subject`(27) 처럼 **클래스 레벨로 통일**한다.

**검증**
```bash
curl -o /dev/null -w "미인증: %{http_code} (401)\n" \
  "http://localhost:3003/api/body-posture/images/posture/1/x.jpg"
curl -o /dev/null -w "traversal: %{http_code} (비200)\n" --path-as-is \
  -H "Authorization: Bearer $AT" \
  "http://localhost:3003/api/body-posture/images/../../.env"
# 타 강사 이미지 → 403
```

### S1-7. CORS 화이트리스트 · 30m

**대상**: `main.ts:18-23` · `backend/.env`

Vercel 이전 후 백엔드가 인터넷에 직접 노출되므로 반드시 좁힌다.

```diff
+  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
+    .split(',').map((s) => s.trim()).filter(Boolean);
   app.enableCors({
-    origin: true, // 모든 origin 허용
+    origin: corsOrigins.length > 0 ? corsOrigins : true,
     credentials: true,
```
```
CORS_ORIGINS=https://golf.remo.re.kr,http://localhost:3000
```
STEP 3 프리뷰 검증 중에는 프리뷰 URL 을 임시 추가하고, 전환 후 정리한다.

### S1-8. 잡다한 정리 · 1h

| 대상 | 변경 |
|------|------|
| `app.module.ts:109-110` | `dropSchema` 라인 삭제 (env 하나로 전체 데이터 삭제되는 경로) |
| `backend/package.json` | `npm install --save axios` (런타임 의존인데 devDeps) |
| `remo-api.service.ts:103` | 기본값 `http://` → `https://api.remo.re.kr` |
| `PdfGenerationService` | **어떤 컨트롤러도 미사용.** PDF 계획 없으면 제거 (Chromium ~300MB 절감) |

### S1-9. 프론트 이미지 blob 로딩 (S1-6 동반 필수) · 3h

**대상**: `frontend/lib/api.ts` · `frontend/app/body-analysis-result/page.tsx` (`getImageUrl` 8곳)

```ts
// lib/api.ts — 인증 이미지를 blob URL 로. 호출측에서 revokeObjectURL 필수.
export async function fetchImageObjectUrl(
  relativePath: string | null | undefined,
): Promise<string> {
  if (!relativePath) return ''
  if (/^https?:\/\//.test(relativePath)) return relativePath
  const res = await api.get(`/body-posture/images/${relativePath}`, { responseType: 'blob' })
  return URL.createObjectURL(res.data)
}
```
```tsx
// body-analysis-result/page.tsx
const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

useEffect(() => {
  let cancelled = false
  const created: string[] = []
  ;(async () => {
    const entries = await Promise.all(
      (['front', 'leftSide', 'rightSide', 'back'] as const).map(async (k) => {
        const u = await fetchImageObjectUrl(data?.images?.[k]?.url).catch(() => '')
        if (u.startsWith('blob:')) created.push(u)
        return [k, u] as const
      }),
    )
    if (!cancelled) setImageUrls(Object.fromEntries(entries))
  })()
  return () => {
    cancelled = true
    created.forEach((u) => URL.revokeObjectURL(u))   // 메모리 누수 방지
  }
}, [data])
```
기존 `getImageUrl(...) || "/fallback.jpg"` → `imageUrls[k] || "/fallback.jpg"`

**검증**: 4방향 이미지 정상 표시 / Network 에 401 없음 / 페이지 이탈 시 blob 해제

### S1-10. `/api/health` 엔드포인트 · 30m

**대상**: `presentation/controllers/health.controller.ts` (신규) · `app.module.ts`

```ts
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** 인증 불필요. DB 연결까지 실제로 확인한다. */
  @Get()
  async check() {
    let db = 'down';
    try { await this.dataSource.query('SELECT 1'); db = 'up'; } catch { db = 'down'; }
    return { status: db === 'up' ? 'ok' : 'degraded', db, uptime: Math.floor(process.uptime()) };
  }
}
```
가드를 붙이지 않는다. S3-7 배포 스크립트와 외부 모니터링이 이 엔드포인트에 의존한다.

### S1-11. 🔴 비밀번호 변경 버그 · 1h

**대상**: `frontend/app/password/page.tsx:44-45` · `backend` (엔드포인트 부재)

**문제 2중**

① `await` 누락 — `changePassword` 는 `Promise<boolean>` 인데 그냥 받는다.
Promise 객체는 항상 truthy 라 **실패해도 무조건 "성공" UI 로 가고 `/main` 으로 리다이렉트**한다.

```diff
-    const result = changePassword(currentPassword, newPassword)
+    const result = await changePassword(currentPassword, newPassword)
     if (result) {
```

② **백엔드에 `POST /auth/change-password` 가 없다.** `auth.controller.ts` 에는
`register`/`login`/`refresh` 만 있다. `lib/auth.ts:116` 이 호출하는 엔드포인트는 404 다.

→ ①만 고치면 화면이 정직해지지만 **기능은 여전히 동작하지 않는다.**

**선택**
| 방식 | 내용 |
|------|------|
| **A. 엔드포인트 구현** | `ChangePasswordUseCase` + `POST /auth/change-password` (현재 비밀번호 bcrypt 검증 → 새 해시 저장) |
| B. 기능 비활성화 | `await` 만 고치고 UI 에 "준비 중" 표시 |

계정이 5개뿐이라 급하지 않다. **A 를 권장하되 STEP 1 범위 밖으로 미뤄도 된다.**
다만 ①의 `await` 누락은 **지금 고친다** (사용자에게 거짓 성공을 보여주는 것이 더 나쁘다).

### S1-12. 🔴 REMO 에러 응답이 `failed` 로 반영되지 않음 (STEP 0 에서 발견) · 1h

**대상**: `golf-swing.controller.ts` `refreshAnalysisResult` (166행~) · `getAnalysis`

**발견 경위**: S0-2 에서 멈춘 12건에 `refresh` 를 실행하니 **전부 REMO Error 520** 이었다.
```
first golf section recognition error, error: list index out of range   (8건)
get golf result error, error: list index out of range                  (3건)
get golf score error, error: bad operand type for abs(): 'NoneType'    (1건)
```
REMO 가 **영상에서 스윙 구간을 인식하지 못해 분석에 실패**한 것이다.

**문제**: 현재 코드는 `534`(진행중)만 분기 처리하고, `520` 같은 확정 실패는
예외를 던져 **status 를 갱신하지 않는다.** 그래서 `processing` 으로 영구 잔류하고
사용자는 몇 달째 "분석 중" 화면만 본다.

```diff
       if (remoResult.status === 534) {
         return { message: '분석이 진행 중입니다.', status: 'processing' };
       }
+
+      // 520 등 확정 실패는 failed 로 반영한다.
+      // 그러지 않으면 processing 으로 영구 잔류해 사용자가 무한 대기한다.
+      if (remoResult.status && remoResult.status !== 200) {
+        await this.analysisRepository.update(analysisId, { status: 'failed' });
+        return {
+          message: '분석에 실패했습니다. 영상을 다시 촬영해 주세요.',
+          status: 'failed',
+        };
+      }
```
> REMO 상태코드 체계를 확인해 `200`/`534` 외 값의 처리 기준을 확정할 것.
> 사용자에게는 원문(`list index out of range`) 대신 **재촬영 안내**를 보여준다.

**부수 확인**: REMO 결과 **보관기간이 최소 7개월**임을 확인했다 (2026-01-17 건도 응답).
→ 재시도 정책을 세울 수 있다.

---

### S1-13. 🔴 체형분석 leftSide/back 구조적 실패 조사 (STEP 0 에서 발견) · 조사 2h + 수정 별도

**대상**: `body-posture.controller.ts:253-300, 328-337, 509`

**증상**: 11건이 **정확히 같은 패턴**으로 실패
```
front: completed / rightSide: completed / leftSide: pending / back: pending
```
이미지는 4방향 모두 업로드되어 있다(URL 존재 확인). 미업로드가 아니라 **실제 실패**다.

**구조 분석**
| 위치 | 문제 |
|------|------|
| `:334-337` | `analysisResults.X ? 'completed' : 'pending'` → leftSide/back 결과가 falsy |
| `:328-331` | **`frontUuid: null, leftSideUuid: null, ...` 로 저장** |
| `:509` | `if (status==='pending' && analysis.leftSideUuid)` → **uuid 가 null 이라 복구 경로가 절대 실행 안 됨** |

→ **기존 11건은 복구 불가.** REMO 에 물어볼 uuid 자체가 없다.

**추정 원인**: `Promise.all` 이 leftSide/back 실패로 reject 되지만
이미 할당된 `analysisResults.front/rightSide` 는 살아남아 부분 저장된다.
왜 항상 leftSide·back 인지는 재현 테스트로 확인해야 한다
(REMO `analysis-skeleton-v2-side` 동시 2건 호출 제한 가능성).

**조치**
1. S1-2 비동기화 시 `Promise.allSettled` 로 전환하여 **부분 실패가 서로를 막지 않게** 한다
2. **REMO 응답의 uuid 를 반드시 저장**한다 (현재 null 하드코딩 → 복구 경로 자체가 죽어 있음)
3. 4방향 업로드 재현 테스트로 leftSide/back 실패 원인 규명

> 📌 **`CLAUDE.md` C-01 "체형 분석 이미지 필드 부족 (0/3 → 3개 필요)" 와 연관 가능성이 높다.**
> C-01 재현 시 이 항목부터 확인할 것.

---

## STEP 1 완료 판정

```
□ 50MB 영상 업로드 응답 10초 이내
□ 100MB 초과 업로드 → 413
□ body-posture 업로드 응답 단축
□ refresh 토큰으로 보호 API → 401
□ 미인증 이미지 → 401 / 경로탐색 → 비200 / 타강사 이미지 → 403
□ 체형분석 결과 이미지 4방향 정상 표시 (blob)
□ /api/health → {"status":"ok","db":"up"}
□ 비밀번호 변경이 실패 시 실패로 표시
□ REMO 520 응답 시 status 가 failed 로 전이
□ 체형분석 4방향 업로드 시 uuid 가 저장됨
□ pm2 재시작 0회, 메모리 안정
```
**롤백**: `git revert` → `npm run build` → `pm2 restart golf-backend` (재로그인 재발생)

---

# STEP 2 — 인프라 + DB (0.5일)

## S2-1. Route 53 `api-golf.remo.re.kr` · 15m

```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0575940EHXG9YRNO7QK \
  --profile remo-aws --change-batch '{
    "Comment":"Golf backend API subdomain",
    "Changes":[{"Action":"UPSERT","ResourceRecordSet":{
      "Name":"api-golf.remo.re.kr.","Type":"A","TTL":300,
      "ResourceRecords":[{"Value":"49.169.8.19"}]}}]}'
dig +short @8.8.8.8 api-golf.remo.re.kr    # → 49.169.8.19
```

## S2-2. nginx vhost 신규 · 45m

**대상**: `/etc/nginx/sites-available/api-golf.remo.re.kr`

같은 서버의 `finefit-simpro.remo.re.kr` 이 이미 검증한 패턴을 따른다.

```nginx
server {
    server_name api-golf.remo.re.kr;

    client_max_body_size 100m;          # S1-3 상한과 일치

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_request_buffering off;     # 대용량 업로드를 버퍼링 없이 흘림
        proxy_read_timeout  300s;        # 결과 조회가 REMO 를 호출할 수 있다
        proxy_send_timeout  300s;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/api-golf.remo.re.kr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api-golf.remo.re.kr
```

**검증** (preflight 포함 — 검토 #9)
```bash
curl -o /dev/null -w "health: %{http_code}\n"  https://api-golf.remo.re.kr/api/health
curl -o /dev/null -w "미인증: %{http_code} (401)\n" https://api-golf.remo.re.kr/api/subjects
curl -i -X OPTIONS https://api-golf.remo.re.kr/api/subjects \
  -H "Origin: https://golf.remo.re.kr" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" 2>&1 | grep -i "access-control\|HTTP/"
```
**롤백**: 심볼릭 링크 삭제 → `nginx -t && reload`

## S2-3. `golf.remo.re.kr` vhost 타임아웃 보강 · 10m

STEP 3 롤백 창구로 남겨야 하므로 함께 손본다.
```diff
     location / {
         proxy_pass http://localhost:3000;
+        proxy_read_timeout 300s;
+        proxy_send_timeout 300s;
     }
```

## S2-4. DB 자동 백업 · 20m

```cron
0 4 * * * docker exec golf_mysql mysqldump -ugolf_swing_user -p'<비번>' --single-transaction golf_swing_db 2>/dev/null | gzip > ~/backups/golf-db/golf_$(date +\%Y\%m\%d).sql.gz && find ~/backups/golf-db -name '*.sql.gz' -mtime +30 -delete
```
4.38MB DB → gzip 하루치 수백 KB. 30일 보관해도 부담 없음.
**검증**: 수동 1회 실행 후 `gunzip -t` 무결성 확인

## S2-5. `docker-compose.yml` 로 DB 구성 코드화 · 1h

현재 `golf_mysql` 은 `docker run` 으로 만들어져 **파라미터가 어디에도 기록돼 있지 않다.**
컨테이너를 잃으면 재현할 방법이 없다.

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: golf_mysql
    restart: unless-stopped
    ports: ["3306:3306"]
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: golf_swing_db
      MYSQL_USER: golf_swing_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - golf_mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries: 5
volumes:
  golf_mysql_data:
    external: true
    name: 5b12b5c5de472b73422f9de7d66af14c72acfeb4f25443359a7817de39608679
```

> 🔴 **`external: true` 필수.** 빠뜨리면 새 빈 볼륨이 생성되어 **데이터가 사라진다.**
> **S2-4 백업 완료 후** `docker compose config` 로 확인하고 진행할 것.

**검증**: `docker compose config` → `docker compose up -d` → 레코드 건수 유지 확인

---

# STEP 3 — Vercel 프론트 이전 (1일)

## S3-1. 빌드 재현성 확보 (선결) · 40m

**대상**: `.gitignore` · `frontend/package.json`

### ① 락파일 커밋 — 🔴 없으면 Vercel 빌드가 비결정적
```diff
 # Dependencies
 node_modules/
-package-lock.json
+# 재현 가능한 빌드를 위해 락파일은 반드시 추적한다 (Vercel 빌드 필수)
 ...
-frontend/pnpm-lock.yaml
```

### ② `"latest"` 의존성 4개 고정
`@radix-ui/react-dialog` · `@radix-ui/react-slider` · `recharts` · `@vercel/analytics`
```bash
cd frontend
npm ls @radix-ui/react-dialog @radix-ui/react-slider recharts @vercel/analytics --depth=0
# 출력된 실제 버전으로 package.json 수정 후
npm install && git add package.json package-lock.json .gitignore
```

### ③ Node 버전 고정
`engines` 미지정이라 Vercel 기본값을 따른다. 로컬은 v24.
```diff
+  "engines": { "node": ">=22" },
   "scripts": {
```

### ④ 패키지 매니저 npm 통일
`CLAUDE.md` 는 `pnpm dev` 를 안내하지만 실제로는 `package-lock.json`(npm)이 있다.
Vercel 은 락파일로 매니저를 판단하므로 **npm 으로 통일**하고 문서를 맞춘다.

### ⑤ 프로젝트명
```diff
-  "name": "my-v0-project",
+  "name": "parkgolf-ai-pro-frontend",
```

### ⑥ 타입 오류 9건 방침
`ignoreBuildErrors: true` 로 가려져 있다. 실측 결과:
- **8건** = `components/ui/chart.tsx` (shadcn + recharts 타입 불일치, 알려진 업스트림 이슈)
- **1건** = `app/password/page.tsx:45` → **S1-11 에서 수정됨**

→ chart.tsx 8건은 서비스 동작에 영향이 없다. **`ignoreBuildErrors` 는 이번엔 유지**하고,
   여유가 생기면 `chart.tsx` 를 정리한 뒤 플래그를 제거한다.

## S3-2. API URL 절대경로 전환 · 40m

**대상**: `frontend/lib/api.ts:3-12, 121-131`

```diff
 function getApiBaseUrl(): string {
-  if (typeof window === 'undefined') {
-    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003/api'
-  }
-  return '/backend-api'
+  // Vercel 이전 후 프론트/백엔드가 다른 호스트에 있으므로 절대 URL 을 쓴다.
+  // 로컬 개발에서는 값을 비워 두면 next.config.mjs 의 rewrites 로 동작한다.
+  return process.env.NEXT_PUBLIC_API_BASE_URL || '/backend-api'
 }
```
`getImageUrl` 은 S1-9 의 `fetchImageObjectUrl` 로 대체되므로 정리한다.

| 위치 | `NEXT_PUBLIC_API_BASE_URL` |
|------|---------------------------|
| Vercel Production / Preview | `https://api-golf.remo.re.kr/api` |
| 로컬 `frontend/.env.local` | **비워둠** → `/backend-api` rewrites 사용 |

> ⚠️ **검토 #7**: `NEXT_PUBLIC_*` 은 **빌드 시점에 클라이언트 번들로 인라인**된다.
> Vercel 에서 값만 바꾸면 반영되지 않는다. **반드시 재배포**해야 한다.

## S3-3. `rewrites()` 로컬 전용 격리 ★함정 · 15m

```diff
-  // 로컬 개발용: /backend-api 요청을 백엔드로 프록시
+  // ⚠️ 로컬 개발 전용.
+  // 프로덕션에서 이 경로를 타면 요청이 Vercel 엣지를 경유해
+  // 함수 타임아웃/바디제한에 걸린다. 프로덕션은 NEXT_PUBLIC_API_BASE_URL 절대 URL 사용.
+  // (destination 이 localhost:3003 이라 Vercel 에서는 어차피 동작하지 않는다.)
   async rewrites() {
```
`allowedDevOrigins` 의 IP 는 이미 신 IP 로 갱신됨(2026-08-26). 개발 모드 전용이라 Vercel 무관.

## S3-4. Vercel 프로젝트 생성 · 프리뷰 배포 · 1h

```bash
cd frontend
vercel link                    # Root Directory 를 frontend 로 지정 (모노레포)
vercel env add NEXT_PUBLIC_API_BASE_URL production   # https://api-golf.remo.re.kr/api
vercel env add NEXT_PUBLIC_API_BASE_URL preview
vercel                         # 프리뷰 배포
```
조직은 이미 Vercel 3개 도메인(`remo-ai-edu`·`remo-ai-studio`·`sodam-ai-studio`)을 운영 중이다.
빌드 자산 규모: `.next` 74MB / `public` 4.6MB(파일 25개) — Vercel 한도 내.

## S3-5. 프리뷰 전체 플로우 검증 · 1.5h

프리뷰 URL 을 `CORS_ORIGINS` 에 임시 추가 후 순서대로:

```
□ 로그인 (S0-1 계정)
□ 회원 목록 렌더링
□ 회원 상세
□ 스윙 업로드 (50MB) → 응답 10초 이내             ★
□ 분석대기 폴링 → 결과 표시
□ 구간 이미지 (8단계)
□ 체형 업로드 → 결과 → 4방향 이미지 (blob)        ★
□ 비밀번호 변경 화면이 실패를 실패로 표시           ★
□ 브라우저 콘솔 CORS 에러 0건                     ★
□ Network 탭 요청이 api-golf.remo.re.kr 로 감      ★
   (`/backend-api` 가 보이면 S3-3 실패)
□ 로그아웃 → 재로그인
```

## S3-6. 도메인 전환 · 30m

```
Route 53: golf.remo.re.kr
  A     49.169.8.19   →   CNAME  cname.vercel-dns.com
```
조직 기존 3개 도메인과 동일 방식. 전환 후 `CORS_ORIGINS` 에서 프리뷰 URL 정리.

> 🔴 **롤백 창구를 2주 유지한다.**
> `golf-frontend` PM2 프로세스와 nginx `golf.remo.re.kr` vhost 를 **지우지 말 것.**
> 문제 시 A 레코드 `49.169.8.19` 복귀 → TTL 300 이라 5분 내 복구.

## S3-7. 배포 파이프라인 교체 · 1h

외부 SSH(22)가 닫혀 있어 기존 워크플로는 **동작 불가**다(제3자 포트체크 `status:false`).
프론트는 Vercel 자동배포로 대체되었으므로 GitHub Actions 는 **검증 전용**으로 바꾼다.

`.github/workflows/deploy.yml` → `backend-ci.yml`:
```yaml
name: Backend CI
on:
  push: { branches: [main], paths: ['backend/**'] }
  pull_request: { paths: ['backend/**'] }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: 'npm', cache-dependency-path: backend/package-lock.json }
      - run: npm ci
        working-directory: backend
      - run: npx tsc --noEmit
        working-directory: backend
      - run: npm run build
        working-directory: backend
```
> 배포하지 않고 **빌드·타입체크만** 한다.
> "배포 성공했는데 서비스는 죽어있음"(이번 사고)이 재발하지 않는다.

`scripts/deploy-backend.sh` (신규):
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git pull origin main
cd backend && npm ci && npm run build
pm2 reload golf-backend --update-env
sleep 8
for i in {1..10}; do
  curl -fsS http://localhost:3003/api/health >/dev/null 2>&1 && { echo "✅ 배포 성공"; exit 0; }
  sleep 3
done
echo "❌ 헬스체크 실패"; pm2 logs golf-backend --lines 50 --nostream; exit 1
```
**헬스체크가 핵심이다.** 이번 사고의 교훈은 "배포 성공 ≠ 서비스 정상"이었다.

미사용 secret 정리:
```bash
for s in SERVER_PASSWORD SERVER_HOST SERVER_PORT SERVER_USER PROJECT_PATH; do
  gh secret delete "$s"
done
```
> ⚠️ 백엔드 CI 에 `backend/package-lock.json` 캐시를 쓰므로,
> S3-1 에서 **backend 락파일도 함께 추적**해야 한다.

---

# Part IV. 전체 체크리스트

```
STEP 0  선결 (0.5일)
  □ S0-1  테스트 계정 복구 + CLAUDE.md 정정(계정·서비스명)  ★최우선  30m
  □ S0-2  멈춘 레코드 18건 refresh 회수 + 정리                      1~2h
  □ S0-3  PM2 min_uptime/max_restarts + logrotate + flush(954MB)    30m

STEP 1  백엔드 (2일)
  1-A  응답시간·업로드
  □ S1-1  golf-swing REMO 비동기화                        ★핵심     2h
  □ S1-2  body-posture REMO 4회 비동기화                            3h
  □ S1-3  영상 100MB 상한 + REMO timeout 180s                       1h
  □ S1-4  max_memory_restart 1G→2G                                  30m
  1-B  보안·버그  ─ S1-5·S1-6·S1-9 는 같은 배포에 묶을 것 ★
  □ S1-5  토큰 type 클레임 분리 (하드 컷오버, 사전공지)             2h
  □ S1-6  이미지 가드+소유권+경로봉쇄+mime 화이트리스트             3h
  □ S1-7  CORS 화이트리스트 (CORS_ORIGINS)                          30m
  □ S1-8  dropSchema 제거 / axios deps / https / puppeteer 판단     1h
  □ S1-9  프론트 이미지 blob 로딩 (S1-6 동반 필수)        ★         3h
  □ S1-10 /api/health                                               30m
  □ S1-11 비밀번호 변경 await 누락 수정 (+엔드포인트 판단)          1h
  □ S1-12 REMO 520 을 failed 로 반영 (무한 processing 해소)  ★신규  1h
  □ S1-13 체형 leftSide/back 실패 조사 + uuid 저장 수정      ★신규  2h+

STEP 2  인프라+DB (0.5일)
  □ S2-1  Route53 api-golf.remo.re.kr A → 49.169.8.19               15m
  □ S2-2  nginx vhost(100m/300s) + certbot + preflight 검증         45m
  □ S2-3  golf vhost 타임아웃 보강 (롤백 창구)                      10m
  □ S2-4  DB 자동 백업 cron                                         20m
  □ S2-5  docker-compose.yml (external:true 필수)         ★         1h

STEP 3  Vercel (1일)
  □ S3-1  락파일 커밋 / "latest" 4개 고정 / engines / npm 통일      40m
  □ S3-2  lib/api.ts 절대 URL 전환                                  40m
  □ S3-3  rewrites() 로컬 전용 격리                       ★함정     15m
  □ S3-4  vercel link + env + 프리뷰 배포                           1h
  □ S3-5  프리뷰 전체 플로우 검증                                   1.5h
  □ S3-6  golf.remo.re.kr → CNAME (롤백창구 2주 유지)     ★         30m
  □ S3-7  Backend CI 교체 + deploy-backend.sh + secret 정리         1h
```

---

# Part V. 위험 요소

| # | 위험 | 완화 |
|---|------|------|
| 1 | 🔴 `docker-compose` 볼륨 오설정 → **데이터 소실** | `external: true` + S2-4 백업 선행 + `docker compose config` 사전 확인 |
| 2 | 🔴 S1-6 만 배포 → 체형 이미지 전멸 | **S1-5·S1-6·S1-9 를 한 배포에** |
| 3 | 🟠 S3-6 후 문제 발생 | PM2 `golf-frontend` + nginx vhost **2주 유지** → A 레코드 복귀 5분 |
| 4 | 🟠 토큰 하드 컷오버 → 전원 재로그인 | 사전 공지. 계정 5개라 영향 작음 |
| 5 | 🟠 `rewrites()` 프로덕션 유입 → Vercel 제한 | S3-3 + S3-5 Network 탭 검증 |
| 6 | 🟡 비동기화 중 프로세스 재시작 → `pending` 잔류 | `refresh` 복구 불가. UI 재시도 버튼으로 갈음 |
| 7 | 🟡 S0-1 이 실계정 수정일 가능성 | 진행 전 `id=1 instructor001` 이 테스트 계정인지 확인 |
| 8 | 🟡 백엔드 인터넷 노출 (api-golf) | S1-5~S1-7 완료 **전에는 STEP 2 를 공개하지 말 것** |

---

# Part VI. 범위 밖

| 항목 | 사유 |
|------|------|
| 백엔드 서버리스 이전 | 로컬 파일저장 + `@Cron` + REMO 키 보관 때문에 불가 ([07 §3](./07-deployment-architecture.md)) |
| DB 매니지드 이전 | 4.38MB / 사용자 5명. 비용·작업량 대비 이득 없음 |
| DNS 구 IP 8건 (golf 제외) | 각 프로젝트 담당자 판단. `remobodys`/`scoliosis`/`notebooklm-dev` 는 upstream 부재 |
| 타 서버 이전 도메인의 로컬 인증서 잔재 | 사용자 영향 없음 — 방치 가능 |
| DB 마이그레이션 도입 | 스키마 변경 계획이 생길 때. `CLAUDE.md` C-01 이 트리거 |
| 테스트 코드 작성 | 서비스 중요도 대비 후순위. STEP 완료 후 검토 |
| `chart.tsx` 타입 오류 8건 | 동작 영향 없음. `ignoreBuildErrors` 유지 |
| `CLAUDE.md` 미해결 9건 | 2025-12-11 기준. STEP 0 후 **E2E 재현으로 유효성부터 재판정** |
