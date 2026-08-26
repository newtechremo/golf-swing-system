# 06. 작업 실행 플랜 (Phase 0 ~ 6)

**작성일**: 2026-08-26 / **기준 커밋**: `7e34b47`
**근거 문서**: [03-issue-analysis](./03-issue-analysis.md) · [05-integration-status](./05-integration-status.md)

> 이 문서는 **분석 결과를 실행 가능한 단위로 분해한 작업 지시서**다.
> 각 Phase 는 `선행조건 → 작업(파일:라인 + 실제 diff) → 검증 → 롤백` 구조를 따른다.

---

## 전체 로드맵

```
Phase 0  즉시 안정화              30분   무위험    ← 지금 바로
Phase 1  보안 결함 수정 (P0)      3~5일  중        ← Vercel 전 필수
Phase 2  인프라 재구성 (nginx)    1일    중
Phase 3  업로드 파이프라인        4~6일  높음
Phase 4  Vercel 프론트 이전       2~3일  중
Phase 5  배포 파이프라인 정리     1일    낮음
Phase 6  운영 기반 구축           지속   낮음
```

### 의존 관계 (순서를 바꾸면 안 되는 지점)

```
Phase 0 ──┬─> Phase 1 ─────> Phase 2 ─┬─> Phase 4 ─> Phase 5
          │   (보안)          (nginx)  │   (Vercel)
          └─> Phase 6 (병행 가능)      │
                                       └─> Phase 3 (업로드)
```

**절대 규칙 3가지**

| # | 규칙 | 이유 |
|---|------|------|
| 1 | **Phase 1 완료 전 Phase 4 금지** | Vercel 이전 = 백엔드 인터넷 직접 노출. 지금 백엔드는 Next rewrites 뒤에 가려져 있으나 그 방패가 사라진다. P0-2/P0-3 이 노출된 채 공개되면 실제 피해로 직결 |
| 2 | **nginx `client_max_body_size` 단독 상향 금지** | 현재 25m 제한이 P1-5(500MB 메모리 적재 → 피크 ~1.8GB > `max_memory_restart 1G`)를 우연히 막고 있다. nginx만 올리면 **즉시 OOM 크래시** |
| 3 | **Phase 4 전 락파일 커밋 필수** | `.gitignore` 가 `package-lock.json` 을 제외 중 + `package.json` 에 `"latest"` 의존성 3개 → Vercel 빌드가 **비결정적** |

---

# Phase 0 — 즉시 안정화

**목표**: 크래시 재발 시 폭주 차단 + 디스크 954MB 회수
**소요**: 30분 / **위험도**: 없음 / **선행조건**: 없음

## 0-1. PM2 재시작 폭주 방지

**파일**: `ecosystem.config.js`

```diff
     {
       name: 'golf-backend',
       cwd: './backend',
       script: 'dist/main.js',
       instances: 1,
       exec_mode: 'fork',
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
+      // 10초 이상 살아야 "정상 기동"으로 인정. 연속 15회 실패 시 errored 로 정지.
+      // DB 장애 시 49,368회 재시작 + 로그 954MB 폭주가 재발하지 않도록 방지.
+      min_uptime: 10000,
+      max_restarts: 15,
+      restart_delay: 5000,
       env: {
```

`golf-frontend` 에도 동일 3줄 추가.

**적용·검증**
```bash
pm2 reload ecosystem.config.js --env production && pm2 save
pm2 describe golf-backend | grep -E "min uptime|max restarts|restart delay"
```

**롤백**: `~/backups/golf-config-20260826/ecosystem.config.js` 복원 후 `pm2 reload`

## 0-2. 로그 로테이션 + 크래시 로그 정리

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

du -sh backend/logs/            # 정리 전 (약 954MB)
pm2 flush golf-backend
du -sh backend/logs/            # 정리 후
```

**검증**: `pm2 conf pm2-logrotate` 로 설정 반영 확인, `df -h /` 로 여유공간 증가 확인

## 0-3. 문서 정합성 정정

| 파일 | 수정 |
|------|------|
| `CLAUDE.md` §4 테스트 계정 | `instructor001@golf.com` → **DB에 없음**. 실제는 `test@example.com` (username `instructor001`). 비밀번호도 `Test1234!` 불일치 → 정확한 값으로 갱신하거나 계정 재발급 |
| `CLAUDE.md` / `README.md` | 서비스명이 "골프"가 아니라 **파크골프(ParkGolf AI Pro)** (`frontend/app/layout.tsx:12`) |
| `CURRENT_STATUS.md` | 2025-12-11 / 브랜치 `feature/controllers` 기준 → `main` / 현재 상태로 갱신 |

---

# Phase 1 — 보안 결함 수정 (P0)

**목표**: 백엔드를 인터넷에 노출해도 안전한 상태로 만든다
**소요**: 3~5일 / **위험도**: 중 (전 사용자 재로그인 발생) / **선행조건**: Phase 0

## 1-1. P0-2 · Refresh Token 을 Access Token 과 분리

### 문제
동일 시크릿·동일 payload로 서명되고 만료시간만 다르다. `JwtAuthGuard` 가 종류를 구분하지 않아
**refreshToken 을 Bearer 로 보내면 7일짜리 액세스 권한**이 된다.

### 수정 ①  `backend/src/application/use-cases/auth/LoginUserUseCase.ts:82-93`

```diff
   private generateTokens(userId: number): {
     accessToken: string;
     refreshToken: string;
   } {
-    const payload = { sub: userId, role: 'instructor' };
-
-    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
-    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
-
-    return {
-      accessToken,
-      refreshToken,
-    };
+    const base = { sub: userId, role: 'instructor' };
+
+    // type 클레임으로 토큰 용도를 구분한다.
+    // 이것이 없으면 refreshToken 이 accessToken 으로 그대로 통용된다.
+    return {
+      accessToken: this.jwtService.sign(
+        { ...base, type: 'access' },
+        { expiresIn: '1h' },
+      ),
+      refreshToken: this.jwtService.sign(
+        { ...base, type: 'refresh' },
+        { expiresIn: '7d' },
+      ),
+    };
   }
```

### 수정 ②  `backend/src/presentation/guards/jwt-auth.guard.ts:24`

```diff
     try {
       const payload = this.jwtService.verify(token);
+
+      // access 토큰만 허용. refresh 토큰으로 보호 API 를 호출하는 경로를 차단한다.
+      if (payload.type !== 'access') {
+        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
+      }
+
       request.user = payload;
       return true;
     } catch (error) {
       throw new UnauthorizedException('유효하지 않은 토큰입니다.');
     }
```

### 수정 ③  `backend/src/application/use-cases/auth/RefreshTokenUseCase.ts`

```diff
     try {
       // Refresh Token 검증
       const payload = this.jwtService.verify(refreshToken);
 
+      // refresh 토큰만 허용. accessToken 으로 무한 갱신하는 경로를 차단한다.
+      if (payload.type !== 'refresh') {
+        throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
+      }
+
       // 새로운 Access Token 생성
       const newAccessToken = this.jwtService.sign(
-        { sub: payload.sub, role: payload.role },
+        { sub: payload.sub, role: payload.role, type: 'access' },
         { expiresIn: '1h' },
       );
```

### 배포 전략 — **하드 컷오버 권장**

기존 토큰에는 `type` 이 없으므로 배포 즉시 전부 무효화된다.

| 방식 | 내용 | 판단 |
|------|------|------|
| **하드 컷오버** | 배포 즉시 전원 재로그인 | ✅ **권장**. 강사 계정이 5개뿐이고, 취약점이 수개월 노출된 상태라 유예를 둘 이유가 없다 |
| 하위호환 유예 | `if (payload.type && payload.type !== 'access')` 로 구 토큰 허용 후 7일 뒤 제거 | 유예 기간 동안 **취약점이 그대로 유지**된다. 사용자가 많을 때만 고려 |

**공지 문구 예시**: "보안 강화 작업으로 YYYY-MM-DD HH:MM 에 전체 재로그인이 필요합니다."

### 후속 (선택, Phase 6)
- `JWT_REFRESH_SECRET` 분리
- refresh 토큰 DB 저장 + 회전(rotation) + 로그아웃 시 폐기
  (현재는 로그아웃해도 기존 refreshToken 이 7일간 유효하다)

## 1-2. P0-3 · 이미지 서빙 엔드포인트 봉쇄

### 문제 3중
1. `@Get('images/*')` 만 가드 누락 → **미인증 조회 가능**
2. `path.join()` 정규화 검증 없음 → **경로 탐색**으로 `backend/.env` (JWT_SECRET·DB비번·AWS키·REMO키) 노출 가능
3. mimeType 이 화이트리스트가 아니라 폴백 → 이미지 아닌 파일도 응답

### 수정 ①  `backend/src/presentation/controllers/body-posture.controller.ts:429`

```diff
   @Get('images/*')
+  @UseGuards(JwtAuthGuard)
   async getImage(@Request() req, @Response() res, @Param() params: any) {
     // 와일드카드 경로 추출
     const imagePath = params['0'] || params[0] || '';
 
     if (!imagePath) {
       throw new NotFoundException('이미지 경로가 필요합니다.');
     }
 
+    // 소유권 검증.
+    // 저장 경로 규약: `{folder}/{userId}/{file}` 또는 `results/{folder}/{userId}/{file}`
+    // (local-storage.service.ts 의 saveFile/saveResultFile 참조)
+    const segments = imagePath.split('/').filter(Boolean);
+    const ownerIdx = segments[0] === 'results' ? 2 : 1;
+    const ownerId = Number(segments[ownerIdx]);
+
+    if (!Number.isInteger(ownerId) || ownerId !== req.user.sub) {
+      throw new ForbiddenException('접근 권한이 없습니다.');
+    }
+
     const file = await this.localStorageService.getFile(imagePath);
```

`ForbiddenException` 을 `@nestjs/common` import 에 추가한다.

### 수정 ②  `backend/src/infrastructure/external-services/local-storage.service.ts:223-260`

```diff
   async getFile(relativePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
     try {
-      let absolutePath: string;
-
-      // results/ 접두사가 있으면 resultsDir 사용, 없으면 uploadDir 사용
-      if (relativePath.startsWith('results/') || relativePath.startsWith('results\\')) {
-        const cleanPath = relativePath.replace(/^results[\/\\]/, '');
-        absolutePath = path.join(this.resultsDir, cleanPath);
-      } else {
-        absolutePath = path.join(this.uploadDir, relativePath);
-      }
+      const isResult = /^results[\/\\]/.test(relativePath);
+      const baseDir = isResult ? this.resultsDir : this.uploadDir;
+      const rel = isResult
+        ? relativePath.replace(/^results[\/\\]/, '')
+        : relativePath;
+
+      // path.join 은 '..' 를 해석해 상위 디렉터리로 이동시킨다(차단하지 않는다).
+      // resolve 후 baseDir 접두사를 검증해 봉쇄한다.
+      const absolutePath = path.resolve(baseDir, rel);
+      const baseResolved = path.resolve(baseDir);
+
+      if (
+        absolutePath !== baseResolved &&
+        !absolutePath.startsWith(baseResolved + path.sep)
+      ) {
+        this.logger.warn(`Path traversal blocked: ${relativePath}`);
+        return null;
+      }
 
       if (!fs.existsSync(absolutePath)) {
         this.logger.warn(`File not found: ${relativePath}`);
         return null;
       }
 
-      const buffer = await fs.promises.readFile(absolutePath);
-      const ext = path.extname(relativePath).toLowerCase();
+      const ext = path.extname(absolutePath).toLowerCase();
 
       const mimeTypes: Record<string, string> = {
         '.jpg': 'image/jpeg',
         '.jpeg': 'image/jpeg',
         '.png': 'image/png',
         '.gif': 'image/gif',
         '.webp': 'image/webp',
         '.mp4': 'video/mp4',
         '.mov': 'video/quicktime',
       };
 
-      return {
-        buffer,
-        mimeType: mimeTypes[ext] || 'application/octet-stream',
-      };
+      // 화이트리스트. 폴백(application/octet-stream)을 두면 임의 파일이 그대로 응답된다.
+      if (!mimeTypes[ext]) {
+        this.logger.warn(`Disallowed file type: ${ext}`);
+        return null;
+      }
+
+      return {
+        buffer: await fs.promises.readFile(absolutePath),
+        mimeType: mimeTypes[ext],
+      };
     } catch (error) {
```

> `deleteFile()` (line 268) 도 동일하게 `path.join(this.uploadDir, relativePath)` 를 쓴다.
> 현재는 외부 입력이 직접 닿지 않으나 **같은 방식으로 봉쇄해 둘 것**.

### 수정 ③ (구조 개선) 가드 방식 통일

`body-posture.controller.ts` 만 메서드별 가드라 누락이 발생했다.
`golf-swing`(line 36) · `subject`(line 27) 처럼 **클래스 레벨**로 통일한다.

```diff
 @Controller('body-posture')
+@UseGuards(JwtAuthGuard)
 export class BodyPostureController {
```
각 메서드의 개별 `@UseGuards(JwtAuthGuard)` 는 제거(중복 무해하나 정리).
공개가 필요한 엔드포인트가 생기면 `@Public()` 데코레이터 + 글로벌 가드 패턴으로 예외 처리.

## 1-3. CORS 화이트리스트

**파일**: `backend/src/main.ts:18-23`

```diff
+  // 허용 origin 을 환경변수로 제한한다.
+  // Vercel 이전 후 백엔드가 인터넷에 직접 노출되므로 반드시 좁혀야 한다.
+  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
+    .split(',')
+    .map((s) => s.trim())
+    .filter(Boolean);
+
   app.enableCors({
-    origin: true, // 모든 origin 허용
+    origin: corsOrigins.length > 0 ? corsOrigins : true,
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
   });
```

`backend/.env` 에 추가:
```
CORS_ORIGINS=https://golf.remo.re.kr,http://localhost:3000
```
Phase 4 완료 후 Vercel 프리뷰 도메인(`https://*.vercel.app`)이 필요하면
정규식 매칭 함수 형태로 확장한다.

## 1-4. P2-2 · `dropSchema` 제거

**파일**: `backend/src/app.module.ts:109-110`

```diff
-        // WARNING: dropSchema will delete all data! Remove after first run.
-        dropSchema: configService.get('DB_DROP_SCHEMA') === 'true',
         synchronize: configService.get('NODE_ENV') !== 'production',
```

환경변수 하나(`DB_DROP_SCHEMA=true`)로 전체 데이터가 삭제되는 경로를 제거한다.
`backend/.env` 에 해당 키가 있으면 함께 삭제.

## 1-5. P3-3 · `axios` 의존성 위치 교정

```bash
cd backend && npm install --save axios
```
`remo-api.service.ts` 가 런타임에 import 하는데 `devDependencies` 에 있다.
`npm ci --omit=dev` 로 바뀌는 순간 `MODULE_NOT_FOUND` 로 크래시한다.

## Phase 1 검증

```bash
cd backend && npm run build && pm2 restart golf-backend

# ① refresh 토큰으로 보호 API 호출 → 401 이어야 함
RT=$(curl -s -X POST localhost:3003/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"<실제이메일>","password":"<비번>"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['refreshToken'])")
curl -o /dev/null -w "refresh로 subjects: %{http_code} (401 기대)\n" \
  -H "Authorization: Bearer $RT" localhost:3003/api/subjects

# ② access 토큰으로 refresh 호출 → 401 이어야 함
# ③ 정상 흐름: access로 subjects → 200, refresh로 /auth/refresh → 200

# ④ 이미지 엔드포인트 미인증 접근 → 401
curl -o /dev/null -w "미인증 이미지: %{http_code} (401 기대)\n" \
  "localhost:3003/api/body-posture/images/posture/1/x.jpg"

# ⑤ 경로 탐색 차단 (--path-as-is 로 정규화 우회 시도)
curl -o /dev/null -w "traversal: %{http_code} (404/403 기대, 200 절대 불가)\n" \
  --path-as-is -H "Authorization: Bearer $AT" \
  "localhost:3003/api/body-posture/images/../../.env"

# ⑥ 타 강사 이미지 접근 → 403
```

**롤백**: `git revert` 후 `npm run build && pm2 restart golf-backend`

---

# Phase 2 — 인프라 재구성 (nginx)

**목표**: API 를 Next.js rewrites 의존에서 분리하고 Vercel 이전 기반을 만든다
**소요**: 1일 / **위험도**: 중 (서비스 중단 수 초) / **선행조건**: Phase 1

## 2-1. 현재 구조의 문제

```
[현재]  golf.remo.re.kr → nginx → :3000 Next.js → rewrites → :3003 NestJS
                                     ↑ 프론트가 죽으면 API 도 죽는다
[목표]  golf.remo.re.kr     → nginx → :3000 Next.js
        api-golf.remo.re.kr → nginx → :3003 NestJS   (독립)
```

같은 서버의 `finefit-simpro.remo.re.kr` 이 이미 검증된 패턴을 쓴다
(`location /api/v1/` → 백엔드, `location /` → 프론트, `210m`, `3600s`).

## 2-2. Route 53 · `api-golf.remo.re.kr` A 레코드 생성

```json
{
  "Comment": "Expose golf backend API on its own subdomain (Vercel migration prep)",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api-golf.remo.re.kr.",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{ "Value": "49.169.8.19" }]
    }
  }]
}
```
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0575940EHXG9YRNO7QK \
  --profile remo-aws --change-batch file://api-golf-dns.json
dig +short @8.8.8.8 api-golf.remo.re.kr    # → 49.169.8.19
```

## 2-3. nginx vhost 신규 — `/etc/nginx/sites-available/api-golf.remo.re.kr`

```nginx
server {
    server_name api-golf.remo.re.kr;

    # ⚠️ Phase 3 완료 전까지 25m 유지 (절대규칙 #2 참조)
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 대용량 업로드 + REMO 분석 대기를 위한 여유
        proxy_request_buffering off;
        proxy_read_timeout  300s;
        proxy_send_timeout  300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api-golf.remo.re.kr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api-golf.remo.re.kr     # 인증서 발급 (DNS 전파 후)
```

## 2-4. golf.remo.re.kr vhost 타임아웃 보강

Vercel 이전 전까지는 기존 경로도 살아 있어야 한다.

```diff
 server {
     server_name golf.remo.re.kr;
     client_max_body_size 25m;
 
     location / {
         proxy_pass http://localhost:3000;
         proxy_http_version 1.1;
         ...
+        proxy_read_timeout 300s;
+        proxy_send_timeout 300s;
     }
```

## Phase 2 검증

```bash
curl -o /dev/null -w "api-golf 미인증: %{http_code} (401 기대)\n" https://api-golf.remo.re.kr/api/subjects
curl -o /dev/null -w "golf 프론트: %{http_code} (200 기대)\n"      https://golf.remo.re.kr/login
curl -o /dev/null -w "기존 프록시: %{http_code} (401 기대)\n"      https://golf.remo.re.kr/backend-api/subjects
echo | openssl s_client -connect api-golf.remo.re.kr:443 -servername api-golf.remo.re.kr 2>/dev/null | openssl x509 -noout -dates
```

**롤백**: `sudo rm /etc/nginx/sites-enabled/api-golf.remo.re.kr && sudo nginx -t && sudo systemctl reload nginx`

---

# Phase 3 — 업로드 파이프라인 정합화

**목표**: 스윙 영상 업로드를 실제로 동작시킨다 (현재 25MB 초과 시 413)
**소요**: 4~6일 / **위험도**: **높음** / **선행조건**: Phase 2

> 🔴 **절대규칙 #2**: 반드시 3-1 → 3-2 → 3-3 순서. nginx 를 먼저 올리면 OOM 크래시.

## 3-1. 메모리 적재 제거 (P1-5)

### 현재 위험
| 단계 | 크기 (500MB 영상) |
|------|------------------|
| Multer memoryStorage 버퍼 | 500MB |
| `toString('base64')` (×4/3) | ~667MB |
| axios JSON 직렬화 사본 | ~667MB |
| **동시 피크** | **~1.8GB** > `max_memory_restart: 1G` |

**단일 요청으로 프로세스가 강제 재시작**되고, 동시 업로드 중인 다른 사용자 요청까지 끊긴다.

### 수정 ①  `backend/src/presentation/controllers/golf-swing.controller.ts:60-67`

```diff
   @Post('analyze')
   @UseInterceptors(
     FileInterceptor('video', {
-      storage: memoryStorage(),
+      // 메모리 대신 디스크에 저장한다. 500MB 영상을 메모리에 통째로 올리면
+      // base64 변환·직렬화까지 겹쳐 피크 ~1.8GB 로 프로세스가 죽는다.
+      storage: diskStorage({
+        destination: (req, file, cb) => cb(null, os.tmpdir()),
+        filename: (req, file, cb) =>
+          cb(null, `${randomUUID()}${extname(file.originalname)}`),
+      }),
       limits: {
-        fileSize: 500 * 1024 * 1024, // 500MB for video
+        fileSize: 200 * 1024 * 1024, // 200MB (nginx 상한과 일치)
       },
     }),
   )
```

이후 `file.buffer` 참조를 `file.path` 기반으로 바꾼다.
컨트롤러 내 사용처: **S3 업로드**, **REMO 요청**, **로깅(`file.buffer.length`)**.

### 수정 ②  `remo-api.service.ts:129-150` — 스트리밍 base64

```diff
+  /**
+   * 파일을 스트리밍하며 base64 로 변환한다.
+   * 전체를 한 번에 메모리에 올리지 않는다.
+   */
+  private async fileToBase64(filePath: string): Promise<string> {
+    const chunks: string[] = [];
+    const stream = fs.createReadStream(filePath, { highWaterMark: 3 * 1024 * 1024 });
+    for await (const chunk of stream) {
+      chunks.push(chunk.toString('base64'));
+    }
+    return chunks.join('');
+  }
```
> `highWaterMark` 를 **3의 배수**로 두는 것이 중요하다. base64 는 3바이트 → 4문자로
> 인코딩하므로 청크 크기가 3의 배수가 아니면 패딩(`=`)이 중간에 끼어 **결과가 깨진다.**

> **더 나은 대안**: REMO API 가 `multipart/form-data` 를 지원하는지 확인할 것.
> 지원한다면 base64 자체를 버려 **33% 페이로드 오버헤드가 사라진다.**
> → REMO 담당자 확인 필요. Phase 3 착수 전 문의를 먼저 보낼 것.

### 수정 ③ 임시파일 정리
업로드 처리 완료/실패 양쪽에서 `fs.promises.unlink(file.path)` 를 `finally` 로 보장.
`@nestjs/schedule` 기반 기존 cleanup 작업에도 `os.tmpdir()` 잔여물 정리를 추가.

### 수정 ④ `ecosystem.config.js`
```diff
-      max_memory_restart: '1G',
+      max_memory_restart: '2G',   // 3-1 적용 후 실측치 기준으로 재조정
```

## 3-2. REMO API timeout (P2-1)

**파일**: `remo-api.service.ts:466-489`

```diff
     const headers = {
       'Content-Type': 'application/json',
     };
+    // timeout 미설정 시 REMO 무응답에 무기한 대기한다.
+    // shouldRetry 는 hang 상태를 감지하지 못해 재시도조차 걸리지 않는다.
+    const config = { headers, timeout: 120000 };
 
     try {
       if (method === 'GET') {
-        return await axios.get(url, { headers });
+        return await axios.get(url, config);
       } else {
-        return await axios.post(url, data, { headers });
+        return await axios.post(url, data, config);
       }
     } catch (error) {
       if (this.shouldRetry(error) && attempt < this.maxRetries) {
-        await this.delay(this.retryDelay * attempt);
+        // 선형 → 지수 백오프
+        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
         return this.makeRequestWithRetry(method, url, data, attempt + 1);
```

## 3-3. nginx 상한 상향 — **3-1 검증 완료 후에만**

```diff
 server {
     server_name api-golf.remo.re.kr;
-    client_max_body_size 25m;
+    client_max_body_size 200m;
```

## 3-4. 타임아웃·상한 정합표 (목표 상태)

| 계층 | 현재 | 목표 |
|------|------|------|
| nginx `client_max_body_size` | 25m | **200m** |
| nginx `proxy_read_timeout` | 60s(기본) | **300s** |
| NestJS 영상 `fileSize` | 500MB | **200MB** |
| 프론트 axios (영상) | 300s | 300s |
| 백엔드 → REMO axios | **없음** | **120s** |

## Phase 3 검증

```bash
# 메모리 추이를 지켜보며 단계적으로 크기를 올린다
for MB in 10 50 100 180; do
  dd if=/dev/urandom of=/tmp/t.mp4 bs=1M count=$MB 2>/dev/null
  echo "--- ${MB}MB ---"
  curl -o /dev/null -w "  HTTP %{http_code}  %{time_total}s\n" --max-time 400 \
    -H "Authorization: Bearer $AT" -F "video=@/tmp/t.mp4" \
    -F "subjectId=1" -F "swingType=full" https://api-golf.remo.re.kr/api/golf-swing/analyze
  pm2 describe golf-backend | grep -i memory
done
```
**성공 기준**: 180MB 에서 413 이 아니고, 백엔드 메모리가 `max_memory_restart` 미만 유지, 재시작 0회.

**롤백**: nginx `client_max_body_size 25m` 복귀 → `git revert` → 재빌드

---

# Phase 4 — Vercel 프론트엔드 이전

**목표**: 프론트 배포를 `git push` 만으로 완결. 서버 이전·SSH 의존 제거
**소요**: 2~3일 / **위험도**: 중 / **선행조건**: **Phase 1 필수**, Phase 2 필수

## 4-0. 이전 타당성 (실측 근거)

| 점검 | 결과 | 판정 |
|------|------|------|
| `page.tsx` 14개 중 `'use client'` | **14개 (전부)** | SSR 미사용 = 사실상 SPA |
| API Route (`route.ts`) | **0** | 서버 런타임 불필요 |
| Server Action (`'use server'`) | **0** | 〃 |
| `fs`/`path`/`child_process` | **0** | Node 전용 API 없음 |
| 서버 전용 env (non-`NEXT_PUBLIC_`) | **0** | 시크릿 이관 불필요 |
| 조직 Vercel 사용 이력 | `remo-ai-edu`·`remo-ai-studio`·`sodam-ai-studio` | 운영 경험 있음 |
| vercel CLI | 54.9.1 설치 + 인증 캐시 존재 | 즉시 착수 가능 |

## 4-1. 🔴 선결 — 락파일 커밋 (절대규칙 #3)

**현재 상태**
```
frontend/package-lock.json  존재하지만 .gitignore 로 제외 → git 에 없음
package.json 의 "latest" 의존성 3개:
  "@radix-ui/react-dialog": "latest"
  "@radix-ui/react-slider": "latest"
  "recharts": "latest"
  "@vercel/analytics": "latest"
```

락파일 없이 Vercel 이 빌드하면 **매 배포마다 다른 버전이 설치**된다.
로컬에서 되던 것이 배포에서 깨지는 전형적 원인이다.

### 수정 ①  `.gitignore`
```diff
 # Dependencies
 node_modules/
-package-lock.json
+# package-lock.json 은 재현 가능한 빌드를 위해 반드시 추적한다 (Vercel 빌드 필수)
 
 ...
 frontend/node_modules/
 frontend/build/
 frontend/dist/
 frontend/.next/
 frontend/.env*
 frontend/*.log
-frontend/pnpm-lock.yaml
```
> `CLAUDE.md` 는 프론트를 `pnpm dev` 로 안내하는데 실제로는 `package-lock.json`
> (npm) 이 존재한다. **패키지 매니저를 하나로 확정**하고 문서를 맞출 것.
> 배포 워크플로가 `npm ci` 를 쓰므로 **npm 통일을 권장**한다.

### 수정 ②  `frontend/package.json` — `"latest"` 고정
```bash
cd frontend
npm ls @radix-ui/react-dialog @radix-ui/react-slider recharts @vercel/analytics --depth=0
# 출력된 실제 설치 버전으로 package.json 을 고정 후
npm install && git add package.json package-lock.json
```

### 수정 ③ 프로젝트명
```diff
-  "name": "my-v0-project",
+  "name": "parkgolf-ai-pro-frontend",
```

## 4-2. API URL 전환

### 수정 ①  `frontend/lib/api.ts:3-12`

```diff
-// 동적으로 API 기본 URL 생성 (리버스 프록시 지원)
+// API 기본 URL.
+// Vercel 이전 후 프론트와 백엔드가 서로 다른 호스트에 있으므로
+// 상대경로(/backend-api) 대신 절대 URL 을 사용한다.
+// 로컬 개발은 next.config.mjs 의 rewrites 를 그대로 쓸 수 있도록 fallback 을 둔다.
 function getApiBaseUrl(): string {
-  // 서버 사이드 렌더링 시 환경변수 또는 로컬호스트 사용
-  if (typeof window === 'undefined') {
-    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003/api'
-  }
-
-  // 클라이언트 사이드: 상대 경로 사용 (리버스 프록시 통해 백엔드로 전달)
-  return '/backend-api'
+  return process.env.NEXT_PUBLIC_API_BASE_URL || '/backend-api'
 }
```

### 수정 ②  `frontend/lib/api.ts:121-131` — `getImageUrl`

```diff
 export function getImageUrl(relativePath: string | null | undefined): string {
   if (!relativePath) {
     return ''
   }
-  // 이미 절대 URL인 경우 그대로 반환
   if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
     return relativePath
   }
-  // 상대 경로를 API URL로 변환 (리버스 프록시 경로 사용)
-  return `/backend-api/body-posture/images/${relativePath}`
+  return `${getApiBaseUrl()}/body-posture/images/${relativePath}`
 }
```

> ⚠️ **이미지 접근에 인증이 필요해졌다** (Phase 1-2 에서 가드 추가).
> `<img src>` 는 Authorization 헤더를 보낼 수 없다.
> **`body-analysis-result/page.tsx` (8개 호출부) 를 반드시 함께 수정해야 한다.**
>
> 선택지:
> | 방식 | 내용 | 판단 |
> |------|------|------|
> | **A. axios blob** | `api.get(url, {responseType:'blob'})` → `URL.createObjectURL` | ✅ 권장. 기존 인터셉터로 토큰 자동 첨부. `useEffect` 정리에서 `revokeObjectURL` 필수 |
> | B. 서명 URL | 백엔드가 단기 서명 URL 발급 | 구현량 많음 |
> | C. 쿼리 토큰 | `?token=` | ❌ URL·로그에 토큰 노출 |
>
> 이 작업은 **Phase 1-2 와 같은 배포에 묶어야 한다.** 따로 나가면 이미지가 전부 깨진다.

### 환경변수
| 위치 | 키 | 값 |
|------|-----|-----|
| Vercel (Production) | `NEXT_PUBLIC_API_BASE_URL` | `https://api-golf.remo.re.kr/api` |
| Vercel (Preview) | 〃 | 동일 (또는 스테이징 API) |
| 로컬 `frontend/.env.local` | 〃 | 비워둠 → `/backend-api` rewrites 사용 |

## 4-3. `next.config.mjs` 정리

```diff
 const nextConfig = {
   typescript: {
-    ignoreBuildErrors: true,
+    // Phase 6 에서 제거 목표. 먼저 `npx tsc --noEmit` 로 오류 수를 측정할 것.
+    ignoreBuildErrors: true,
   },
   images: {
-    unoptimized: true,
+    // Vercel 에서는 이미지 최적화를 켜는 편이 유리하다.
+    // 단 API 호스트를 remotePatterns 에 등록해야 한다.
+    unoptimized: true,
   },
   logging: false,
   devIndicators: false,
+  // allowedDevOrigins 는 개발 모드 전용. Vercel 프로덕션에는 영향 없음.
   allowedDevOrigins: [ ... ],
 
-  // 로컬 개발용: /backend-api 요청을 백엔드로 프록시
+  // 로컬 개발 전용 프록시. Vercel 에서는 NEXT_PUBLIC_API_BASE_URL 이 절대 URL 이라 미사용.
   async rewrites() {
     return [
       { source: '/backend-api/:path*', destination: 'http://localhost:3003/api/:path*' },
     ]
   },
 }
```

## 4-4. Vercel 프로젝트 생성 및 배포

```bash
cd frontend
vercel link                      # 조직/프로젝트 선택
vercel env add NEXT_PUBLIC_API_BASE_URL production   # https://api-golf.remo.re.kr/api
vercel env add NEXT_PUBLIC_API_BASE_URL preview
vercel                           # 프리뷰 배포 → 여기서 충분히 검증
vercel --prod                    # 프로덕션 승격
```

**Root Directory 를 `frontend` 로 지정**해야 한다(모노레포 구조).

## 4-5. 도메인 전환 — **모든 검증 후 마지막**

프리뷰 URL 로 전체 플로우(로그인 → 회원목록 → 업로드 → 결과 → 이미지)를 확인한 뒤 전환한다.

```
Route 53:  golf.remo.re.kr
  변경 전: A     49.169.8.19
  변경 후: CNAME cname.vercel-dns.com     (조직 기존 3개 도메인과 동일 방식)
```

> ⚠️ **롤백 창구를 남길 것.** 전환 직후 문제가 생기면 A 레코드 `49.169.8.19` 로
> 되돌리면 즉시 복구된다. **그러려면 `golf-frontend` PM2 프로세스와
> nginx vhost 를 최소 2주간 유지**해야 한다. 성급히 지우지 말 것.

전환 후 `CORS_ORIGINS` 재확인 (Vercel 프리뷰 도메인 포함 여부).

## Phase 4 검증

```bash
# 프리뷰에서 전체 플로우
#   로그인 → 회원목록 → 회원상세 → 스윙업로드 → 분석대기 → 결과 → 구간이미지
#   체형업로드 → 결과 → 이미지 4방향  ← 특히 인증 이미지 로딩
# 브라우저 콘솔 CORS 에러 0건
# Network 탭에서 요청이 api-golf.remo.re.kr 로 가는지 확인
dig +short golf.remo.re.kr        # CNAME 확인
```

---

# Phase 5 — 배포 파이프라인 정리

**목표**: 동작하지 않는 SSH 배포를 제거하고 실제 동작하는 경로로 대체
**소요**: 1일 / **위험도**: 낮음 / **선행조건**: Phase 4

## 5-1. 현황

| 사실 | 근거 |
|------|------|
| 외부에서 SSH(22, 2222) **미개방** | 제3자 포트체크 `status: false`. 80/443 만 포워딩 |
| Actions 실행 이력 5회, 마지막 2026-01-15 | `gh run list` |
| `SERVER_HOST`·`PROJECT_PATH` | 2026-08-26 갱신 완료 |
| `SERVER_PASSWORD` 방식 | `8d302cd` 커밋이 키→비밀번호로 되돌림 |

**→ SERVER_HOST 를 고쳐도 러너가 SSH 로 접속할 수 없다.**

## 5-2. 결정: 프론트는 Vercel, 백엔드는 로컬 스크립트

Phase 4 완료 시 **프론트 배포는 `git push` 로 자동화**된다.
백엔드는 서버에 직접 접근 가능하므로 **인터넷에 SSH 를 열 이유가 없다.**

### `.github/workflows/deploy.yml` → 백엔드 전용 CI 로 대체

```yaml
name: Backend CI
on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

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
      - run: npm test --if-present
        working-directory: backend
```

> 배포는 하지 않고 **빌드·타입체크·테스트만** 수행한다.
> "배포 성공했는데 서비스는 죽어있음"(이번 사고) 상황이 재발하지 않는다.

### 백엔드 배포 스크립트 — `scripts/deploy-backend.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ pull"
git pull origin main

echo "▶ deps"
cd backend && npm ci

echo "▶ build"
npm run build

# Phase 6 에서 마이그레이션 도입 후 활성화
# echo "▶ migration"; npm run migration:run

echo "▶ restart"
pm2 reload golf-backend --update-env

echo "▶ healthcheck"
sleep 8
for i in {1..10}; do
  if curl -fsS http://localhost:3003/api/health >/dev/null 2>&1; then
    echo "✅ 배포 성공"; exit 0
  fi
  sleep 3
done
echo "❌ 헬스체크 실패 — 로그 확인"; pm2 logs golf-backend --lines 50 --nostream; exit 1
```

> **헬스체크가 핵심이다.** 이번 사고의 교훈은 "성공 로그가 서비스 정상을 뜻하지 않는다" 였다.
> `/api/health` 엔드포인트는 Phase 6-1 에서 만든다.

## 5-3. Secret 정리

`SERVER_PASSWORD` 는 더 이상 쓰지 않으므로 삭제한다 (유출 표면 축소).
```bash
gh secret delete SERVER_PASSWORD
gh secret delete SERVER_HOST
gh secret delete SERVER_PORT
gh secret delete SERVER_USER
gh secret delete PROJECT_PATH
```

---

# Phase 6 — 운영 기반 구축

**목표**: **2.4개월간 아무도 몰랐던** 상황의 재발 방지
**소요**: 지속 / **위험도**: 낮음 / **선행조건**: Phase 0 (나머지와 병행 가능)

> 개별 버그 수정보다 이것이 우선순위가 높다.
> 이번 사고의 본질은 "고장"이 아니라 **"고장을 몰랐다"** 는 데 있다.

## 6-1. 헬스체크 엔드포인트

`backend/src/presentation/controllers/health.controller.ts` (신규)

```ts
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** 인증 불필요. DB 연결까지 실제로 확인한다. */
  @Get()
  async check() {
    let db = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
```
`app.module.ts` 의 `controllers` 배열에 등록.
`body-posture` 를 클래스 레벨 가드로 바꿨듯, 이 컨트롤러는 가드를 붙이지 않는다.

## 6-2. 외부 모니터링

| 대상 | 확인 |
|------|------|
| `https://golf.remo.re.kr/` | 200 |
| `https://api-golf.remo.re.kr/api/health` | 200 + `status: "ok"` |
| TLS 만료 | 30일 전 경고 |

UptimeRobot 등 외부 서비스로 5분 간격 감시.
이 환경에는 **`slack-bot-api` 스킬이 이미 있으므로** Slack 알림 연동이 가능하다.

## 6-3. 컨테이너 재시작 정책 일괄 점검

`golf_mysql` 은 조치 완료(`unless-stopped`). 나머지도 확인한다.
```bash
docker ps -a --format '{{.Names}}' | while read n; do
  p=$(docker inspect "$n" --format '{{.HostConfig.RestartPolicy.Name}}')
  [ "$p" = "no" ] && echo "⚠️  $n : restart=no"
done
```

## 6-4. DB 마이그레이션 도입 (P1-3)

현재 프로덕션은 `synchronize: false` 인데 마이그레이션이 0건이다.
→ **스키마 변경을 반영할 경로가 아예 없다.** `CLAUDE.md` 의 C-01(체형 이미지 필드 부족)을
해결하려는 순간 이 문제에 부딪힌다.

```bash
# backend/src/data-source.ts 작성 (엔티티 목록은 app.module.ts 와 공유)
# package.json
#   "typeorm": "typeorm-ts-node-commonjs -d src/data-source.ts",
#   "migration:generate": "npm run typeorm -- migration:generate",
#   "migration:run": "npm run typeorm -- migration:run"
npm run migration:generate -- src/migrations/InitialSchema
```
이후 `app.module.ts` 의 `synchronize` 를 **개발 환경 포함 `false` 고정**,
`scripts/deploy-backend.sh` 의 마이그레이션 라인을 활성화.

## 6-5. 테스트 도입 (P1-4)

현재 **테스트 0건**. Clean Architecture 로 인터페이스 주입이 되어 있어
목 리포지토리 주입이 쉬운데도 구조의 최대 이점을 못 쓰고 있다.

**우선순위**
1. `LoginUserUseCase` — Phase 1-1 토큰 분리 회귀 방지
2. **소유권 검증 16개 지점** — 권한 우회 회귀 방지 (현재 가장 잘 된 부분이므로 반드시 지켜야 함)
3. `LocalStorageService.getFile` — Phase 1-2 경로 탐색 차단 검증
4. `RemoApiService` 재시도/타임아웃 (axios mock)

## 6-6. P1-2 · 이메일 로그인 설계 정리

**현재 데이터**: 강사 5명, 이메일 NULL 0건 / 중복 0건 → **아직 사고는 안 났다.**
설계 결함만 남아 있으므로 지금이 고치기 가장 쉬운 시점이다.

```diff
# backend/src/application/dto/auth/RegisterUser.dto.ts
   @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
-  @IsOptional()
-  email?: string;
+  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
+  email: string;
```
```diff
# backend/src/infrastructure/database/entities/user.entity.ts:46
-  @Column({ type: 'varchar', length: 255, nullable: true })
+  @Column({ type: 'varchar', length: 255, unique: true })
   email: string;
```
```diff
# backend/src/infrastructure/database/repositories/UserRepository.ts
   async findByEmail(email: string): Promise<UserEntity | null> {
+    if (!email) return null;   // NULL 매칭으로 임의 계정이 걸리는 경로 차단
     return await this.repository.findOne({
```
마이그레이션(6-4)으로 UNIQUE 인덱스를 부여한다.

## 6-7. REMO API 견고성 (P2-4)

```diff
# remo-api.service.ts:108-116
     if (!apiKey || !userEmail || !userKey) {
+      if (this.configService.get('NODE_ENV') === 'production') {
+        // 프로덕션에서 조용히 mock 으로 폴백하면, 설정 누락을
+        // 분석 요청 시점에야 알게 된다. 부팅 단계에서 실패시킨다.
+        throw new Error('REMO API 자격증명이 설정되지 않았습니다.');
+      }
       this.apiKey = 'mock-api-key';
```
`REMO_API_URL` 은 이미 `https://` 로 변경 완료(2026-08-26).
코드 기본값(`remo-api.service.ts:103`)도 `https://api.remo.re.kr` 로 맞출 것.

## 6-8. 문서 통합

- 루트 마크다운 14개 + `backend/docs/` 4개 = 18개, 상당수 중복
- 스냅샷 성격 문서는 `docs/archive/` 로 이동:
  `INTEGRATION_COMPLETE.md` · `INTEGRATION_UPDATE_LOG.md` ·
  `FRONTEND_INTEGRATION_SUMMARY.md` · `RESTRUCTURE_CHANGES.md` · `BACKEND_ISSUES_REPORT.md`
- `README_BRANCHING_STRATEGY.md` 는 실제 운영(main 단독)과 불일치 → 수정 또는 아카이브

---

# 부록 A — 작업 순서 체크리스트

```
Phase 0  즉시 안정화 ─────────────────────────────────── 30분
  □ 0-1  ecosystem.config.js  min_uptime/max_restarts/restart_delay
  □ 0-2  pm2-logrotate 설치 + pm2 flush (954MB 회수)
  □ 0-3  CLAUDE.md 테스트계정·서비스명 / CURRENT_STATUS.md 갱신

Phase 1  보안 (P0) ──────────────────────── 3~5일  ★Vercel 전 필수
  □ 1-1  LoginUserUseCase / jwt-auth.guard / RefreshTokenUseCase  type 클레임
  □ 1-1  하드 컷오버 공지 발송
  □ 1-2  images/* 가드 + 소유권 검증
  □ 1-2  local-storage.getFile 경로봉쇄 + mime 화이트리스트
  □ 1-2  deleteFile 동일 봉쇄 / 컨트롤러 가드 클래스레벨 통일
  □ 1-3  CORS 화이트리스트 + CORS_ORIGINS 환경변수
  □ 1-4  dropSchema 제거
  □ 1-5  axios → dependencies
  □ ✅   검증 ①~⑥ 전부 통과

Phase 2  nginx ─────────────────────────────────────── 1일
  □ 2-2  Route53  api-golf.remo.re.kr  A → 49.169.8.19
  □ 2-3  nginx vhost 신규 + certbot 발급
  □ 2-4  golf vhost 타임아웃 보강
  □ ✅   api-golf 401 / golf 200 / 인증서 유효

Phase 3  업로드 ──────────────────── 4~6일  ⚠️순서엄수
  □ 사전  REMO 에 multipart 지원 여부 문의
  □ 3-1  diskStorage 전환 + file.path 기반 처리
  □ 3-1  스트리밍 base64 (highWaterMark 3의 배수)
  □ 3-1  임시파일 finally 정리 / max_memory_restart 2G
  □ 3-2  REMO axios timeout 120s + 지수 백오프
  □ 3-3  ★3-1 검증 후★ nginx 200m
  □ ✅   10→50→100→180MB 단계 테스트, 재시작 0회

Phase 4  Vercel ──────────────────── 2~3일  ★Phase1 완료 필수
  □ 4-1  .gitignore 락파일 제외 해제 + 커밋
  □ 4-1  "latest" 의존성 4개 버전 고정 / 패키지매니저 npm 통일
  □ 4-2  lib/api.ts getApiBaseUrl / getImageUrl
  □ 4-2  ★body-analysis-result/page.tsx 이미지 8곳 blob 방식★
  □ 4-3  next.config.mjs 주석·정리
  □ 4-4  vercel link / env / 프리뷰 배포
  □ 4-5  프리뷰 전체 플로우 검증 → golf.remo.re.kr CNAME 전환
  □ ⚠️   PM2 golf-frontend + nginx vhost 2주 유지 (롤백 창구)

Phase 5  배포 파이프라인 ───────────────────────────── 1일
  □ 5-2  deploy.yml → Backend CI (빌드·타입체크·테스트만)
  □ 5-2  scripts/deploy-backend.sh + 헬스체크
  □ 5-3  SSH 관련 secret 5건 삭제

Phase 6  운영 기반 ─────────────────────────── 지속(병행)
  □ 6-1  /api/health 엔드포인트
  □ 6-2  외부 모니터링 + Slack 알림
  □ 6-3  컨테이너 restart 정책 일괄 점검
  □ 6-4  TypeORM 마이그레이션 + synchronize:false 고정
  □ 6-5  테스트 (Login / 소유권16 / getFile / RemoApi)
  □ 6-6  이메일 unique + 필수화
  □ 6-7  REMO 프로덕션 폴백 제거
  □ 6-8  문서 통합
```

---

# 부록 B — 이번 플랜이 다루지 않는 것

의도적으로 범위 밖에 둔 항목이다.

| 항목 | 이유 |
|------|------|
| DNS 구 IP 8건 (golf 제외) | 각 프로젝트 담당자 판단 필요. `remobodys`/`scoliosis`/`notebooklm-dev` 는 upstream 프로세스가 없어 되살릴 계획 확인이 선행 |
| 타 서버 이전 도메인 9건의 로컬 인증서 잔재 | 사용자 영향 없음. 방치해도 무해 |
| `wellaging-*` / `espotec-*` PM2 프로세스 | 별도 프로젝트 |
| `CLAUDE.md` 미해결 9건 (C-01, M-01~04, m-01~04) | 2025-12-11 기준이라 **재현부터 필요**. Phase 0 완료 후 E2E 재현으로 유효성 재판정할 것. 특히 C-01 은 스키마 변경이 필요해 **6-4 마이그레이션이 선행조건** |
| `frontend/next-env.d.ts` 변경 | Next.js 자동 생성 파일. `next build` 시 갱신됨 |

---

# 부록 C — 롤백 요약

| Phase | 롤백 방법 | 소요 |
|-------|-----------|------|
| 0 | `~/backups/golf-config-20260826/` 복원 → `pm2 reload` | 1분 |
| 1 | `git revert` → `npm run build` → `pm2 restart` (사용자 재로그인 다시 발생) | 5분 |
| 2 | `sites-enabled` 심볼릭 링크 삭제 → `nginx -t && reload` | 1분 |
| 3 | nginx 25m 복귀 → `git revert` → 재빌드 | 10분 |
| 4 | Route53 `golf.remo.re.kr` CNAME → **A `49.169.8.19`** 복귀 (TTL 300 → 5분 내) | 5분 |
| 5 | `git revert` (배포 자체를 안 하므로 영향 없음) | 1분 |

**Phase 4 롤백이 성립하려면 `golf-frontend` PM2 프로세스와 nginx vhost 가 살아 있어야 한다.**
전환 후 최소 2주간 유지할 것.
