# 07. 배포 아키텍처 판정 — Vercel 이전 가능성 분석

**작성일**: 2026-08-26 / **기준 커밋**: `7e34b47`
**전제**: 이 서비스는 메인/주요 서비스가 아님 → 과도한 신중함보다 **빠른 실행** 우선

---

# 결론 3줄

1. **프론트엔드 Vercel 이전 — 가능하다.** 14/14 페이지가 `'use client'` 인 순수 SPA.
2. **30~60초 문제는 Vercel 제약이 아니다.** 브라우저가 백엔드를 직접 호출하면
   Vercel 함수가 경로에 없어 타임아웃이 아예 적용되지 않는다.
   오히려 **지금 nginx 기본 60초에 잘려 나가고 있을 가능성이 높다.**
3. **백엔드 서버는 계속 필요하다.** 로컬 파일시스템 + cron 때문에 서버리스로 못 간다.
   DB는 4.38MB로 작아서 지금 구성 그대로 문제없다.

---

# 1. 30~60초의 정체 — Vercel 이전에 이것부터

## 1-1. 진단: 비동기 설계인데 컨트롤러만 동기다

이 시스템은 **이미 비동기로 설계되어 있다.**

| 구성요소 | 상태 |
|----------|------|
| DB 상태 머신 | `pending → processing → completed \| failed` ✅ 존재 |
| 프론트 폴링 | `pollGolfSwingAnalysis(60회 × 5초 = 최대 5분)` ✅ 존재 |
| 백엔드 컨트롤러 | 🔴 **REMO 호출을 `await` 로 붙잡고 있음** |

`golf-swing.controller.ts:100-132`:

```ts
// 분석 레코드 생성 (status: pending)
const result = await this.uploadSwingVideoUseCase.execute(...);

// 🔴 여기서 30~60초를 붙잡는다
const remoResult = await this.remoApiService.requestGolfSwingAnalysis(
  file.buffer, result.uuid, height || '175',
);
await this.analysisRepository.update(result.analysisId, { status: 'processing', ... });

return { message, analysisId, uuid };   // 응답은 이 3개뿐
```

**응답에 `remoResult` 가 전혀 쓰이지 않는다.** 30~60초를 기다린 결과가
DB 업데이트에만 쓰이고, 클라이언트는 `analysisId` 만 받아 폴링을 시작한다.

즉 **기다릴 이유가 없는데 기다리고 있다.**

## 1-2. 지금 이미 깨지고 있을 가능성

```nginx
# /etc/nginx/sites-available/golf.remo.re.kr — 현재
location / {
    proxy_pass http://localhost:3000;
    # proxy_read_timeout 없음 → nginx 기본값 60초
}
```

분석 요청이 60초를 넘기면 **nginx 가 먼저 연결을 끊는다.**
프론트 axios 는 300초를 기다리도록 설정돼 있지만(`golf-swing.ts:109`) 소용없다.

> 사용자가 말한 "최소 30~60초 이상"은 **정확히 이 경계선**이다.
> 간헐적 업로드 실패가 있었다면 원인이 여기일 가능성이 크다.

## 1-3. 해법 — 컨트롤러를 fire-and-forget 으로

`golf-swing.controller.ts` 수정:

```diff
     // 분석 레코드 생성
     const result = await this.uploadSwingVideoUseCase.execute(
       userId, subjectId, s3Key, url, swingType, height,
     );
 
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
-      await this.analysisRepository.update(result.analysisId, {
-        status: 'failed',
-      });
-    }
+    // REMO 요청은 응답에 필요 없다(클라이언트는 analysisId 로 폴링한다).
+    // await 하면 30~60초를 붙잡아 nginx 기본 타임아웃(60s)에 잘린다.
+    // 백그라운드로 던지고 즉시 응답한다.
+    void this.startRemoAnalysis(result.analysisId, result.uuid, file, height);
 
     return {
       message: '골프 스윙 분석이 시작되었습니다.',
       analysisId: result.analysisId,
       uuid: result.uuid,
     };
   }
+
+  /**
+   * REMO 분석 요청을 백그라운드로 수행한다.
+   * 이 메서드는 절대 throw 하지 않는다. 실패는 DB status 로만 전달된다.
+   */
+  private async startRemoAnalysis(
+    analysisId: number,
+    uuid: string,
+    file: Express.Multer.File,
+    height?: string,
+  ): Promise<void> {
+    try {
+      const remoResult = await this.remoApiService.requestGolfSwingAnalysis(
+        file.buffer, uuid, height || '175',
+      );
+      await this.analysisRepository.update(analysisId, {
+        status: 'processing',
+        waitTime: remoResult.waitTime,
+        creditUsed: remoResult.credit,
+      });
+      this.logger.log(`REMO 분석 요청 성공: uuid=${uuid}, wait=${remoResult.waitTime}s`);
+    } catch (error) {
+      this.logger.error(`REMO 분석 요청 실패: uuid=${uuid} - ${error.message}`);
+      await this.analysisRepository
+        .update(analysisId, { status: 'failed' })
+        .catch((e) => this.logger.error(`status=failed 갱신 실패: ${e.message}`));
+    }
+  }
```

### 효과

| 항목 | 이전 | 이후 |
|------|------|------|
| `POST /analyze` 응답시간 | **30~60초+** | **2~5초** (S3 업로드만) |
| nginx 60초 타임아웃 | 🔴 경계선 | ✅ 무관 |
| Vercel 함수 제한 | (해당없음) | ✅ 무관 |
| 프론트 코드 변경 | — | **불필요** (이미 폴링 중) |

### 주의 2가지

1. **`file.buffer` 수명** — `memoryStorage()` 라 응답 후에도 버퍼가 GC 될 때까지 유지된다.
   백그라운드 작업이 참조를 잡고 있으므로 동작하지만, **메모리 점유가 길어진다.**
   → 영상 상한을 반드시 함께 낮춘다 (아래 §2).
2. **프로세스 재시작 시 유실** — 백그라운드 작업 중 pm2 재시작되면 `pending` 으로 남는다.
   → `POST /analysis/:id/refresh` 엔드포인트가 이미 있으므로 수동 복구 가능.
   완전한 해결은 잡 큐가 필요하지만 **이 규모에서는 과하다.**

## 1-4. 안전망 — nginx 타임아웃

fire-and-forget 을 해도 결과 조회(`GET /analysis/:id`)가 REMO 를 호출할 수 있으므로
타임아웃은 넉넉히 둔다.

```nginx
proxy_read_timeout  300s;
proxy_send_timeout  300s;
proxy_request_buffering off;   # 대용량 업로드를 버퍼링 없이 흘려보냄
```

---

# 2. 영상 상한 확정

| 계층 | 현재 | **확정값** |
|------|------|-----------|
| nginx `client_max_body_size` | 25m | **100m** |
| NestJS `fileSize` | 500MB | **100MB** |
| 프론트 axios timeout | 300s | 120s (비동기화로 짧아도 됨) |
| 백엔드 → REMO axios timeout | 없음 | **180s** |

**100MB 근거**: 파크골프 스윙은 수 초 분량이다. 스마트폰 1080p 기준 10초면 20~40MB.
100MB면 충분하고, `memoryStorage` + base64(×4/3) 기준 피크가
100 + 133 + 133 ≈ **370MB** 로 `max_memory_restart: 1G` 안에 들어온다.

> **이 값이면 `diskStorage` 전환이 필수가 아니다.**
> 500MB를 고집할 때만 스트리밍이 필요했다. 상한을 낮추는 쪽이 훨씬 싸게 먹힌다.
> 원래 계획(Phase 3, 4~6일)이 **반나절 작업으로 줄어든다.**

수정 위치:
- `golf-swing.controller.ts:65` — `fileSize: 100 * 1024 * 1024`
- nginx `api-golf.remo.re.kr` — `client_max_body_size 100m;`
- `remo-api.service.ts:466` — `timeout: 180000`

---

# 3-0. 유저 분석 결과는 어디에 저장되는가 (실측)

"DB나 백엔드가 필요 없는 구조 아닌가"에 대한 답이다. **필요하다.** 근거는 아래 데이터다.

## 저장 위치 3곳

```
사용자 업로드
    │
    ├─[1]─> AWS S3 (sppb-private)          원본 영상
    │        golf-swing/1/1776236784231-..._2026-04-15_160600.mp4
    │
    ├─[2]─> REMO API                        분석 "수행"만. 저장소 아님
    │        └─ 결과를 회신 → 우리가 받아서 [3]에 저장
    │
    └─[3]─> MySQL golf_swing_db (4.38MB / 14테이블)   ★ 결과의 실제 보관처
             └─ 로컬 backend/results/       REMO 생성 결과 이미지 (26개 / 5.5MB)
```

## [3] MySQL 이 담고 있는 것 — 이게 서비스의 자산이다

| 테이블 | 컬럼 수 | 내용 |
|--------|--------|------|
| **`golf_swing_results`** | **99** | 스윙 구간별 지표 + 점수 + 코멘트 |
| `body_posture_analyses` | 23 | 체형분석 세션 (4방향 이미지 URL·상태·uuid) |
| `back/front_posture_results` | 각 20 | 체형 방향별 결과 |
| `golf_swing_types` | 20 | 8단계 구간 프레임 (address~finish) |
| `users` / `subjects` | 19 / 14 | 강사 / 대상자 |
| `golf_swing_analyses` | 16 | 스윙 분석 세션 헤더 |
| 나머지 7개 | | 센터·관리자·각도·공지 |

`golf_swing_results` 99컬럼의 실제 저장값 (analysis_id=91, 홍길동):
```
address_shoulder_tilt        : 4.021     address_shoulder_tilt_score : 80
address_stance               : 1.409     address_stance_score        : 96
impact_head_location         : -0.297    impact_head_location_score  : 99
address_shoulder_tilt_ment   : "<코멘트 텍스트>"
```
구간(address/takeback/backswing/top/downswing/impact/followthrough/finish) ×
지표 × (**측정값 · 점수 · 코멘트**) 3종이 정규화되어 들어간다.

**현재 보유량**: 스윙분석 91건 · 체형분석 40건 · 대상자 14명 · 강사 5명

## REMO 는 저장소가 아니다 — 증거

멈춰 있는 레코드가 **이것을 실증한다.**

```
golf_swing_analyses : processing 14건  (2026-02 ~ 2026-05)
  id 96,95  2026-05-17   credit_used 99996
  id 73,72  2026-03-20   credit_used 100004
```

REMO 에 요청은 갔고 **크레딧도 차감됐는데 결과를 못 받아왔다.**
우리 DB 에 저장되지 못한 분석은 **사실상 소실**된 것이다.

> 즉 REMO 는 "분석해서 돌려주는 엔진"이고, **결과를 계속 보관해 주지 않는다.**
> 받아서 우리 DB 에 넣는 순간이 곧 영속화 시점이다. DB 없이는 서비스가 성립하지 않는다.

## Vercel 에 "그냥 올릴 수 없는" 이유

| 필요 기능 | Vercel 정적/서버리스로 가능? |
|-----------|------------------------------|
| 분석결과 99컬럼 영속 저장 | ❌ Vercel 에 DB 없음 (Postgres·Neon 등 **별도 유료 서비스** 필요) |
| 결과 이미지 파일 저장 (`results/` 5.5MB) | ❌ 서버리스는 영속 디스크 없음 (Blob 스토리지 별도) |
| 일일 파일정리 `@Cron` | ❌ 상주 프로세스 필요 |
| **REMO API 키 보관** | ❌ 프론트에 두면 **키가 브라우저에 노출**된다 |
| 30~60초 분석 요청 | 🟡 Hobby 60s / Pro 300s 제한 |
| MySQL 커넥션 | ❌ 서버리스는 커넥션 풀 관리가 취약 |

**특히 REMO API 키가 결정적이다.** 백엔드가 없으면 브라우저가 REMO 를 직접 호출해야 하고,
그러면 `APIKey`·`userKey` 가 개발자도구에 그대로 노출된다. 크레딧이 과금되는 API 이므로
**그 자체로 금전 피해**가 된다.

## 결론

| 계층 | 어디로 | 이유 |
|------|--------|------|
| **프론트엔드** | ✅ **Vercel 로 이전 가능** | 14/14 페이지 `'use client'` 순수 SPA. 서버 로직 없음 |
| **백엔드 (NestJS)** | ❌ **현 서버 유지** | REMO 키 보관 · 로컬 파일 · cron · DB 커넥션 |
| **MySQL** | ❌ **현 서버 유지** | 4.38MB 소규모. 매니지드 이전 이득 없음 |
| **원본 영상** | ✅ 이미 S3 | 그대로 |

**"프론트만 Vercel, 백엔드+DB 는 서버 유지"** 가 이 시스템에 맞는 구성이다.

## 참고 — 정말 서버를 없애려면 (권장하지 않음)

| 현재 | 대체 | 비용/작업 |
|------|------|-----------|
| MySQL (로컬) | Neon / PlanetScale / RDS | 유료 + 마이그레이션 |
| 로컬 `results/` | Vercel Blob / S3 | 코드 수정 (`local-storage.service` 전면 교체) |
| `@Cron` | Vercel Cron | 재작성 |
| NestJS 상주 | Vercel Functions | **30~60초 요청이 Pro(300s) 필요**, 콜드스타트 |
| 30~60초 동기 | 큐 + 워커 (SQS/Inngest) | 아키텍처 재설계 |

4.38MB DB 에 사용자 5명인 서비스에 이 비용과 작업량은 **명백히 과하다.**
현 서버는 이미 다른 8개 프로젝트를 돌리고 있어 한계비용이 사실상 0 이다.


---

# 3. 백엔드 서버가 필요한가 — 필요하다

서버리스(Vercel Functions 등)로 옮길 수 있는지 실측 판정:

| 요소 | 현황 | 서버리스 가능? |
|------|------|---------------|
| **로컬 파일 저장** | `body-posture.controller.ts:346` 에서 `saveResultImages()` **실사용**. `backend/results/` 5.5MB | ❌ **불가**. 서버리스는 영속 디스크가 없다 |
| **파일 서빙** | `body-posture.controller.ts:438` `getFile()` **실사용** | ❌ 위와 동일 |
| **cron 스케줄러** | `local-storage.service.ts:286` `@Cron(EVERY_DAY_AT_MIDNIGHT)` 파일 정리 | ❌ 상주 프로세스 필요 |
| **MySQL 연결** | 로컬 도커, NAT 뒤 | ❌ 외부에서 도달 불가 + 서버리스 커넥션 풀 문제 |
| **장시간 REMO 호출** | 30~60초 | 🟡 §1-3 비동기화로 해소되나, 백그라운드 작업은 상주 프로세스가 필요 |
| **puppeteer (PDF)** | 결과서 렌더링에 사용 (2026-08-27 배선 완료) | — 시스템 크롬 사용 |

**결론: 백엔드는 이 서버에 그대로 둔다.** 로컬 파일 + cron 두 가지만으로도 결론이 난다.

## 덤 — puppeteer (2026-08-27 갱신)

> 아래 진단은 **2026-08-26 기준**이었고, 다음 날 해소됐다.
>
> ~~`PdfGenerationService` 가 provider 로 등록돼 있지만 어떤 컨트롤러도 주입받지 않는다.
> 기능 계획이 없다면 제거해서 `npm ci` 시간과 디스크를 절약할 수 있다.~~

**제거가 아니라 완성으로 결론**났다. 프론트에 이미 "결과서 다운로드 (PDF)" 버튼이
있었고(동작은 `alert()` 뿐이었다), 백엔드 서비스도 있었다. 빠진 건 둘을 잇는 배선뿐이었다.

Chromium 300MB 동반 문제는 **시스템에 설치된 크롬을 쓰도록** 바꿔 해소했다.

```
backend/.env             PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
backend/.puppeteerrc.cjs  skipDownload: true
```

`npm ci` 는 더 이상 Chromium 을 받지 않는다. 크롬이 없는 환경에 배포한다면
두 설정을 비워야 puppeteer 가 번들 크롬을 내려받는다.

상세: `docs/09-api-reference.md` §2-6

---

# 4. DB 구성 진단 — 문제없다

| 항목 | 값 | 평가 |
|------|-----|------|
| 엔진 | MySQL 8.0.44 (Docker `golf_mysql`) | ✅ |
| 데이터 크기 | **4.38MB** / 14 테이블 | ✅ 매우 작다 |
| 레코드 | 강사 5 · 대상자 14 · 스윙분석 91 · 체형분석 40 | ✅ |
| 재시작 정책 | `unless-stopped` (2026-08-26 조치) | ✅ |
| 백업 | `~/backups/golf_swing_db_20260826_1629.sql` (891KB) | 🟡 **수동 1회뿐** |
| 접근 범위 | `0.0.0.0:3306` 바인딩이나 NAT 로 외부 차단 | ✅ |
| 마이그레이션 | **0건**, 프로덕션 `synchronize:false` | 🔴 스키마 변경 경로 없음 |
| 구성 코드화 | `docker-compose.yml` 없음 (`docker run` 임의 생성) | 🟠 재현 불가 |

## 조치할 것 2가지 (둘 다 가볍다)

### 4-1. 자동 백업 — cron 3줄

```bash
mkdir -p ~/backups/golf-db
crontab -e
```
```cron
0 4 * * * docker exec golf_mysql mysqldump -ugolf_swing_user -p'<비번>' --single-transaction golf_swing_db 2>/dev/null | gzip > ~/backups/golf-db/golf_$(date +\%Y\%m\%d).sql.gz && find ~/backups/golf-db -name '*.sql.gz' -mtime +30 -delete
```
4.38MB DB라 gzip 하면 하루치가 수백 KB다. 30일 보관해도 부담이 없다.

### 4-2. `docker-compose.yml` 로 구성 코드화

현재 `golf_mysql` 은 `docker run` 으로 만들어져 **파라미터가 어디에도 기록돼 있지 않다.**
컨테이너를 잃으면 재현할 방법이 없다.

`docker-compose.yml` (프로젝트 루트, 신규):
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: golf_mysql
    restart: unless-stopped          # ← 이번 사고의 직접 원인이었던 항목
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
> ⚠️ `external: true` 로 **기존 볼륨을 그대로 물린다.** 새로 만들면 데이터가 날아간다.
> 적용 전 `docker compose config` 로 확인하고, 백업(§4-1) 후 진행할 것.

**DB를 매니지드로 옮길 필요는 없다.** 4.38MB에 사용자 5명이면 지금 구성이 적정하다.

---

# 5. 목표 아키텍처

```
                          ┌──────────────────────────────┐
   브라우저 ──────────────>│ Vercel (정적 SPA)             │
        │                 │ golf.remo.re.kr → CNAME       │
        │                 │ git push 시 자동 배포          │
        │                 └──────────────────────────────┘
        │
        │  API 호출은 Vercel 을 거치지 않고 직접 간다
        │  → Vercel 함수 타임아웃(60s/300s) 적용 대상 자체가 아님
        ▼
   ┌──────────────────────────────────────────────────┐
   │ api-golf.remo.re.kr  (49.169.8.19)                │
   │   nginx  client_max_body_size 100m                │
   │          proxy_read_timeout 300s                  │
   │            ↓                                      │
   │   NestJS :3003  ── POST /analyze → 2~5초 즉시응답  │
   │            │      └─ 백그라운드 → REMO API         │
   │            ├─> MySQL :3306  (4.38MB)              │
   │            ├─> 로컬 results/ (5.5MB) + 일일 cron   │
   │            └─> AWS S3 (영상)                       │
   └──────────────────────────────────────────────────┘
```

## 🔴 Vercel 이전의 단 하나의 함정

**`next.config.mjs` 의 `rewrites()` 를 프로덕션 경로로 쓰면 안 된다.**

```js
// 이대로 두고 클라이언트가 '/backend-api' 를 호출하면
// → 요청이 Vercel 엣지를 경유 → Vercel 함수 타임아웃/바디제한에 걸림
async rewrites() {
  return [{ source: '/backend-api/:path*', destination: 'http://localhost:3003/api/:path*' }]
}
```

`rewrites` 는 **로컬 개발 전용**으로만 남기고, 프로덕션에서는
`NEXT_PUBLIC_API_BASE_URL=https://api-golf.remo.re.kr/api` 로 **절대 URL 직접 호출**한다.

이것만 지키면 30~60초든 100MB 업로드든 Vercel 과 무관하다.
(참고: `destination` 이 `localhost:3003` 이라 Vercel 에서는 어차피 동작하지 않는다.)

---

# 6. 개정 실행 플랜 — 3단계

> [06-execution-plan.md](./06-execution-plan.md) 의 7단계를 이 서비스의 중요도에 맞춰 압축했다.
> 06번 문서의 상세 diff 는 그대로 유효하며, 여기서는 **순서와 범위만 재조정**한다.

## STEP 1 — 백엔드 정리 (1~2일)

| # | 작업 | 근거 | 소요 |
|---|------|------|------|
| 1 | **`POST /analyze` 비동기화** | §1-3. 30~60초 문제의 근본 해결 | 2h |
| 2 | **영상 상한 100MB 확정** (nginx/NestJS/axios) | §2. `diskStorage` 불필요해짐 | 1h |
| 3 | REMO axios `timeout: 180000` | 무한 대기 차단 | 10m |
| 4 | **토큰 `type` 클레임 분리** + 하드 컷오버 | 06-1-1. 계정 5개라 부담 없음 | 2h |
| 5 | **이미지 엔드포인트 가드 + 경로 봉쇄** | 06-1-2. 백엔드 노출 전 필수 | 3h |
| 6 | CORS 화이트리스트 | 06-1-3 | 30m |
| 7 | `dropSchema` 제거 / `axios` → dependencies | 06-1-4, 06-1-5 | 20m |
| 8 | `/api/health` 엔드포인트 | 06-6-1 | 30m |
| 9 | PM2 `min_uptime`/`max_restarts` + logrotate | 06-0 | 30m |

> ⚠️ **4번과 5번은 프론트 수정과 같은 배포에 묶어야 한다.**
> 이미지에 인증이 걸리면 `<img src>` 가 헤더를 못 보내 전부 깨진다.
> `body-analysis-result/page.tsx` 의 `getImageUrl` 8곳을
> axios blob (`responseType:'blob'` → `URL.createObjectURL`) 방식으로 바꾼다.
> `useEffect` 정리에서 `revokeObjectURL` 필수.

## STEP 2 — 인프라 + DB (반나절)

| # | 작업 | 소요 |
|---|------|------|
| 1 | Route53 `api-golf.remo.re.kr` A → `49.169.8.19` | 10m |
| 2 | nginx vhost 신규 (`100m` / `300s`) + certbot | 30m |
| 3 | DB 자동 백업 cron | 15m |
| 4 | `docker-compose.yml` 작성 (`external: true` 주의) | 1h |
| 5 | 기존 `golf.remo.re.kr` vhost 에 타임아웃 보강 (롤백 대비) | 10m |

**검증**: `curl https://api-golf.remo.re.kr/api/health` → `{"status":"ok","db":"up"}`

## STEP 3 — Vercel 이전 (1일)

| # | 작업 | 소요 |
|---|------|------|
| 1 | **`.gitignore` 락파일 제외 해제 + 커밋** | 10m |
| 2 | `"latest"` 의존성 4개 버전 고정, npm 통일 | 30m |
| 3 | `lib/api.ts` — `getApiBaseUrl` 절대 URL, `getImageUrl` 동반 수정 | 30m |
| 4 | `rewrites()` 를 로컬 전용으로 격리 (프로덕션 미사용 확인) | 10m |
| 5 | `vercel link` → env 설정 → **프리뷰 배포** | 1h |
| 6 | 프리뷰에서 전체 플로우 검증 | 1h |
| 7 | `golf.remo.re.kr` → CNAME `cname.vercel-dns.com` | 10m |
| 8 | GitHub Actions → Backend CI 로 교체, SSH secret 삭제 | 30m |

**롤백 창구**: `golf-frontend` PM2 + nginx vhost 를 **2주 유지**.
문제 시 A 레코드 `49.169.8.19` 복귀로 5분 내 복구.

### STEP 3 검증 시나리오
```
로그인 → 회원목록 → 회원상세
→ 스윙 업로드(50MB 영상) → 응답 5초 내 오는지 확인 ★
→ 분석대기 폴링 → 결과 → 구간이미지
→ 체형 업로드 → 결과 → 이미지 4방향 (blob 로딩) ★
브라우저 콘솔 CORS 에러 0건 / Network 탭 요청이 api-golf 로 가는지
```

---

# 7. 이번 판정에서 바뀐 것 (06번 대비)

| 항목 | 06번 원안 | **07번 개정** | 이유 |
|------|-----------|--------------|------|
| 영상 상한 | 200MB | **100MB** | 파크골프 스윙은 짧다. 100MB면 메모리 피크 370MB로 안전 |
| `diskStorage` 전환 | 필수 (4~6일) | **불필요** | 상한을 낮추면 `memoryStorage` 로 충분 |
| 스트리밍 base64 | 필수 | **불필요** | 위와 동일 |
| 30~60초 대응 | nginx 타임아웃 상향 | **컨트롤러 비동기화 + 타임아웃 상향** | 근본 원인이 불필요한 `await` 였음 |
| 전체 소요 | 12~18일 | **3~4일** | 서비스 중요도에 맞춰 압축 |
| Phase 수 | 7 | **3** | 〃 |

**변하지 않은 것**: 보안 P0 2건은 그대로 STEP 1 에 남긴다.
백엔드를 인터넷에 노출하는 이상 이건 타협 대상이 아니다.
다만 06번의 "3~5일"을 **5시간**으로 잡았다 — 수정 자체는 작고, 검증만 하면 된다.
