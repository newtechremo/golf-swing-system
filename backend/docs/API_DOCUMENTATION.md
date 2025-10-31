# 골프 스윙 분석 시스템 API 문서

## 목차
1. [기본 정보](#기본-정보)
2. [인증 (Authentication)](#인증-authentication)
3. [대상자 관리 (Subjects)](#대상자-관리-subjects)
4. [골프 스윙 분석 (Golf Swing)](#골프-스윙-분석-golf-swing)
5. [신체 자세 분석 (Body Posture)](#신체-자세-분석-body-posture)
6. [분석 이력 (History)](#분석-이력-history)
7. [에러 코드](#에러-코드)

---

## 기본 정보

### Base URL
```
http://localhost:3003/api
```

> **변경 이력**: 2025-10-31 - 포트 3003으로 변경

### 인증 방식
- JWT (JSON Web Token) 기반 인증
- 로그인 후 받은 `accessToken`을 요청 헤더에 포함
- 헤더 형식: `Authorization: Bearer {accessToken}`

### 공통 응답 형식
성공 시:
```json
{
  "data": { ... },
  "message": "성공 메시지"
}
```

실패 시:
```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request"
}
```

---

## 인증 (Authentication)

### 1. 로그인
강사 계정으로 로그인하여 JWT 토큰을 발급받습니다.

**Endpoint:** `POST /api/auth/login`

**인증 필요:** ❌ No

**Request Body:**
```json
{
  "username": "instructor1",
  "password": "password123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| username | string | ✅ | 강사 아이디 |
| password | string | ✅ | 비밀번호 (최소 6자) |

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "instructor1",
    "name": "김코치",
    "phoneNumber": "010-1111-2222",
    "email": "coach1@example.com",
    "paymentType": "paid",
    "isCertified": false,
    "certificationNumber": null,
    "subscriptionEndDate": null,
    "status": "active",
    "centerId": 1
  }
}
```

**Error Responses:**
- `401 Unauthorized`: 아이디 또는 비밀번호가 잘못됨
- `400 Bad Request`: 요청 데이터 형식 오류

---

### 2. 토큰 갱신
Refresh Token으로 새로운 Access Token을 발급받습니다.

**Endpoint:** `POST /api/auth/refresh`

**인증 필요:** ✅ Yes (Refresh Token)

**Headers:**
```
Authorization: Bearer {refreshToken}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized`: Refresh Token이 유효하지 않음

---

## 대상자 관리 (Subjects)

### 1. 대상자 목록 조회
강사가 관리하는 대상자 목록을 조회합니다.

**Endpoint:** `GET /api/subjects`

**인증 필요:** ✅ Yes

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 10 | 페이지당 항목 수 |
| search | string | ❌ | - | 검색어 (이름, 전화번호) |
| status | string | ❌ | - | 상태 필터 (active, inactive, deleted) |

**Example Request:**
```
GET /api/subjects?page=1&limit=10&status=active
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "subjects": [
    {
      "id": 1,
      "phoneNumber": "010-1000-1000",
      "name": "홍길동",
      "birthDate": "1990-05-15T00:00:00.000Z",
      "gender": "M",
      "height": 175.5,
      "weight": 70.2,
      "status": "active",
      "createdAt": "2025-10-31T00:00:00.000Z",
      "analysisCount": {
        "golfSwing": 5,
        "posture": 3
      }
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 10
}
```

---

### 2. 대상자 상세 조회
특정 대상자의 상세 정보와 최근 분석 이력을 조회합니다.

**Endpoint:** `GET /api/subjects/:id`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 대상자 ID |

**Example Request:**
```
GET /api/subjects/1
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 1,
  "phoneNumber": "010-1000-1000",
  "name": "홍길동",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "gender": "M",
  "height": 175.5,
  "weight": 70.2,
  "email": "hong@example.com",
  "memo": null,
  "status": "active",
  "createdAt": "2025-10-31T00:00:00.000Z",
  "updatedAt": "2025-10-31T00:00:00.000Z",
  "recentAnalyses": {
    "golfSwing": [
      {
        "id": 1,
        "date": "2025-10-31",
        "swingType": "full",
        "status": "completed"
      }
    ],
    "posture": [
      {
        "id": 1,
        "date": "2025-10-30",
        "status": "completed"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found`: 대상자를 찾을 수 없음
- `403 Forbidden`: 해당 대상자에 대한 권한이 없음

---

### 3. 대상자 등록
새로운 분석 대상자를 등록합니다.

**Endpoint:** `POST /api/subjects`

**인증 필요:** ✅ Yes

**Request Body:**
```json
{
  "name": "홍길동",
  "phoneNumber": "010-1000-1000",
  "birthDate": "1990-05-15",
  "gender": "M",
  "height": 175.5,
  "weight": 70.2,
  "email": "hong@example.com",
  "memo": "VIP 회원"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | ✅ | 대상자 이름 |
| phoneNumber | string | ✅ | 전화번호 (010-0000-0000 형식) |
| birthDate | string | ❌ | 생년월일 (YYYY-MM-DD) |
| gender | string | ❌ | 성별 (M, F, Other) |
| height | number | ❌ | 키 (cm) |
| weight | number | ❌ | 몸무게 (kg) |
| email | string | ❌ | 이메일 |
| memo | string | ❌ | 메모 |

**Response (201 Created):**
```json
{
  "id": 6,
  "userId": 1,
  "name": "홍길동",
  "phoneNumber": "010-1000-1000",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "gender": "M",
  "height": 175.5,
  "weight": 70.2,
  "email": "hong@example.com",
  "memo": "VIP 회원",
  "status": "active",
  "createdAt": "2025-10-31T00:00:00.000Z",
  "updatedAt": "2025-10-31T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: 유효성 검사 실패 (전화번호 형식 등)
- `409 Conflict`: 이미 존재하는 전화번호

---

### 4. 대상자 정보 수정
대상자의 정보를 수정합니다.

**Endpoint:** `PUT /api/subjects/:id`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 대상자 ID |

**Request Body:**
```json
{
  "name": "홍길동",
  "height": 176.0,
  "weight": 71.5,
  "memo": "업데이트된 메모",
  "status": "active"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | ❌ | 대상자 이름 |
| birthDate | string | ❌ | 생년월일 (YYYY-MM-DD) |
| gender | string | ❌ | 성별 (M, F, Other) |
| height | number | ❌ | 키 (cm) |
| weight | number | ❌ | 몸무게 (kg) |
| email | string | ❌ | 이메일 |
| memo | string | ❌ | 메모 |
| status | string | ❌ | 상태 (active, inactive, deleted) |

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 1,
  "name": "홍길동",
  "phoneNumber": "010-1000-1000",
  "height": 176.0,
  "weight": 71.5,
  "memo": "업데이트된 메모",
  "status": "active",
  "updatedAt": "2025-10-31T00:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: 대상자를 찾을 수 없음
- `403 Forbidden`: 해당 대상자에 대한 권한이 없음

---

### 5. 대상자 삭제
대상자를 삭제합니다. (Soft Delete - 상태만 변경)

**Endpoint:** `DELETE /api/subjects/:id`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 대상자 ID |

**Response (204 No Content):**
```
(응답 본문 없음)
```

**Error Responses:**
- `404 Not Found`: 대상자를 찾을 수 없음
- `403 Forbidden`: 해당 대상자에 대한 권한이 없음

---

## 골프 스윙 분석 (Golf Swing)

### 1. 골프 스윙 비디오 업로드 및 분석 시작
골프 스윙 비디오를 업로드하고 분석을 시작합니다.

**Endpoint:** `POST /api/golf-swing/analyze`

**인증 필요:** ✅ Yes

**Content-Type:** `multipart/form-data`

**Form Data:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| video | file | ✅ | 골프 스윙 비디오 파일 (MP4, MOV 등) |
| subjectId | number | ✅ | 대상자 ID |
| swingType | string | ✅ | 스윙 타입 ("full" 또는 "half") ✨ 2025-10-31 추가 |
| height | string | ❌ | 대상자 키 (cm, 기본값: 대상자 등록 정보) |

**swingType 값:**
- `"full"`: 풀스윙 (8단계 분석)
- `"half"`: 하프스윙 (5단계 분석)

**Example Request:**
```bash
curl -X POST http://localhost:3003/api/golf-swing/analyze \
  -H "Authorization: Bearer {accessToken}" \
  -F "video=@swing_video.mp4" \
  -F "subjectId=1" \
  -F "swingType=full" \
  -F "height=175.5"
```

**Response (200 OK):**
```json
{
  "message": "골프 스윙 분석이 시작되었습니다.",
  "analysisId": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- `400 Bad Request`: 비디오 파일이 없음 또는 swingType이 잘못됨
  ```json
  {
    "statusCode": 400,
    "message": "스윙 타입은 \"full\" 또는 \"half\"여야 합니다.",
    "error": "Bad Request"
  }
  ```
- `404 Not Found`: 대상자를 찾을 수 없음
- `403 Forbidden`: 해당 대상자에 대한 권한이 없음

**구현 상태:**
- ✅ S3 업로드: 완료 (AWS S3 bucket: sppb-private)
- ✅ REMO API 연동: 완료 (분석 요청 자동 전송)
- ✅ SwingType 저장: 완료 (golf_swing_types 테이블)

---

### 2. 골프 스윙 분석 결과 조회
특정 골프 스윙 분석 결과를 조회합니다.

**Endpoint:** `GET /api/golf-swing/analysis/:id`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 분석 ID |

**Example Request:**
```
GET /api/golf-swing/analysis/1
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "subjectId": 1,
  "subjectName": "홍길동",
  "videoS3Key": "golf-swing/1/video.mp4",
  "videoUrl": "https://s3.amazonaws.com/bucket/...",
  "status": "completed",
  "analysisResult": {
    "score": 85,
    "feedback": "좋은 스윙입니다"
  },
  "memo": "첫 번째 분석",
  "createdAt": "2025-10-31T00:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: 분석을 찾을 수 없음
- `403 Forbidden`: 해당 분석에 대한 권한이 없음

---

### 3. 골프 스윙 분석 메모 업데이트
분석 결과에 메모를 추가하거나 수정합니다.

**Endpoint:** `PUT /api/golf-swing/analysis/:id/memo`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 분석 ID |

**Request Body:**
```json
{
  "memo": "스윙 궤도가 좋아졌습니다. 다음엔 그립을 개선해보세요."
}
```

**Response (200 OK):**
```json
{
  "message": "메모가 업데이트되었습니다."
}
```

**Error Responses:**
- `404 Not Found`: 분석을 찾을 수 없음
- `403 Forbidden`: 해당 분석에 대한 권한이 없음

---

## 신체 자세 분석 (Body Posture)

### 1. 신체 자세 이미지 업로드 및 분석 시작
정면, 측면, 후면 이미지를 업로드하고 분석을 시작합니다.

**Endpoint:** `POST /api/body-posture/analyze`

**인증 필요:** ✅ Yes

**Content-Type:** `multipart/form-data`

**Form Data:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| front | file | ✅ | 정면 이미지 |
| side | file | ✅ | 측면 이미지 |
| back | file | ✅ | 후면 이미지 |
| subjectId | number | ✅ | 대상자 ID |

**Example Request:**
```bash
curl -X POST http://localhost:4000/api/body-posture/analyze \
  -H "Authorization: Bearer {accessToken}" \
  -F "front=@front.jpg" \
  -F "side=@side.jpg" \
  -F "back=@back.jpg" \
  -F "subjectId=1"
```

**Response (200 OK):**
```json
{
  "message": "신체 자세 분석이 시작되었습니다.",
  "analysisId": 1,
  "uuids": {
    "front": "550e8400-e29b-41d4-a716-446655440001",
    "side": "550e8400-e29b-41d4-a716-446655440002",
    "back": "550e8400-e29b-41d4-a716-446655440003"
  }
}
```

**Error Responses:**
- `400 Bad Request`: 정면, 측면, 후면 이미지가 모두 필요함
- `404 Not Found`: 대상자를 찾을 수 없음

**Note:** 현재 S3 업로드와 REMO API 연동은 구현 대기 중입니다.

---

### 2. 신체 자세 분석 결과 조회
특정 신체 자세 분석 결과를 조회합니다.

**Endpoint:** `GET /api/body-posture/analysis/:id`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 분석 ID |

**Example Request:**
```
GET /api/body-posture/analysis/1
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "subjectId": 1,
  "subjectName": "홍길동",
  "images": {
    "front": {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "s3Key": "posture/1/front.jpg",
      "url": "https://s3.amazonaws.com/bucket/..."
    },
    "side": {
      "uuid": "550e8400-e29b-41d4-a716-446655440002",
      "s3Key": "posture/1/side.jpg",
      "url": "https://s3.amazonaws.com/bucket/..."
    },
    "back": {
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "s3Key": "posture/1/back.jpg",
      "url": "https://s3.amazonaws.com/bucket/..."
    }
  },
  "status": "completed",
  "analysisResult": {
    "posture_score": 75,
    "feedback": "전체적으로 양호합니다"
  },
  "memo": null,
  "createdAt": "2025-10-31T00:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found`: 분석을 찾을 수 없음
- `403 Forbidden`: 해당 분석에 대한 권한이 없음

---

### 3. 신체 자세 분석 메모 업데이트
분석 결과에 메모를 추가하거나 수정합니다.

**Endpoint:** `PUT /api/body-posture/analysis/:id/memo`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | number | 분석 ID |

**Request Body:**
```json
{
  "memo": "골반이 약간 틀어져 있습니다. 스트레칭이 필요합니다."
}
```

**Response (200 OK):**
```json
{
  "message": "메모가 업데이트되었습니다."
}
```

**Error Responses:**
- `404 Not Found`: 분석을 찾을 수 없음
- `403 Forbidden`: 해당 분석에 대한 권한이 없음

---

## 분석 이력 (History)

### 1. 대상자 분석 이력 조회
특정 대상자의 분석 이력을 조회합니다.

**Endpoint:** `GET /api/history/subject/:subjectId`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| subjectId | number | 대상자 ID |

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| type | string | ❌ | all | 분석 타입 (golf, posture, all) |
| startDate | string | ❌ | - | 시작 날짜 (YYYY-MM-DD) |
| endDate | string | ❌ | - | 종료 날짜 (YYYY-MM-DD) |
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 10 | 페이지당 항목 수 |

**Example Request:**
```
GET /api/history/subject/1?type=golf&page=1&limit=10
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "subject": {
    "id": 1,
    "name": "홍길동"
  },
  "history": [
    {
      "id": 1,
      "type": "golf-swing",
      "date": "2025-10-31",
      "time": "14:30:00",
      "swingType": "full",
      "status": "completed",
      "hasMemo": true
    },
    {
      "id": 2,
      "type": "posture",
      "date": "2025-10-30",
      "time": "10:15:00",
      "status": "completed",
      "hasMemo": false
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

**Error Responses:**
- `404 Not Found`: 대상자를 찾을 수 없음
- `403 Forbidden`: 해당 대상자에 대한 권한이 없음

---

### 2. 대상자 캘린더 데이터 조회
특정 월의 분석 데이터를 캘린더 형식으로 조회합니다.

**Endpoint:** `GET /api/history/subject/:subjectId/calendar`

**인증 필요:** ✅ Yes

**Path Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| subjectId | number | 대상자 ID |

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| year | number | ✅ | 연도 (예: 2025) |
| month | number | ✅ | 월 (1-12) |

**Example Request:**
```
GET /api/history/subject/1/calendar?year=2025&month=10
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "subject": {
    "id": 1,
    "name": "홍길동"
  },
  "year": 2025,
  "month": 10,
  "data": [
    {
      "date": "2025-10-31",
      "analyses": [
        {
          "id": 1,
          "type": "golf-swing",
          "swingType": "full",
          "time": "14:30:00",
          "status": "completed"
        },
        {
          "id": 2,
          "type": "posture",
          "time": "10:15:00",
          "status": "completed"
        }
      ]
    },
    {
      "date": "2025-10-30",
      "analyses": [
        {
          "id": 3,
          "type": "golf-swing",
          "swingType": "half",
          "time": "16:00:00",
          "status": "completed"
        }
      ]
    }
  ],
  "summary": {
    "totalAnalyses": 12,
    "golfSwingCount": 8,
    "postureCount": 4
  }
}
```

**Error Responses:**
- `404 Not Found`: 대상자를 찾을 수 없음
- `403 Forbidden`: 해당 대상자에 대한 권한이 없음

---

## 에러 코드

### HTTP 상태 코드
| 코드 | 설명 |
|------|------|
| 200 | OK - 요청 성공 |
| 201 | Created - 리소스 생성 성공 |
| 204 | No Content - 요청 성공, 응답 본문 없음 |
| 400 | Bad Request - 잘못된 요청 |
| 401 | Unauthorized - 인증 실패 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스를 찾을 수 없음 |
| 409 | Conflict - 리소스 충돌 (중복 등) |
| 500 | Internal Server Error - 서버 내부 오류 |

### 주요 에러 메시지
| 메시지 | 설명 |
|--------|------|
| "아이디 또는 비밀번호가 잘못되었습니다." | 로그인 실패 |
| "Refresh Token이 필요합니다." | 토큰 갱신 시 헤더 누락 |
| "대상자를 찾을 수 없습니다." | 존재하지 않는 대상자 ID |
| "해당 대상자에 대한 권한이 없습니다." | 다른 강사의 대상자 접근 시도 |
| "전화번호는 010-0000-0000 형식이어야 합니다." | 전화번호 형식 오류 |
| "비디오 파일이 필요합니다." | 파일 업로드 누락 |
| "정면, 측면, 후면 이미지가 모두 필요합니다." | 자세 분석 이미지 누락 |

---

## 테스트 계정

개발 및 테스트용 계정 정보입니다.

```
Username: instructor1
Password: password123
```

---

## 변경 이력

### v1.0.0 (2025-10-31)
- 초기 API 문서 작성
- 인증, 대상자 관리, 분석, 이력 API 문서화
- 모든 엔드포인트 예시 추가

---

## 연락처

문의사항이나 버그 리포트는 백엔드 개발팀에게 문의해주세요.
