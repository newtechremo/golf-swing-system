# 03. 문제 분석 보고서

**분석 기준 커밋**: `7e34b47` / **분석일**: 2026-08-26
**총 15건** — P0(치명) 3 / P1(높음) 5 / P2(보통) 4 / P3(낮음) 3

> 각 항목은 실제 코드·명령 출력으로 확인된 것만 기재했다.
> 추정이 섞인 항목은 **[추정]** 으로 표시했다.

---

## 심각도 요약

| ID | 제목 | 영역 | 심각도 |
|----|------|------|--------|
| [P0-1](#p0-1) | MySQL 부재로 백엔드 49,368회 크래시 루프 | 인프라 | 🔴 치명 |
| [P0-2](#p0-2) | Refresh Token 이 Access Token 으로 그대로 사용 가능 | 보안/인증 | 🔴 치명 |
| [P0-3](#p0-3) | 미인증 파일 서빙 엔드포인트 + 경로 탐색 미차단 | 보안 | 🔴 치명 |
| [P1-1](#p1-1) | nginx 25MB 제한 vs 백엔드 500MB 영상 — 업로드 구조적 불가 | 운영 | 🟠 높음 |
| [P1-2](#p1-2) | 이메일 로그인 설계 결함 (회원가입 시 이메일 선택 + unique 아님) | 기능/데이터 | 🟠 높음 |
| [P1-3](#p1-3) | DB 마이그레이션 부재 — 프로덕션 스키마 변경 경로 없음 | 운영 | 🟠 높음 |
| [P1-4](#p1-4) | 테스트 0건 | 품질 | 🟠 높음 |
| [P1-5](#p1-5) | 500MB 영상 메모리 적재 후 base64 인코딩 → OOM | 성능/안정성 | 🟠 높음 |
| [P2-1](#p2-1) | REMO API 호출에 timeout 미설정 | 안정성 | 🟡 보통 |
| [P2-2](#p2-2) | `dropSchema` / `synchronize` 위험 설정 잔존 | 데이터 | 🟡 보통 |
| [P2-3](#p2-3) | 크래시 로그 954MB 누적, 로테이션 미설정 | 운영 | 🟡 보통 |
| [P2-4](#p2-4) | REMO API 엔드포인트 프론트/백엔드 불일치 + 평문 HTTP | 설정 | 🟡 보통 |
| [P3-1](#p3-1) | 문서 14개 중복 및 8개월 전 정보 | 문서 | 🔵 낮음 |
| [P3-2](#p3-2) | `ignoreBuildErrors: true` — 타입 오류 무시 배포 | 품질 | 🔵 낮음 |
| [P3-3](#p3-3) | `axios` 가 backend devDependencies 에 위치 | 빌드 | 🔵 낮음 |

---

# P0 — 치명

<a name="p0-1"></a>
## P0-1. MySQL 부재로 백엔드가 49,368회 크래시 루프

**영역**: 인프라 / 가용성
**상태**: 🔴 현재 진행 중 (2026-06-15 부터 약 2.4개월)

### 현상
`golf-backend` PM2 프로세스가 약 25초마다 부팅→실패→재시작을 반복.
포트 3003 미개방, 모든 API 호출 실패.

### 근거
```console
$ pm2 describe golf-backend
 restarts : 49368     uptime : 21s

$ docker ps -a | grep golf_mysql
golf_mysql   mysql:8.0   Exited (255) 2 months ago   0.0.0.0:3306->3306/tcp

$ docker inspect golf_mysql --format "{{.State.FinishedAt}} {{.State.ExitCode}} {{.HostConfig.RestartPolicy.Name}}"
2026-06-15T13:49:48Z   255   no

$ ss -tln | grep 3003
(없음)
```

`backend/logs/backend-error-0.log`:
```
[Nest] ERROR [TypeOrmModule] Unable to connect to the database. Retrying (9)...
Error: connect ECONNREFUSED 127.0.0.1:3306
[Nest] ERROR [ExceptionHandler] connect ECONNREFUSED 127.0.0.1:3306
```

### 원인
`golf_mysql` 컨테이너가 2026-06-15 종료 코드 255 로 비정상 종료됐고, 재시작 정책이 `no` 라 되살아나지 못했다.
TypeORM 은 9회 재시도 후 예외를 던지고, NestJS bootstrap 이 실패하며 프로세스가 종료된다.
PM2 의 `autorestart: true` 가 이를 즉시 되살려 무한 루프가 형성됐다.

### 영향
- **서비스 전면 중단.** 로그인부터 불가
- 2.4개월간 CPU/디스크 I/O 지속 소모 → 동일 서버의 다른 8개 프로젝트와 자원 경합
- 로그 954MB 누적 ([P2-3](#p2-3))

### 구조적 문제
컨테이너가 죽었을 때 **아무도 알지 못했다.** 헬스체크·알림이 전무하다.
`golf_mysql` 의 재시작 정책이 `no` 로 되어 있어(`docker inspect` 확인) 컨테이너가 스스로 복구될 수도 없었다.

### 조치
[04번 문서 즉시조치 §1](./04-remediation-plan.md) — 컨테이너 기동 + 재시작 정책 + `min_uptime`/`max_restarts` 설정

---

<a name="p0-2"></a>
## P0-2. Refresh Token 이 Access Token 으로 그대로 사용 가능

**영역**: 보안 / 인증
**파일**: `backend/src/application/use-cases/auth/LoginUserUseCase.ts:82-93`, `backend/src/presentation/guards/jwt-auth.guard.ts:24`

### 현상
Access Token 과 Refresh Token 이 **동일한 시크릿·동일한 payload** 로 서명되며,
**유효기간만 다르다.** 둘을 구분할 클레임이 없다.

```ts
// LoginUserUseCase.ts
private generateTokens(userId: number) {
  const payload = { sub: userId, role: 'instructor' };   // ← 동일 payload

  const accessToken  = this.jwtService.sign(payload, { expiresIn: '1h' });
  const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
  //                                       ^^^^^^^ 동일. type 클레임 없음
  return { accessToken, refreshToken };
}
```

```ts
// jwt-auth.guard.ts
const payload = this.jwtService.verify(token);   // ← 서명·만료만 검증
request.user = payload;                          //   토큰 종류 구분 없음
return true;
```

### 공격 시나리오
1. 공격자가 `refreshToken` 을 탈취 (localStorage 에 평문 저장 — [P2 참고](#부가-토큰-저장-위치))
2. `Authorization: Bearer <refreshToken>` 으로 **아무 보호 API 나 직접 호출**
3. `JwtAuthGuard` 는 서명이 유효하므로 통과시킴
4. → **의도한 1시간이 아니라 7일짜리 액세스 권한을 획득**

Refresh Token 의 존재 이유(=Access Token 을 짧게 유지해 탈취 피해를 줄인다)가
설계상 완전히 무력화된다.

### 추가 결함
- **Refresh Token 무효화(revocation) 수단이 없다.** DB에 저장하지 않으므로
  로그아웃/비밀번호 변경 후에도 기존 refreshToken 은 7일간 계속 유효하다
- `RefreshTokenUseCase` 는 payload 를 그대로 복사해 재발급하므로 이 문제를 그대로 전파한다
  ```ts
  const payload = this.jwtService.verify(refreshToken);
  const newAccessToken = this.jwtService.sign({ sub: payload.sub, role: payload.role }, ...);
  ```
- `JWT_SECRET` 이 access/refresh 공용

### 조치
1. payload 에 `type: 'access'` / `type: 'refresh'` 클레임 추가
2. `JwtAuthGuard` 에서 `payload.type !== 'access'` 면 거부
3. `RefreshTokenUseCase` 에서 `type !== 'refresh'` 면 거부
4. (권장) refresh 전용 시크릿 분리 + DB 저장·회전(rotation)·폐기 구현

---

<a name="p0-3"></a>
## P0-3. 미인증 파일 서빙 엔드포인트 + 경로 탐색 미차단

**영역**: 보안
**파일**: `backend/src/presentation/controllers/body-posture.controller.ts:429-448`, `backend/src/infrastructure/external-services/local-storage.service.ts:223-260`

### 현상 A — 인증 없음

`body-posture.controller.ts` 는 **클래스 레벨 가드가 없고 메서드별로 가드를 붙인다.**
그런데 이미지 서빙 엔드포인트만 가드가 빠져 있다.

```ts
@Controller('body-posture')          // ← 클래스 레벨 @UseGuards 없음
export class BodyPostureController {

  @Post('analyze')
  @UseGuards(JwtAuthGuard)           // ✅
  ...
  @Get('images/*')                   // ❌ 가드 없음
  async getImage(@Request() req, @Response() res, @Param() params: any) {
  ...
  @Get('analysis/:id')
  @UseGuards(JwtAuthGuard)           // ✅
```

> 비교: `golf-swing.controller.ts:36` 과 `subject.controller.ts:27` 은
> **클래스 레벨**에 가드를 걸어 이런 누락이 구조적으로 불가능하다.
> body-posture 만 방식이 다르고, 그 결과 실제로 하나가 빠졌다.

경로만 알면 **누구나 인증 없이 대상자의 체형 사진을 조회**할 수 있다.
체형 분석 이미지는 신체를 촬영한 민감정보다.

### 현상 B — 경로 탐색(Path Traversal) 미차단

```ts
// local-storage.service.ts:223
async getFile(relativePath: string) {
  let absolutePath: string;
  if (relativePath.startsWith('results/') || relativePath.startsWith('results\\')) {
    const cleanPath = relativePath.replace(/^results[\/\\]/, '');
    absolutePath = path.join(this.resultsDir, cleanPath);
  } else {
    absolutePath = path.join(this.uploadDir, relativePath);   // ← 정규화 검증 없음
  }
  if (!fs.existsSync(absolutePath)) return null;
  const buffer = await fs.promises.readFile(absolutePath);
  ...
  return { buffer, mimeType: mimeTypes[ext] || 'application/octet-stream' };
  //                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^ 확장자 화이트리스트 아님
}
```

- `path.join()` 은 `..` 를 **해석하여 상위 디렉터리로 이동시킨다.** 차단하지 않는다
- `path.resolve()` 후 baseDir 접두사 검증이 없다
- mimeType 이 화이트리스트가 아니라 **폴백(`application/octet-stream`)** 이므로
  이미지가 아닌 파일도 그대로 응답된다

`uploadDir` 은 `process.cwd()/uploads` = `backend/uploads` 이므로,
`../.env` 는 `backend/.env` 를 가리킨다. 이 파일에는
**JWT_SECRET, DB 비밀번호, AWS 자격증명, REMO API 키가 들어 있다.**

**[추정]** 실제 공격 성공 여부는 Express 라우터의 URL 정규화 동작에 좌우된다.
브라우저는 `..` 를 사전 정규화하지만, `curl --path-as-is` 나 URL 인코딩(`%2e%2e%2f`)을
사용하면 우회 가능성이 있다. **PoC 로 확인이 필요하나, 확인 여부와 무관하게
경로 검증은 반드시 추가해야 한다.**

### 조치
```ts
// 1) 가드 추가
@Get('images/*')
@UseGuards(JwtAuthGuard)

// 2) getFile 에 baseDir 봉쇄
const base = relativePath.startsWith('results/') ? this.resultsDir : this.uploadDir;
const absolutePath = path.resolve(base, cleanPath);
if (!absolutePath.startsWith(path.resolve(base) + path.sep)) {
  this.logger.warn(`Path traversal blocked: ${relativePath}`);
  return null;
}

// 3) 확장자 화이트리스트 (폴백 제거)
if (!mimeTypes[ext]) return null;
```

추가로 **소유권 검증**도 필요하다. 현재는 로그인만 하면 다른 강사의 대상자 이미지도
경로만 알면 조회 가능하다 (다른 엔드포인트들은 [잘 되어 있다](#긍정적으로-평가되는-부분)).

---

# P1 — 높음

<a name="p1-1"></a>
## P1-1. nginx 25MB 제한 vs 백엔드 500MB 영상 — 업로드가 구조적으로 불가능

**영역**: 운영 / 설정 정합성
**파일**: `/etc/nginx/sites-available/golf.remo.re.kr`, `backend/src/presentation/controllers/golf-swing.controller.ts:60-67`

### 현상
계층별 업로드 상한이 서로 다르다.

| 계층 | 상한 | 출처 |
|------|------|------|
| nginx | **25MB** | `client_max_body_size 25m;` |
| NestJS (영상) | **500MB** | `limits: { fileSize: 500 * 1024 * 1024 }` |
| NestJS (이미지) | 10MB | `limits: { fileSize: 10 * 1024 * 1024 }` |
| 프론트 axios timeout | 300초 | `frontend/lib/golf-swing.ts:109` — "최대 500MB 비디오 업로드" 주석 |

**25MB 를 넘는 골프 스윙 영상은 nginx 에서 `413 Request Entity Too Large` 로 잘린다.**
백엔드에는 요청이 도달조차 하지 않는다.

스마트폰으로 촬영한 몇 초짜리 골프 스윙 영상도 화질에 따라 쉽게 25MB 를 넘는다.
즉 **핵심 기능인 스윙 분석이 프로덕션에서 실질적으로 동작하지 않을 가능성이 높다.**

### 부가 문제 — 타임아웃 사슬도 정합성이 없다
| 계층 | 타임아웃 |
|------|----------|
| nginx `proxy_read_timeout` | 미설정 → **기본 60초** |
| Next.js rewrite | 프레임워크 기본 |
| 프론트 axios (영상) | 300초 |
| 프론트 axios (이미지) | 120초 |
| 백엔드 → REMO axios | **없음 (무한)** ([P2-1](#p2-1)) |

프론트가 300초를 기다려도 **nginx 가 60초에 끊는다.**

### 조치
nginx: `client_max_body_size 500m;` + `proxy_read_timeout 300s;` + `proxy_send_timeout 300s;`
그리고 세 계층의 상한/타임아웃을 하나의 값에서 파생시키도록 문서화.

**[추정]** 실제 서비스에서 이 오류가 관측됐는지는 로그 확인 필요.
백엔드가 2.4개월간 죽어 있었으므로 최근 데이터는 없다.

---

<a name="p1-2"></a>
## P1-2. 이메일 로그인 설계 결함

**영역**: 기능 / 데이터 무결성
**파일**: `backend/src/application/dto/auth/RegisterUser.dto.ts`, `LoginUser.dto.ts`, `backend/src/infrastructure/database/entities/user.entity.ts:46`

### 현상 — 세 가지 모순

**① 로그인은 이메일 필수, 회원가입은 이메일 선택**

```ts
// LoginUser.dto.ts — 이메일 필수
@IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
@IsNotEmpty({ message: '이메일을 입력해주세요.' })
email: string;
```
```ts
// RegisterUser.dto.ts — 이메일 선택
@IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
@IsOptional()                      // ← 선택
email?: string;
```

→ **이메일 없이 가입한 강사는 영원히 로그인할 수 없다.**
`username` 은 필수이자 unique 인데도 로그인에 쓰이지 않는다.

**② 이메일에 unique 제약이 없다**

```ts
// user.entity.ts:46
@Column({ type: 'varchar', length: 255, nullable: true })
email: string;                     // ← unique 아님, nullable
```

반면 `username` 과 `phoneNumber` 는 `unique: true` 다.
로그인 키로 쓰이는 유일한 필드에만 유일성 보장이 없다.

**③ 중복 시 조회 결과가 비결정적**

```ts
// UserRepository.ts
async findByEmail(email: string) {
  return await this.repository.findOne({ where: { email }, relations: ['center'] });
  //                            ^^^^^^^ 중복 시 어느 행이 반환될지 보장되지 않음
}
```

같은 이메일로 2명이 가입하면, 어느 계정으로 로그인될지 DB 실행계획에 좌우된다.
**타인 계정으로 로그인되는 상황이 이론적으로 가능하다.**

또한 `email` 이 nullable 이므로 `findByEmail(null)` 이 호출되면
NULL 인 임의 사용자가 매칭될 여지가 있다 (TypeORM 의 `IsNull` 변환 여부에 따라 다름 — **[추정]**).

### 연관
`CLAUDE.md` 의 미해결 이슈 **M-01 "로그인 후 리다이렉트 실패"** 와 관련 있을 수 있다.

### 조치 (택1)
- **A안 (권장, 최소변경)**: `RegisterUserDto.email` 을 필수로 + `user.entity.ts` 에 `unique: true` 추가 + 기존 데이터 중복/NULL 정리 마이그레이션
- **B안**: 로그인 키를 `username` 으로 변경 (이미 unique/필수). 단 프론트 `lib/auth.ts` 와 로그인 UI 도 함께 수정 필요

---

<a name="p1-3"></a>
## P1-3. DB 마이그레이션 부재 — 프로덕션 스키마 변경 경로가 없다

**영역**: 운영 / 데이터
**근거**: `backend/src/infrastructure/database/` 하위에 `entities/`, `repositories/` 만 존재. migration 파일 0건. `package.json` 에 `typeorm migration:*` 스크립트 없음

### 현상

```ts
// app.module.ts:111
synchronize: configService.get('NODE_ENV') !== 'production',
```

| 환경 | NODE_ENV | synchronize | 스키마 변경 반영 |
|------|----------|-------------|------------------|
| 로컬 개발 | `development` (`.env`) | **true** | 자동 (위험) |
| 프로덕션 | `production` (PM2) | **false** | **경로 없음** ❌ |

`.github/workflows/deploy.yml` 에도 마이그레이션 단계가 없다.

```yaml
cd backend && npm ci --production=false && npm run build
cd frontend && npm ci --production=false && npm run build
pm2 startOrRestart ecosystem.config.js --env production
```

### 영향
엔티티에 컬럼을 추가하고 배포하면, 코드는 새 컬럼을 참조하지만
**프로덕션 DB 에는 그 컬럼이 없어 런타임 SQL 오류가 발생**한다.
현재 유일한 반영 수단은 수동 SQL 실행이며, 이는 기록도 롤백도 되지 않는다.

`CLAUDE.md` 의 미해결 이슈 **C-01 "체형 분석 이미지 필드 부족"** 처럼
스키마 변경이 필요한 이슈를 해결할 때 즉시 이 문제에 부딪힌다.

### 조치
TypeORM 마이그레이션 도입:
```json
"typeorm": "typeorm-ts-node-commonjs -d src/data-source.ts",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run"
```
현재 스키마를 baseline 마이그레이션으로 생성 → deploy.yml 에 `npm run migration:run` 삽입.

---

<a name="p1-4"></a>
## P1-4. 테스트 0건

**영역**: 품질
**근거**:
```console
$ find backend/src -name '*.spec.ts' | wc -l
0
$ ls backend/test
(디렉터리 없음)
```

`package.json` 에 `"test": "jest"` 스크립트와 `@nestjs/testing`, `jest`, `ts-jest` 의존성은
갖춰져 있으나 **테스트 파일이 하나도 없다.** 프론트엔드도 동일하다.

### 왜 이것이 특히 아까운가
이 프로젝트는 Clean Architecture 를 제대로 구현했다. Use Case 가
`@Inject('IUserRepository')` 로 **인터페이스에만 의존**하므로,
목(mock) 리포지토리를 주입한 단위 테스트를 작성하기가 매우 쉽다.
**구조의 최대 이점을 전혀 쓰지 않고 있다.**

### 우선 작성할 대상
1. `LoginUserUseCase` — [P0-2](#p0-2) 토큰 분리 회귀 방지
2. 16개 소유권 검증 지점 — 권한 우회 회귀 방지 ([긍정 평가 항목](#긍정적으로-평가되는-부분)이므로 반드시 지켜야 함)
3. `LocalStorageService.getFile` — [P0-3](#p0-3) 경로 탐색 차단 검증
4. `RemoApiService` 재시도/에러 처리 (axios mock)

---

<a name="p1-5"></a>
## P1-5. 500MB 영상 메모리 적재 후 base64 인코딩 → OOM 위험

**영역**: 성능 / 안정성
**파일**: `golf-swing.controller.ts:60-67`, `remo-api.service.ts:136`

### 현상

```ts
// golf-swing.controller.ts — 디스크가 아닌 메모리에 통째로 적재
FileInterceptor('video', {
  storage: memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },   // 500MB
})
```
```ts
// remo-api.service.ts:136 — 그 버퍼를 base64 문자열로 변환
const base64Video = videoBuffer.toString('base64');
```

### 메모리 사용량 추정 (500MB 영상 1건)
| 단계 | 크기 |
|------|------|
| Multer 메모리 버퍼 | 500MB |
| base64 문자열 (×4/3) | ~667MB |
| axios JSON 직렬화 사본 | ~667MB |
| **동시 피크** | **~1.8GB** |

`ecosystem.config.js` 의 `max_memory_restart: '1G'` 를 **단일 요청으로 초과**한다.
→ PM2 가 프로세스를 강제 재시작 → 업로드 중이던 **다른 사용자 요청까지 전부 끊긴다.**

동시 업로드 2건이면 확실히 죽는다.

### 완화 요인
[P1-1](#p1-1) 의 nginx 25MB 제한이 역설적으로 이 문제를 막고 있다.
**따라서 P1-1 을 고칠 때 P1-5 를 반드시 함께 고쳐야 한다.**
nginx 만 500MB 로 늘리면 즉시 OOM 크래시가 발생한다.

### 조치
1. `memoryStorage()` → `diskStorage()` 로 변경, 스트리밍 처리
2. REMO API 가 multipart 업로드를 지원하면 base64 를 버린다 (33% 오버헤드 제거)
3. 지원하지 않으면 파일→base64 스트림 변환으로 전체 적재 회피
4. 현실적 상한 재설정 (예: 100MB) + `max_memory_restart` 상향
5. 업로드를 비동기 잡 큐로 분리 (중기)

---

# P2 — 보통

<a name="p2-1"></a>
## P2-1. REMO API 호출에 timeout 미설정

**파일**: `backend/src/infrastructure/external-services/remo-api.service.ts:466-489`

```ts
private async makeRequestWithRetry(method, url, data?, attempt = 1) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (method === 'GET')  return await axios.get(url, { headers });   // timeout 없음
    else                   return await axios.post(url, data, { headers }); // timeout 없음
  } catch (error) {
    if (this.shouldRetry(error) && attempt < this.maxRetries) {
      await this.delay(this.retryDelay * attempt);
      return this.makeRequestWithRetry(method, url, data, attempt + 1);
    }
    throw error;
  }
}
```

REMO API 가 응답하지 않으면 **요청이 무기한 대기**한다.
`shouldRetry` 는 `!error.response` (네트워크 오류)에 true 를 반환하므로,
행(hang) 상태에서는 재시도조차 트리거되지 않고 그대로 멈춘다.

이 상태의 요청이 쌓이면 Node 이벤트 루프의 소켓/메모리를 점유한다.
nginx 60초·프론트 300초 타임아웃과도 정합성이 없다 ([P1-1](#p1-1)).

**조치**: `timeout: 60000` 등 명시 + 재시도 백오프를 선형(`retryDelay * attempt`)에서
지수(`retryDelay * 2 ** attempt`)로 변경 검토.

---

<a name="p2-2"></a>
## P2-2. `dropSchema` / `synchronize` 위험 설정 잔존

**파일**: `backend/src/app.module.ts:109-111`

```ts
// WARNING: dropSchema will delete all data! Remove after first run.
dropSchema: configService.get('DB_DROP_SCHEMA') === 'true',
synchronize: configService.get('NODE_ENV') !== 'production',
```

### 문제
- 주석이 **"첫 실행 후 제거하라"** 고 명시하는데 제거되지 않았다
- 환경변수 `DB_DROP_SCHEMA=true` **하나로 전체 데이터가 삭제**된다.
  오타·잘못된 `.env` 복사·CI 환경변수 실수 한 번이면 복구 불가
- 개발 환경에서는 `synchronize: true` 이므로 엔티티를 고치는 순간
  로컬 DB 스키마가 자동 변경된다. `golf_swing_db_dump.sql` 같은
  실데이터 복사본을 로컬에 붙였다면 데이터 손상 가능

### 조치
`dropSchema` 라인 완전 삭제. `synchronize` 는 [P1-3](#p1-3) 마이그레이션 도입과 함께 `false` 고정.

---

<a name="p2-3"></a>
## P2-3. 크래시 로그 954MB 누적, 로테이션 미설정

```console
$ ls -la backend/logs/
backend-error-0.log   587.8M
backend-out-0.log     366.4M
backend-error-7.log     5.0M
backend-out-7.log       1.6M
```

[P0-1](#p0-1) 크래시 루프의 2차 피해. 2026-07-07 이후 50일 만에 588MB 가 쌓였다.
현재 디스크 여유 460GB(49% 사용)로 즉시 위험은 아니나, `pm2-logrotate` 가 설치되어 있지 않다.

**조치**: `pm2 install pm2-logrotate` + `max_size 10M` / `retain 7` / `compress true`.
P0-1 해결 후 기존 로그 삭제.

---

<a name="p2-4"></a>
## P2-4. REMO API 엔드포인트 불일치 + 평문 HTTP

| 위치 | 값 | 프로토콜 |
|------|-----|---------|
| `backend/.env` `REMO_API_URL` | `api.remo.re.kr` | **http** ⚠️ |
| `frontend/.env.local` `REMO_API_BASE_URL` | `api.rfremo.com` | https |
| `remo-api.service.ts:103` 코드 기본값 | `api.remo.re.kr` | **http** |

### 문제
1. **도메인이 서로 다르다.** 어느 쪽이 정식인지 코드만으로 판단 불가.
   프론트가 REMO 를 직접 호출하는 경로가 실제로 존재하는지 확인 필요 (**[추정]**)
2. 백엔드→REMO 가 **평문 HTTP**. API 키(`APIKey` 헤더)와
   base64 인코딩된 신체 촬영 이미지·영상이 암호화 없이 전송된다
3. API 키 미설정 시 `mock-api-key` 로 조용히 폴백한다
   ```ts
   if (!apiKey || !userEmail || !userKey) { this.apiKey = 'mock-api-key'; }
   ```
   → 프로덕션에서 설정이 누락돼도 **에러 없이 잘못 동작**한다

### 조치
정식 엔드포인트 확정 → 양쪽 통일 → **https 전환**.
프로덕션에서 키 누락 시 `mock-api-key` 폴백 대신 **부팅 실패**하도록 변경.

---

# P3 — 낮음

<a name="p3-1"></a>
## P3-1. 문서 14개 중복 및 8개월 전 정보

루트에 마크다운 14개 + `backend/docs/` 4개 = **18개**.
`README.md` / `PROJECT_SUMMARY.md` / `CURRENT_STATUS.md` / `SYSTEM_ARCHITECTURE.md` 는
상당 부분 같은 내용을 반복한다.

`CURRENT_STATUS.md` 헤더:
```
업데이트: 2025-12-11
현재 브랜치: feature/controllers      ← 현재는 main
전체 진행률: 95%
```
**8개월 이상 낡았고 브랜치 정보도 틀렸다.** `INTEGRATION_COMPLETE.md`,
`INTEGRATION_UPDATE_LOG.md`, `FRONTEND_INTEGRATION_SUMMARY.md` 등은
작업 완료 시점의 스냅샷이라 이미 역할이 끝났다.

`.claude/WORK_LOG.md` 는 "현재 진행 중인 작업: **없음** - 대기 중" 으로 남아 있어
2.4개월간의 장애를 전혀 반영하지 못한다.

**조치**: `docs/` 로 통합(본 문서 세트), 스냅샷 문서는 `docs/archive/` 로 이동,
`CURRENT_STATUS.md` 갱신.

---

<a name="p3-2"></a>
## P3-2. `ignoreBuildErrors: true` — 타입 오류 무시 배포

**파일**: `frontend/next.config.mjs:3-5`

```js
typescript: {
  ignoreBuildErrors: true,     // ← 타입 오류가 있어도 빌드 성공
},
```

TypeScript 를 쓰면서 타입 검사 결과를 버린다. `.github/workflows/deploy.yml` 에도
`tsc --noEmit` / lint 단계가 없으므로 **타입 오류가 프로덕션까지 그대로 간다.**

`images: { unoptimized: true }` 도 함께 설정돼 있어 Next.js 이미지 최적화가 꺼져 있다
(분석 결과 이미지가 많은 서비스이므로 성능 영향 가능 — **[추정]**).

**조치**: 현재 타입 오류 개수부터 측정(`npx tsc --noEmit`) → 해소 후 플래그 제거,
CI 에 타입체크 단계 추가.

---

<a name="p3-3"></a>
## P3-3. `axios` 가 backend devDependencies 에 위치

**파일**: `backend/package.json`

`remo-api.service.ts` 가 런타임에 `import axios from 'axios'` 하는데,
`axios` 가 `dependencies` 가 아닌 **`devDependencies`** 에 있다.

현재 `deploy.yml` 이 `npm ci --production=false` 를 쓰므로 설치되어 동작하지만,
누군가 `npm ci --omit=dev` 로 바꾸는 순간 **`MODULE_NOT_FOUND` 로 즉시 크래시**한다.
Docker 멀티스테이지 빌드 도입 시에도 동일하게 터진다.

**조치**: `axios` 를 `dependencies` 로 이동.
(`@nestjs/axios` 를 쓰지 않고 axios 를 직접 쓰는 점도 함께 검토 가치 있음)

---

# 부가: 토큰 저장 위치 및 CORS
<a name="부가-토큰-저장-위치"></a>

의도된 설계일 수 있어 별도 번호를 부여하지 않았으나 기록해 둔다.

### localStorage 토큰 저장 — `frontend/lib/api.ts`, `auth.ts`
`accessToken` / `refreshToken` / `user` 를 모두 `localStorage` 에 평문 저장한다.
XSS 취약점 1건이면 전부 탈취되며, [P0-2](#p0-2) 와 결합하면 7일 권한 탈취로 이어진다.
→ httpOnly 쿠키 전환이 정석이나, 리버스 프록시 구조 변경이 수반되므로 별도 과제.

### CORS `origin: true` — `backend/src/main.ts:19-24`
```ts
app.enableCors({
  origin: true,           // 모든 origin 반영
  credentials: true,
});
```
현재는 인증이 Bearer 토큰 기반이라 브라우저 자동 전송이 없어 실질 위험은 낮다.
다만 httpOnly 쿠키로 전환하면 **즉시 심각한 취약점이 된다.**
백엔드가 nginx 로 직접 노출되지 않는 현 구조에서는 `origin` 을
`https://golf.remo.re.kr` 로 좁혀도 무방하다.

---

# 긍정적으로 평가되는 부분
<a name="긍정적으로-평가되는-부분"></a>

문제만 나열하면 실제 코드 품질을 오해할 수 있어 함께 기록한다.

### 1. 소유권 검증(IDOR 방어)이 일관되게 적용됨 — **가장 잘 된 부분**
16개 지점에서 `userId !== req.user.sub` 를 검사한다.

```
body-posture.controller.ts:597       golf-swing.controller.ts:180, 396, 444, 478
UploadPostureImagesUseCase.ts:58     UploadSwingVideoUseCase.ts:46
UpdatePostureMemoUseCase.ts:32       UpdateSwingMemoUseCase.ts:32
GetPostureAnalysisUseCase.ts:28      GetSwingAnalysisUseCase.ts:30
GetCalendarDataUseCase.ts:39         GetAnalysisHistoryUseCase.ts:44
DeleteSubjectUseCase.ts:29           GetSubjectDetailUseCase.ts:36
UpdateSubjectUseCase.ts:34
```

멀티테넌트 시스템에서 가장 흔하고 치명적인 결함이 **빠짐없이 방어되어 있다.**
([P0-3](#p0-3) 의 이미지 엔드포인트만 예외 — 그래서 더 눈에 띈다)

### 2. Clean Architecture 가 형식이 아니라 실제로 지켜짐
Use Case 가 인터페이스에만 의존하고, 구현체는 `app.module.ts` 에서 토큰으로 주입된다.
NestJS 프로젝트에서 흔히 선언만 하고 지키지 않는 부분이 실제로 구현되어 있다.

### 3. 시크릿 위생이 양호
`.gitignore` 가 `.env` 계열을 광범위하게 커버하며,
**Git 히스토리 전체에 `.env` 커밋 이력이 없다.**

### 4. 비밀번호 해싱이 올바름
`bcrypt.compare` 사용, 평문 비교나 자체 구현 해시 없음.

### 5. 계정 상태 검증이 꼼꼼함
`LoginUserUseCase` 가 `suspended` / `inactive` 상태와
유료 회원 구독 만료까지 검증한다.

---

# `CLAUDE.md` 기존 미해결 이슈와의 대응

`CLAUDE.md` 에 기록된 9건은 **2025-12-11 E2E 테스트 시점의 UI/기능 이슈**로,
본 보고서의 인프라·보안 관점 분석과 층위가 다르다. 백엔드가 2.4개월간 죽어 있어
현재 재현 검증이 불가능하다.

| 기존 ID | 제목 | 본 보고서 연관 | 비고 |
|---------|------|---------------|------|
| C-01 | 체형 분석 이미지 필드 부족 (0/3) | [P1-3](#p1-3) | 스키마 변경 필요 → 마이그레이션 부재가 선결 과제. 4방향 이미지 vs 3개 결과 테이블 구조와 관련 |
| M-01 | 로그인 후 리다이렉트 실패 | [P1-2](#p1-2) | 이메일 로그인 설계 결함이 원인일 가능성 (**[추정]**) |
| M-02 | 회원 목록 렌더링 이슈 | — | 재현 필요 |
| M-03 | 스윙 타입 옵션 부족 | — | `SwingTypeEntity` 는 `full`/`half` 2종만 지원 |
| M-04 | 키 입력 필드 누락 | — | `height` 는 엔티티·API 에 존재. 프론트 UI 문제로 보임 |
| m-01~04 | UI 표시 문제 | — | 재현 필요 |

**→ P0-1 복구 후 E2E 재현부터 수행해야 이 9건의 현재 유효성을 판정할 수 있다.**
