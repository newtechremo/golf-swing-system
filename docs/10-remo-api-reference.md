# 10. REMO AI API 레퍼런스 — 외부 분석 엔진

**작성일**: 2026-08-27
**Base URL**: `https://api.remo.re.kr` (DNS `211.195.235.177`)
**검증 방법**: 실제 이미지·영상으로 직접 호출해 응답을 관측

> ⚠️ 이 문서는 **공식 스펙이 아니라 실측 기반 역공학 결과**다.
> REMO 측 문서와 다를 수 있으며, 응답 필드는 관측된 것만 기록했다.
> 자체 API 구조는 [09-api-reference.md](./09-api-reference.md) 참조.

---

# 1. REMO 는 무엇인가

**포즈 추정 기반 AI 분석 엔진.** 이미지/영상을 받아 관절 좌표를 추출하고
정렬·각도·자세를 수치화해 돌려준다.

**저장소가 아니다.** 결과를 받아 우리 DB 에 넣는 순간이 영속화 시점이다.
받지 못한 분석은 사실상 소실된다 — 실제로 크레딧이 차감됐는데 결과를 못 받은
레코드가 12건 있었다.

### 두 계열의 성격이 다르다 — 이것이 설계의 핵심

| | 골프 스윙 | 체형(자세) |
|---|---|---|
| 처리 방식 | **비동기** — 접수 후 별도 조회 | **동기** — 응답에 결과 포함 |
| 요청 응답 | `uuid` + `waitTime` 만 | 분석 결과 전체 (15~18 필드) |
| 결과 수신 | 별도 엔드포인트 폴링 | 불필요 |
| **실측 소요** | 분석 30~60초 | **0.42초** (3회 평균) |
| 우리 구현 | fire-and-forget + 폴링 | 동기 호출 유지 |

> 골프는 영상에서 8단계 구간을 찾아야 해서 오래 걸리고, 체형은 정지 이미지 한 장이라 즉시 끝난다.
> **이 차이 때문에 골프만 비동기화했다.** 체형까지 비동기화하면 상태 관리만 늘어난다.

---

# 2. 인증

모든 요청은 **JSON body 에 자격증명을 담아 POST** 한다. 헤더 인증이 아니다.

| 필드 | 값 (환경변수) | 비고 |
|------|--------------|------|
| `APIKey` | `REMO_API_KEY` | |
| `UserKey` | `REMO_API_USER_KEY` | |
| `Email` 또는 `id` | `REMO_API_EMAIL` | **엔드포인트마다 키 이름이 다르다** ⚠️ |

```jsonc
// 체형 계열 — 'Email'
{ "Email": "...", "UserKey": "...", "APIKey": "...", "forigimg": "<base64>" }

// 골프 계열 — 'id'
{ "id": "...", "uuid": "...", "UserKey": "...", "APIKey": "...", "base64_video": "<base64>" }

// 골프 결과 조회 — 자격증명 없이 id + uuid 만
{ "id": "...", "uuid": "..." }
```

> `Email` / `id` 혼용은 REMO 측 스펙이다. `remo-api.service.ts` 가 엔드포인트별로
> 맞춰 보내고 있으므로 신규 메서드 추가 시 기존 코드를 확인할 것.

### 프로토콜
- **HTTPS 사용** (`https://api.remo.re.kr`). HTTP(80)는 308 로 리다이렉트된다.
- 2026-08-26 이전에는 `http://` 로 설정되어 있어 API 키와 base64 이미지가
  **평문 첫 홉에 노출**됐다. 현재는 `https://` 로 수정됨.

### 크레딧
호출당 **1 크레딧** 차감. 응답에 `credit`(잔액)·`credit_change`(변화량)가 포함된다.
```
credit: 99982, credit_change: -1
```
크레딧 부족 시 `422`.

---

# 3. 체형(자세) 분석 API — 동기

## 3-1. 엔드포인트

| 방향 | 엔드포인트 | 이미지 필드 | 결과 접두사 |
|------|-----------|------------|------------|
| 정면 | `POST /api/analysis-skeleton-v2-front` | `forigimg` | `far_` |
| 측면 | `POST /api/analysis-skeleton-v2-side` | `sorigimg` | `sar_` |
| 후면 | `POST /api/analysis-skeleton-v2-back` | `borigimg` | `bar_` |

> **REMO 는 3방향만 제공한다.** 우리 시스템은 좌측면·우측면을 구분하지만
> **둘 다 같은 `side` 엔드포인트**로 보낸다 (`body-posture.controller.ts`).
> 그래서 DB 의 side 결과 테이블도 하나(`side_posture_results`)다.

## 3-2. 요청

```jsonc
POST /api/analysis-skeleton-v2-front
Content-Type: application/json

{
  "Email":   "<REMO_API_EMAIL>",
  "UserKey": "<REMO_API_USER_KEY>",
  "APIKey":  "<REMO_API_KEY>",
  "forigimg": "<base64 인코딩 JPEG>"
}
```

우리 백엔드는 전송 전 `sharp` 로 압축한다 (4MB → 약 30KB).

## 3-3. 응답 (실측)

### 공통 필드
| 필드 | 예시 | 설명 |
|------|------|------|
| `state` | `True` | 성공 여부 |
| `status_code` | `200` | |
| `APIName` | `Analysis-skeleton-v2-front` | |
| `uuid` | `65bbcc3a-3628-...` | **결과 재조회 키 — 반드시 저장할 것** |
| `credit` / `credit_change` | `99984` / `-1` | |
| `{f\|s\|b}origimg` | base64 66~125KB | **스켈레톤이 그려진 결과 이미지** |

> 🔴 **uuid 저장이 중요하다.** 2026-08-26 이전 코드는 `frontUuid: null` 로
> 하드코딩해 uuid 를 버렸고, 그 결과 `getAnalysis` 의 재조회 경로
> (`if (status === 'pending' && analysis.xxxUuid)`)가 **절대 실행되지 않았다.**

### 정면 (`far_` 접두사) — 좌우 대칭 지표
| 필드 | 의미 | 실측 예시 |
|------|------|----------|
| `far_coords` | 관절 좌표 22쌍 `[[x,y], ...]` | `[[368,290], [369,396], ...]` |
| `far_tilt_m_` / `_grade` | 전신 좌우 기울기 | `-0.167` / `0` |
| `far_head_bal_m_` / `_grade` | 머리 좌우 균형 | `-0.763` / `0` |
| `far_shoulder_bal_m_` / `_grade` | 어깨 좌우 높이 | `-0.633` / `0` |
| `far_pelvic_bal_m_` / `_grade` | 골반 좌우 기울기 | `0.064` / `0` |
| `far_knee_bal_m_` / `_grade` | 무릎 기울기 | `-0.25` / `0` |
| `far_left_qang_m_` / `_grade` | 왼다리 Q각 (O/X 다리) | `-1.973` / `0` |
| `far_right_qang_m_` / `_grade` | 오른다리 Q각 | `-3.495` / `0` |

### 측면 (`sar_` 접두사) — 앞뒤 자세 지표
| 필드 | 의미 | 실측 예시 |
|------|------|----------|
| `sar_coords` | 관절 좌표 22쌍 | |
| `sar_tilt_m_` | 전신 앞뒤 기울기 | `6.758` |
| `sar_head_tilt_m_` / `_grade` | 머리 앞뒤 기울기 | `-2.956` / `-1` |
| `turtle_neck_m_` / `_grade` | **거북목** | `29.385` / `0` |
| `round_shoulder_m_` / `_grade` | **라운드 숄더** | `1.497` / `0` |
| `bar_left_qang_grade` | (측면 응답에 포함됨 — 명명 불일치로 보임) | `1` |

### 후면 (`bar_` 접두사) — 정면과 동일 지표군
`bar_coords` · `bar_tilt_m_` · `bar_head_bal_m_` · `bar_shoulder_bal_m_` ·
`bar_pelvic_bal_m_` · `bar_knee_bal_m_` · `bar_left_qang_m_` · `bar_right_qang_m_`
(각각 `_grade` 동반)

### 값 체계
```
xxx_m_     : 측정값 (실수, 부호가 방향을 나타냄)
xxx_grade  : 등급  0 = 정상 / ±1 = 편차 방향
```

## 3-4. 결과 재조회
```jsonc
POST /api/analysis-walking-result
{ "id": "...", "uuid": "...", "UserKey": "...", "APIKey": "..." }
```
동기 API 라 보통 필요 없지만, uuid 로 나중에 다시 가져올 수 있다.

## 3-5. 관절 각도 조회
```jsonc
POST /api/analysis-FreeMotion-angle
{ "id": "...", "uuid": "...", "joint": "Hip", "UserKey": "...", "APIKey": "..." }
```
`joint` 기본값 `Hip`. 현재 우리 시스템에서 실사용하지 않는다.

---

# 4. 골프 스윙 분석 API — 비동기

## 4-1. 분석 요청

```jsonc
POST /api/analysis-golf

{
  "base64_video": "<base64 인코딩 영상>",
  "uuid":    "<우리가 생성한 UUID>",     // ⚠️ 클라이언트가 생성해서 보낸다
  "id":      "<REMO_API_EMAIL>",
  "height":  "175",                     // 대상자 신장 (cm)
  "UserKey": "...",
  "APIKey":  "..."
}
```
```jsonc
// 응답 — 결과가 아니라 접수증이다
{ "uuid": "...", "waitTime": 45, "fileExist": true, "credit": 99996 }
```

> **uuid 를 우리가 만들어서 보낸다.** 체형 분석은 REMO 가 만들어 돌려주는 것과 반대다.
> `UploadSwingVideoUseCase` 가 생성해 DB 에 저장한 뒤 REMO 로 전달한다.

## 4-2. 결과 조회

```jsonc
POST /api/analysis-golf-result
{ "id": "...", "uuid": "..." }        // 자격증명 불필요
```

### 응답 구조 (실측) — 8단계 구간
```jsonc
{
  "address":      { "frame", "head_location", "left_foot_fix", "shoulder_tilt", "stance", "upper_body_tilt" },
  "takeback":     { "frame", "left_arm_flexion", "left_shoulder_rotation", "right_arm_flexion", "right_hip_rotation" },
  "backswing":    { "frame", "head_location", "left_arm_flexion", "left_shoulder_rotation" },
  "backswingtop": { "frame", "head_location", "center_of_gravity", "reverse_spine", "right_hip_rotation", "right_leg_flexion" },
  "downswing":    { "frame", "center_of_gravity", "right_arm_rotation", "right_elbow_location" },
  "impact":       { "frame", "head_location", "hanging_back", "left_arm_flexion", "right_arm_flexion" },
  "follow":       { "frame", "center_of_gravity", "chicken_wing", "left_line_align" },
  "finish":       { "frame", "center_of_gravity", "left_foot_fix", "right_foot_rotation" }
}
```

각 구간의 `frame` 은 영상 내 프레임 번호다 → `golf_swing_types` 테이블에 저장되어
구간별 이미지 추출과 재생 위치 지정에 쓰인다.

### 지표 해설
| 지표 | 의미 |
|------|------|
| `shoulder_tilt` / `upper_body_tilt` | 어깨·상체 기울기 |
| `stance` | 스탠스 너비 |
| `head_location` | 머리 위치 유지 (스웨이 여부) |
| `left_arm_flexion` / `right_arm_flexion` | 팔 굽힘 |
| `left_shoulder_rotation` / `right_hip_rotation` | 회전량 |
| `center_of_gravity` | 무게중심 이동 |
| `reverse_spine` | 리버스 스파인 (역척추 각) |
| `chicken_wing` | 치킨윙 (팔꿈치 벌어짐) |
| `hanging_back` | 행잉백 (체중 뒤 잔류) |
| `left_foot_fix` / `right_foot_rotation` | 발 고정·회전 |
| `left_line_align` | 팔로우 정렬 |

> 이 지표들이 `GolfSwingScoreService` 에서 점수로 환산되고,
> `GOLF_SWING_COMMENTS` 상수(한/영 3단계 멘트)와 매칭되어
> `golf_swing_results` 99개 컬럼에 **(측정값 · 점수 · 코멘트)** 3종으로 저장된다.

## 4-3. 부가 조회

| 엔드포인트 | 반환 | 우리 사용 |
|-----------|------|----------|
| `POST /api/analysis-golf-angle` | 관절 각도 시계열 (`KneeLine` 등) | `golf_swing_angles` 저장 |
| `POST /api/analysis-golf-draw` | `base64_video` — 스켈레톤 오버레이 영상 | S3 업로드 후 `resultVideoUrl` |
| `POST /api/analysis-golf-images` | 8단계 구간 이미지 (base64) | `GET /analysis/:id/images` |

모두 `{ "id": ..., "uuid": ... }` 형태로 요청한다.

---

# 5. 상태·에러 코드

## 5-1. 진행 상태 (골프 결과 조회)

| 코드 | 의미 | 우리 처리 |
|------|------|-----------|
| 정상 응답 (`address` 존재) | 분석 완료 | `completed` 로 전이 |
| `533` | 결과 미준비 | `processing` 유지 |
| `534` | 분석 중 / 로그 미생성 | `processing` 유지 |
| **`520`** | **분석 실패 (확정)** | **`failed` 로 전이** |

### 520 의 실제 메시지 (실측)
```
first golf section recognition error, error: list index out of range
get golf result error, error: list index out of range
get golf score error, error: bad operand type for abs(): 'NoneType'
```
**영상에서 스윙 구간을 인식하지 못한 경우다.** 사용자에게는 원문 대신
"영상에서 스윙 동작을 인식하지 못했습니다. 전신이 나오도록 다시 촬영해 주세요." 로 안내한다.

## 5-2. 에러 코드 전체 (`REMO_ERROR_MESSAGES`)

### 입력 데이터
| 코드 | 의미 |
|------|------|
| 400 | 프로토콜 오류 |
| 411 | 입력 데이터 없음 |
| 412 | 이미지 파일 오류 |
| 413 / 414 / 415 | 정면 / 측면 / 후면 이미지 디코딩 실패 |
| **418** | **사진이 10도 이상 기울어짐** — 수평을 맞춰야 함 |

### 인증·크레딧
| 코드 | 의미 |
|------|------|
| 420 | 등록되지 않은 사용자 |
| 421 | API 키 오류 |
| **422** | **크레딧 부족** |

### 분석 실패 (사람 인식)
| 코드 | 방향 | 의미 |
|------|------|------|
| 511 / 512 / 518 | 정면 / 측면 / 후면 | **사람을 인식할 수 없음** — 전신이 보이게 재촬영 |
| 514 / 515 / 522 | 정면 / 측면 / 후면 | **촬영 각도 오류** — 해당 방향을 바라보고 촬영 |
| **517** | 정면 | **A자 포즈 미인식** — 팔은 몸 옆에, 다리는 어깨너비로 |

### 프로세스
| 코드 | 의미 |
|------|------|
| 550 / 559 | 분석 처리 중 오류 — 재시도 |

> 이 코드들은 `remo-api.service.ts:59-90` 에 한글 메시지로 매핑되어 있다.
> **사용자에게 재촬영 방법을 알려주는 것이 핵심**이므로 원문 노출을 피한다.

---

# 6. 우리 시스템의 REMO 연동 구조

## 6-1. `RemoApiService` (8개 메서드)

```
분석 요청
  requestGolfSwingAnalysis(videoBuffer, uuid, height)   → /api/analysis-golf
  requestBodyPostureAnalysis(imageBuffer, viewType)     → /api/analysis-skeleton-v2-{front|side|back}

결과 조회
  getGolfSwingAnalysisResult(uuid)      → /api/analysis-golf-result
  getGolfSwingAngleData(uuid)           → /api/analysis-golf-angle
  getGolfSwingDrawVideo(uuid)           → /api/analysis-golf-draw
  getGolfSwingImages(uuid)              → /api/analysis-golf-images
  getBodyPostureAnalysisResult(uuid)    → /api/analysis-walking-result
  getBodyPostureAngleData(uuid, joint)  → /api/analysis-FreeMotion-angle

편의 래퍼 (현재 컨트롤러에서 미사용)
  getCompleteGolfSwingAnalysis(uuid)
  getCompleteBodyPostureAnalysis(uuid, joint, viewType)
```

## 6-2. 공통 요청 처리 — `makeRequestWithRetry`

```ts
const config = { headers: {'Content-Type':'application/json'}, timeout: 180000 };
// 재시도 3회, 지수 백오프 (1s → 2s → 4s)
```

| 항목 | 값 | 비고 |
|------|-----|------|
| timeout | **180초** | 미설정 시 무응답에 무기한 대기했다 (2026-08-26 수정) |
| 재시도 | 3회 | `shouldRetry`: 네트워크 오류 또는 5xx |
| 백오프 | 지수 | 선형에서 변경 |

## 6-3. base64 오버헤드

REMO 는 **JSON body 에 base64 로 파일을 받는다.** multipart 가 아니다.

```
원본 100MB → base64 133MB (×4/3) → JSON 직렬화 사본
메모리 피크 약 370MB
```

이 때문에 영상 상한을 **100MB** 로 확정했다.
(`max_memory_restart: 2G` 안에 안전하게 들어온다)

> REMO 가 multipart 를 지원한다면 33% 오버헤드가 사라진다. **미확인 사항 — 문의 가치 있음.**

## 6-4. 자격증명 폴백

```ts
if (!apiKey || !userEmail || !userKey) {
  this.apiKey = 'mock-api-key';   // 개발 편의
}
```
> ⚠️ **프로덕션에서도 조용히 폴백한다.** 환경변수가 누락돼도 부팅에 성공하고
> 분석 요청 시점에야 실패한다. 프로덕션에서는 부팅 실패시키는 편이 낫다. **미수정.**

---

# 7. 실측 요약

2026-08-27 기준, 실제 호출로 확인한 값이다.

| 항목 | 결과 |
|------|------|
| `api.remo.re.kr` DNS | `211.195.235.177` |
| 포트 80 | OPEN → 308 리다이렉트 |
| 포트 443 | OPEN |
| 체형분석 응답시간 | **0.406 / 0.413 / 0.430초** (3회) |
| 체형분석 3방향 | **전부 정상** (`state: True` + uuid 반환) |
| 골프 결과 보관기간 | **최소 7개월** (2026-01-17 건도 응답) |
| 크레딧 잔액 | 약 99,982 (호출당 -1) |

> **골프 결과 보관기간이 길다는 점**은 재시도 정책의 근거가 된다.
> `processing` 으로 남은 레코드를 몇 달 뒤에도 `refresh` 로 회수 시도할 수 있다.

---

# 8. 연동 시 주의사항

| # | 항목 |
|---|------|
| 1 | **uuid 를 반드시 저장할 것** — 체형은 REMO 가 발급, 골프는 우리가 생성해 전달. 없으면 재조회 불가 |
| 2 | **`Email` vs `id`** — 엔드포인트마다 자격증명 키 이름이 다르다 |
| 3 | **520 은 확정 실패** — `processing` 유지하면 사용자가 영원히 대기한다 |
| 4 | **에러 코드를 사용자 안내로 번역할 것** — 511/514/517 등은 재촬영 방법을 알려주는 정보다 |
| 5 | **REMO 는 좌/우 측면을 구분하지 않는다** — 둘 다 `side` 엔드포인트 |
| 6 | **base64 오버헤드 ×4/3** — 업로드 상한 설계 시 반영 |
| 7 | **크레딧 소모형 API** — 테스트 호출도 차감된다. API 키가 노출되면 금전 피해 |
| 8 | **timeout 필수** — 미설정 시 재시도조차 걸리지 않는다 |
