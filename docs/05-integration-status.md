# 05. 연동 현황 검토 — GitHub · AI API · 서버 구조

**검증일**: 2026-08-26 / **검증 방법**: 실제 명령 실행 및 네트워크 프로브
**전제**: 서버가 중단 후 **새 환경으로 이전되었고 IP가 변경**되었으며, 이후 실행 세팅이 수행되지 않음

---

## 결론 요약

| 검토 항목 | 판정 | 핵심 |
|-----------|------|------|
| GitHub 연동 | 🟡 **연결은 정상, 배포 파이프라인은 무효** | 원격·인증·Actions 모두 정상이나 `SERVER_HOST` 가 구 서버를 가리킴 |
| REMO AI API 서버 | 🟢 **정상 작동 중** | 80/443 OPEN, 엔드포인트 응답 확인. **AI API 는 문제 없음** |
| API 포트 | 🟢 정상 | `api.remo.re.kr` 80(308→https) / 443 모두 OPEN |
| 서버 구조 | 🔴 **DNS 미갱신으로 외부 접근 전면 불가** | 5개 도메인이 죽은 구 IP를 가리킴 |
| 로컬 인프라 | 🟢 준비 완료 | nginx·포트포워딩·인증서 모두 정상. **DNS만 바꾸면 됨** |

### 한 줄 결론

> **서버 자체와 AI API 는 멀쩡하다. 문제는 "이사 후 주소 이전 신고를 안 한 것"이다.**
> DNS A 레코드가 구 IP(`49.168.236.221`)를 가리키고 그 IP 는 죽어 있어,
> 새 서버(`49.169.8.19`)가 준비를 마쳤는데도 트래픽이 도달하지 않는다.

---

## 1. 근본 원인 — 서버 이전 후 미수행 세팅

### 1-1. IP 변경 사실 확인

| 구분 | 구 환경 | **현 환경** |
|------|---------|-------------|
| 공인 IP | `49.168.236.221` | **`49.169.8.19`** |
| 내부 IP | `192.168.0.244` | **`192.168.219.44`** |
| 부팅 시각 | — | **2026-08-12 10:38** (2주 전) |

```console
$ curl -s https://api.ipify.org
49.169.8.19                      ← 현재 공인 IP

$ hostname -I
192.168.219.44 ...               ← 현재 내부 IP (NAT 뒤)
```

`frontend/next.config.mjs:14-15` 에 **구 IP 2개가 그대로 박제**되어 있어
이전 전 환경을 역추적할 수 있었다.
```js
allowedDevOrigins: [
  'remo-data-bridge.remo.re.kr',
  'remobodys.remo.re.kr',
  '49.168.236.221',      // ← 구 공인 IP
  '192.168.0.244',       // ← 구 내부 IP
  'golf.remo.re.kr',
],
```

### 1-2. 이전 후 미수행 항목 (체크리스트)

| # | 항목 | 상태 | 영향 |
|---|------|------|------|
| 1 | **DNS A 레코드 갱신** | ❌ 미수행 | 🔴 외부 접근 전면 불가 |
| 2 | `golf_mysql` 컨테이너 기동 | ❌ 미수행 | 🔴 백엔드 크래시 루프 |
| 3 | 컨테이너 재시작 정책 | ❌ `no` | 🔴 재부팅 시 자동 미복구 |
| 4 | GitHub Actions `SERVER_HOST` 갱신 | ❌ 미수행 | 🟠 배포 파이프라인 무효 |
| 5 | `next.config.mjs` 구 IP 정리 | ❌ 미수행 | 🟡 개발 모드 접근 제약 |
| 6 | nginx 설정 | ✅ 정상 이관됨 | — |
| 7 | 포트포워딩 80/443 | ✅ 정상 | — |
| 8 | SSL 인증서 | ✅ 존재 | 🟡 갱신 시 DNS 필요 |
| 9 | PM2 프로세스 등록 | ✅ 복원됨 | — |

---

## 2. GitHub 연동 현황

### 2-1. 저장소 연결 — 🟢 정상

```console
$ git ls-remote --heads origin
7e34b4709ee43280035b61770184462d462d00bd  refs/heads/main     ← 인증·연결 정상

$ gh auth status
✓ Logged in to github.com account newtechremo (keyring)
  Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

| 항목 | 값 |
|------|-----|
| 원격 | `https://github.com/newtechremo/golf-swing-system` |
| 프로토콜 | HTTPS (토큰 인증) |
| 계정 | `newtechremo` |
| 토큰 스코프 | `repo`, `workflow` 포함 — **푸시·Actions 조작 가능** |
| 동기화 | `main` == `origin/main` == `7e34b47` (ahead 0 / behind 0) |

**→ Git 연동 자체는 완전히 정상이다.** 서버 이전과 무관하게 살아 있다.

### 2-2. GitHub Actions — 🟡 설정은 살아있으나 **대상 서버가 잘못됨**

**워크플로**: `.github/workflows/deploy.yml` — `main` push 시 SSH 로 서버 접속 후 빌드·PM2 재시작

**실행 이력** (전체 5회):
```
2026-01-15T00:11:20  success  main  fix: Limit login page height to image aspect ratio  ← 마지막
2026-01-15T00:05:40  success  main  Merge branch 'feature/controllers' into main
2026-01-13T05:31:21  success  main  Deploy to Production
2026-01-13T05:29:17  success  main  fix: Update deploy workflow to use password authen…
2026-01-13T05:23:37  failure  main  feat: Add PM2 config and GitHub Actions deployment…
```

**Secrets** (이름·갱신시각만 조회 가능):
```
PROJECT_PATH      2026-01-13T05:31:01Z
SERVER_HOST       2026-01-13T05:29:06Z     ← 구 서버 시절 설정값
SERVER_PASSWORD   2026-01-13T05:29:07Z
SERVER_PORT       2026-01-13T05:29:08Z
SERVER_USER       2026-01-13T05:29:07Z
```

### 🔴 문제

모든 secret 이 **2026-01-13 에 설정된 뒤 갱신되지 않았다.**
서버 이전은 그 이후에 일어났으므로, `SERVER_HOST` 는 거의 확실히
**구 IP(`49.168.236.221`) 또는 구 서버 호스트명**을 담고 있다.

구 IP 는 현재 **443 포트 CLOSED / HTTP 응답 없음** 상태다:
```console
$ timeout 6 bash -c "</dev/tcp/49.168.236.221/443"
49.168.236.221:443  CLOSED/TIMEOUT
```

**→ 지금 `main` 에 push 하면 배포가 죽은 서버로 향해 실패하거나,
최악의 경우 그 IP 를 할당받은 제3자 서버에 SSH 접속을 시도한다.**
(`SERVER_PASSWORD` 방식이라 비밀번호가 타 서버로 전송될 위험이 있다 — 아래 참조)

### 🔴 부가 위험 — SSH 비밀번호 인증

커밋 `8d302cd "fix: Update deploy workflow to use password authentication"` 이
의도적으로 키 인증에서 **비밀번호 인증으로 전환**했다.

```yaml
- uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    password: ${{ secrets.SERVER_PASSWORD }}    # ← 키가 아닌 비밀번호
```

IP 재할당은 흔한 일이므로, **구 IP 를 넘겨받은 타인의 서버에
계정명·비밀번호가 그대로 전달될 수 있다.** SSH 키 인증(`key:`)으로
되돌리는 것을 강력히 권한다.

### 2-3. 배포 파이프라인의 구조적 결함 (이전과 무관)

```yaml
git pull origin main
cd backend  && npm ci --production=false && npm run build
cd frontend && npm ci --production=false && npm run build
pm2 startOrRestart ecosystem.config.js --env production
```

| 결함 | 영향 |
|------|------|
| **DB 마이그레이션 단계 없음** | 프로덕션은 `synchronize:false` → 스키마 변경이 영영 반영 안 됨 |
| **헬스체크 없음** | 배포 후 실제 기동 여부를 확인하지 않음. 크래시 루프여도 "success" |
| **롤백 없음** | 실패 시 수동 복구만 가능 |
| **테스트/타입체크 없음** | `ignoreBuildErrors:true` 와 결합해 오류가 그대로 배포됨 |

> **이번 장애가 5회 배포 모두 "success" 로 기록된 것과 같은 맥락이다.**
> 배포 성공 ≠ 서비스 정상. 헬스체크가 없으면 알 수 없다.

---

## 3. AI API 서버(REMO) 연동 현황 — 🟢 정상

### 3-1. 포트 작동 확인 — **정상**

```console
$ dig +short api.remo.re.kr
211.195.235.177                            ← DNS 정상

$ timeout 6 bash -c "</dev/tcp/api.remo.re.kr/80"   → OPEN
$ timeout 6 bash -c "</dev/tcp/api.remo.re.kr/443"  → OPEN

$ curl -o /dev/null -w "%{http_code}" http://api.remo.re.kr/     → 308  (https 리다이렉트)
$ curl -o /dev/null -w "%{http_code}" https://api.remo.re.kr/    → 404  (루트는 없음, 정상)
```

| 포트 | 상태 | 응답 |
|------|------|------|
| 80 | 🟢 **OPEN** | 308 → `https://api.remo.re.kr/...` 로 영구 리다이렉트 |
| 443 | 🟢 **OPEN** | 정상 (루트 404 는 API 서버로서 자연스러움) |

### 3-2. 엔드포인트 생존 확인 — **살아 있음**

빈 body 로 POST 하여 응답 코드만 확인했다(실제 분석 요청 아님):

```console
POST https://api.remo.re.kr/api/analysis-golf              -> 400
POST https://api.remo.re.kr/api/analysis-golf-result       -> 413
POST https://api.remo.re.kr/api/analysis-skeleton-v2-front -> 400
```

**400/413 은 "엔드포인트가 존재하며 요청을 파싱했다"는 뜻이다** (404/502 가 아님).
→ **REMO AI 분석 서버는 정상 가동 중이며, 우리 쪽 백엔드만 살리면 즉시 연동 가능하다.**

### 3-3. 🟠 설정 문제 1 — 백엔드가 평문 HTTP 로 호출

`backend/.env`:
```
REMO_API_URL=http://api.remo.re.kr        ← http
```

REMO 서버가 80 → 443 으로 **308 리다이렉트**하므로 axios 는 이를 따라가
동작 자체는 성립한다(308 은 method·body 를 보존). 그러나:

- **첫 요청이 평문으로 나간다.** `APIKey` 헤더와 base64 인코딩된
  신체 촬영 이미지·스윙 영상이 암호화 없이 전송된다
- 리다이렉트 왕복으로 **매 호출마다 불필요한 1회 추가 통신**이 발생한다
  (500MB 영상 base64 ≈ 667MB 페이로드에서는 무시할 수 없다)

**조치**: `REMO_API_URL=https://api.remo.re.kr` 로 변경.
`remo-api.service.ts:103` 의 코드 기본값도 함께 수정.

### 3-4. 🟠 설정 문제 2 — `api.rfremo.com` 은 **존재하지 않는 도메인**

```console
$ getent hosts api.rfremo.com
(없음)

$ dig +short api.rfremo.com
(응답 없음 — NXDOMAIN)
```

`frontend/.env.local`:
```
REMO_API_BASE_URL=https://api.rfremo.com   ← 해석 불가 도메인
```

**다행히 실제 영향은 없다.** 코드 전체를 검색한 결과:
```console
$ grep -rn "REMO_API_BASE_URL\|rfremo" frontend --include=*.ts --include=*.tsx --include=*.mjs
(사용처 없음)

$ find frontend/app -name 'route.ts'
(API 라우트 없음)
```

프론트엔드는 REMO 를 **직접 호출하지 않는다.** 모든 REMO 통신은 백엔드를 경유한다.
즉 이 설정은 **사용되지 않는 죽은 설정(dead config)** 이다.

**조치**: 혼란 방지를 위해 `frontend/.env.local` 에서 `REMO_API_BASE_URL`·`REMO_API_KEY`
2줄을 삭제한다. (프론트에 REMO 키를 두는 것 자체가 불필요한 노출면이다)

### 3-5. 🟡 설정 문제 3 — 키 누락 시 조용한 폴백

`remo-api.service.ts:108-116`:
```ts
if (!apiKey || !userEmail || !userKey) {
  this.apiKey = 'mock-api-key';        // ← 에러 없이 가짜 키로 계속 진행
}
```

프로덕션에서 환경변수가 누락돼도 **부팅에 성공하고, 분석 요청 시점에야 실패**한다.
서버 이전 같은 상황에서 `.env` 가 누락되면 원인 파악이 지연된다.
→ 프로덕션에서는 부팅 실패시키는 것이 옳다.

### 3-6. REMO 연동 코드 상태 — 정상

`remo-api.service.ts` 에 8개 메서드가 구현되어 있고 재시도(3회)·에러 처리가 갖춰져 있다.
다만 **timeout 이 설정되지 않아** 무응답 시 무한 대기한다
([03번 문서 P2-1](./03-issue-analysis.md) 참조).

---

## 4. 서버 구조 검토

### 4-1. 🔴 치명 — DNS 가 죽은 구 IP를 가리킨다

**이번 장애의 진짜 최상위 원인이다.**

```console
$ dig +short golf.remo.re.kr
49.168.236.221                        ← 구 IP

$ curl --max-time 10 https://golf.remo.re.kr/
(응답 없음, exit 28 timeout)          ← 외부 접근 전면 불가

$ timeout 6 bash -c "</dev/tcp/49.168.236.221/443"
CLOSED/TIMEOUT                         ← 구 IP 는 죽어 있음
```

> 📌 **02번 문서의 "nginx 502" 기록은 `https://localhost/` 프로브 결과였다.**
> 실제 도메인은 502 조차 아니고 **응답 자체가 없다.** 더 심각한 상태다.

### 이 문제는 golf 만의 문제가 아니다

같은 서버가 호스팅하던 도메인 전체를 조회한 결과:

| 도메인 | DNS A 레코드 | 판정 |
|--------|-------------|------|
| `golf.remo.re.kr` | `49.168.236.221` | ❌ 구 IP |
| `remo-data-bridge.remo.re.kr` | `49.168.236.221` | ❌ 구 IP |
| `remobodys.remo.re.kr` | `49.168.236.221` | ❌ 구 IP |
| `scoliosis.remo.re.kr` | `49.168.236.221` | ❌ 구 IP |
| `barrierfree.remo.re.kr` | `49.168.236.221` | ❌ 구 IP |
| `api.well-aging.kr` | `218.50.254.48` | (별도 인프라) |

**`*.remo.re.kr` 5개 도메인 전부가 죽은 IP를 가리킨다.**
이 서버에서 PM2 로 돌아가는 다른 프로젝트들(espotec, wellaging, remo-data-bridge 등)도
**전부 외부 접근 불가 상태일 가능성이 매우 높다.**
→ **골프 프로젝트만의 문제가 아니라 서버 이전 후속 작업 전체가 누락된 것이다.**

### 4-2. 🟢 로컬 인프라는 준비 완료 — DNS만 바꾸면 즉시 살아난다

이것이 좋은 소식이다. 서버 쪽은 이미 트래픽을 받을 준비가 끝나 있다.

**① nginx 정상 가동·바인딩**
```console
$ systemctl is-active nginx
active

$ ss -tlnp | grep -E ':80 |:443 '
LISTEN  0  511  0.0.0.0:443  0.0.0.0:*
LISTEN  0  511  0.0.0.0:80   0.0.0.0:*
```

**② golf.remo.re.kr vhost 설정이 이관되어 동작**
```console
$ curl -k -o /dev/null -w "%{http_code}" -H "Host: golf.remo.re.kr" https://127.0.0.1/
200                                    ← 도메인만 도달하면 정상 서빙됨
```

**③ 포트포워딩(NAT) 정상 — 제3자 관점 검증**

이 서버는 NAT 뒤(`192.168.219.44`)에 있어 자기 공인 IP 로의 접근이
헤어핀 NAT 때문에 실패한다. 그래서 외부 서비스로 검증했다:
```console
$ curl https://portchecker.io/api/query -d '{"host":"49.169.8.19","ports":[80]}'
{"check":[{"port":80,"status":true}]}     ← OPEN

$ ... ports:[443]
{"check":[{"port":443,"status":true}]}    ← OPEN
```

**→ 새 환경의 80/443 포트포워딩은 이미 정상 설정되어 있다.**

**④ SSL 인증서 존재**
`/etc/nginx/sites-available/golf.remo.re.kr` 가
`/etc/letsencrypt/live/golf.remo.re.kr/fullchain.pem` 을 참조하며 nginx 가 정상 기동 중이므로
인증서 파일은 존재한다.
> ⚠️ 단 **Let's Encrypt 갱신은 DNS 가 이 서버를 가리켜야 성공한다.**
> DNS 를 방치하면 인증서 만료 시 HTTPS 자체가 끊긴다. 시한이 있는 문제다.

### 4-3. 🟡 아키텍처 자체에 대한 평가

DNS·DB 문제를 걷어내고 구조만 보면 다음과 같다.

```
인터넷 → nginx(443) → Next.js(3000) → [rewrites] → NestJS(3003) → MySQL / REMO / S3
```

**합리적인 부분**
- 백엔드가 외부에 직접 노출되지 않는다 (Next.js 를 경유)
- nginx 에서 TLS 종료, 인증서 자동 갱신 구성
- PM2 로 프로세스 관리 + `pm2 save` 로 재부팅 복원

**구조적 약점**

| # | 문제 | 설명 |
|---|------|------|
| 1 | **Next.js 가 API 게이트웨이 겸업** | `rewrites()` 로 백엔드 프록시. 프론트가 죽으면 API 도 죽는다. nginx 에서 `/backend-api/` 를 직접 `:3003` 으로 보내는 편이 단순하고 견고하다 |
| 2 | **DB 가 도커 단독 컨테이너** | `docker-compose.yml` 이 없다. `docker run` 으로 임의 생성되어 **구성이 코드로 남아있지 않다.** 재생성 시 파라미터를 알 수 없다 |
| 3 | **재시작 정책 부재** | `golf_mysql` 이 `restart: no`. 이번 장애의 직접 원인 |
| 4 | **기동 순서 보장 없음** | DB 준비 전에 백엔드가 뜨면 그대로 크래시. depends_on/healthcheck 없음 |
| 5 | **헬스체크·모니터링 전무** | 2.4개월간 아무도 몰랐다 |
| 6 | **9개 프로젝트가 한 호스트에 혼재** | PM2 목록에 golf/espotec/wellaging/remo-data-bridge 등 11개 프로세스. 크래시 루프가 이웃 프로젝트 자원을 갉아먹는다 |
| 7 | **환경별 설정 분리 부재** | `.env` 하나에 `NODE_ENV=development` 인데 PM2 는 `production` 주입. 어느 쪽이 유효한지 코드를 읽어야만 안다 |

---

## 5. 조치 우선순위

| 순위 | 조치 | 소요 | 담당 영역 |
|------|------|------|-----------|
| **1** | **DNS A 레코드 5건을 `49.169.8.19` 로 변경** | 10분 + 전파 | 도메인 관리자 |
| **2** | `docker start golf_mysql` + `--restart unless-stopped` | 15분 | 서버 |
| **3** | GitHub Actions `SERVER_HOST` 갱신 + **SSH 키 인증 전환** | 20분 | GitHub |
| **4** | `REMO_API_URL` 을 `https://` 로 변경 | 5분 | 코드 |
| **5** | `frontend/.env.local` 의 죽은 `rfremo` 설정 삭제 | 2분 | 코드 |
| **6** | `next.config.mjs` 의 구 IP → 신 IP 교체 | 5분 | 코드 |
| **7** | 인증서 갱신 확인 (DNS 전파 후) | 10분 | 서버 |
| **8** | 헬스체크 + 모니터링 도입 | 반나절 | 운영 |
| **9** | `docker-compose.yml` 작성 (DB 구성 코드화) | 2시간 | 인프라 |

### 1번 — DNS 변경 (가장 중요)

도메인 등록기관/DNS 제공자 콘솔에서:
```
golf.remo.re.kr              A    49.168.236.221  →  49.169.8.19
remo-data-bridge.remo.re.kr  A    49.168.236.221  →  49.169.8.19
remobodys.remo.re.kr         A    49.168.236.221  →  49.169.8.19
scoliosis.remo.re.kr         A    49.168.236.221  →  49.169.8.19
barrierfree.remo.re.kr       A    49.168.236.221  →  49.169.8.19
```

> ⚠️ **선결 확인**: `49.169.8.19` 가 **고정 IP인지 확인해야 한다.**
> 가정용 회선의 유동 IP라면 재부팅 때마다 같은 문제가 반복된다.
> 유동 IP라면 DDNS 또는 고정 IP 회선 전환이 필요하다.

전파 확인:
```bash
dig +short golf.remo.re.kr        # 49.169.8.19 로 바뀌면 성공
curl -o /dev/null -w "%{http_code}\n" https://golf.remo.re.kr/
```

### 3번 — GitHub Actions 갱신

```bash
gh secret set SERVER_HOST      # 새 IP 또는 도메인 입력
gh secret set SERVER_PORT      # SSH 포트 확인 후
gh secret set PROJECT_PATH     # /home/finefit-temp/Desktop/project/golf-swing-system
```

동시에 `deploy.yml` 을 **키 인증으로 전환**한다:
```yaml
- uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SERVER_SSH_KEY }}     # password → key
    port: ${{ secrets.SERVER_PORT }}
```

그리고 마지막에 헬스체크를 추가해 "성공했는데 죽어있는" 상황을 막는다:
```yaml
    sleep 15
    curl -fsS http://localhost:3003/api/health || { pm2 logs golf-backend --lines 50 --nostream; exit 1; }
```
(`/api/health` 엔드포인트는 백엔드에 신규 추가 필요)

### 4~6번 — 설정 파일 수정

```diff
# backend/.env
- REMO_API_URL=http://api.remo.re.kr
+ REMO_API_URL=https://api.remo.re.kr
```
```diff
# frontend/.env.local  (미사용 죽은 설정 제거)
- REMO_API_BASE_URL=https://api.rfremo.com
- REMO_API_KEY=...
```
```diff
# frontend/next.config.mjs
  allowedDevOrigins: [
    'remo-data-bridge.remo.re.kr',
    'remobodys.remo.re.kr',
-   '49.168.236.221',
-   '192.168.0.244',
+   '49.169.8.19',
+   '192.168.219.44',
    'golf.remo.re.kr',
  ],
```

---

## 6. 검증 절차 (조치 후)

```bash
# 1. DNS 전파
dig +short golf.remo.re.kr                                    # → 49.169.8.19

# 2. DB
docker ps | grep golf_mysql                                   # → Up (healthy)
ss -tln | grep 3306                                           # → LISTEN

# 3. 백엔드
pm2 list | grep golf-backend                                  # → online, restarts 안정
ss -tln | grep 3003                                           # → LISTEN

# 4. 내부 연동
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/backend-api/subjects   # → 401 (정상)

# 5. 외부 접근
curl -o /dev/null -w "%{http_code}\n" https://golf.remo.re.kr/                     # → 200

# 6. REMO 연동 (백엔드 기동 후 로그로 확인)
pm2 logs golf-backend --lines 50 | grep -i remo

# 7. 인증서 만료일
echo | openssl s_client -connect golf.remo.re.kr:443 -servername golf.remo.re.kr 2>/dev/null \
  | openssl x509 -noout -dates
```

**성공 기준**: 4번이 `500` → `401` 로, 5번이 `000` → `200` 으로 바뀌면 복구 완료다.
