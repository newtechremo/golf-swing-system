# FINEFIT Park Golf API 명세서
## 프론트엔드 개발자용

> **버전**: v1.0.0
> **Base URL**: `http://localhost:3000/api`
> **인증 방식**: JWT Bearer Token

---

## 목차
1. [인증 (Authentication)](#1-인증-authentication)
2. [회원 관리 (Member Management)](#2-회원-관리-member-management)
3. [골프 스윙 분석 (Golf Swing Analysis)](#3-골프-스윙-분석-golf-swing-analysis)
4. [체형 분석 (Body Posture Analysis)](#4-체형-분석-body-posture-analysis)
5. [분석 이력 (Analysis History)](#5-분석-이력-analysis-history)
6. [PDF 생성 (PDF Generation)](#6-pdf-생성-pdf-generation)
7. [에러 코드](#7-에러-코드)

---

## 1. 인증 (Authentication)

### 1.1 강사 로그인
**POST** `/auth/instructor/login`

강사가 시스템에 로그인합니다.

**Request Body**:
```json
{
  "username": "instructor001",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "instructor": {
      "id": 1,
      "username": "instructor001",
      "name": "김강사",
      "phoneNumber": "010-1234-5678",
      "email": "instructor@example.com",
      "paymentType": "paid",
      "isCertified": true,
      "certificationNumber": "CERT-2024-001",
      "subscriptionEndDate": "2025-12-31",
      "status": "active"
    }
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "아이디 또는 비밀번호가 올바르지 않습니다."
  }
}
```

---

### 1.2 회원 로그인 (전화번호)
**POST** `/auth/member/login`

회원이 전화번호로 로그인합니다.

**Request Body**:
```json
{
  "instructorId": 1,
  "phoneNumber": "010-9876-5432"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "member": {
      "id": 10,
      "phoneNumber": "010-9876-5432",
      "name": "홍길동",
      "birthDate": "1990-01-01",
      "gender": "M",
      "height": 175.5,
      "weight": 70.0,
      "status": "active",
      "instructor": {
        "id": 1,
        "name": "김강사"
      }
    }
  }
}
```

**Response** (404 Not Found - 신규 회원):
```json
{
  "success": false,
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "등록되지 않은 회원입니다. 회원 등록이 필요합니다."
  }
}
```

---

### 1.3 토큰 갱신
**POST** `/auth/refresh`

Refresh Token을 사용하여 새로운 Access Token을 발급받습니다.

**Request Header**:
```
Authorization: Bearer {refreshToken}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 2. 회원 관리 (Member Management)

### 2.1 회원 등록
**POST** `/members`

새로운 회원을 등록합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken}
```

**Request Body**:
```json
{
  "phoneNumber": "010-1111-2222",
  "name": "이회원",
  "birthDate": "1995-05-15",
  "gender": "F",
  "height": 165.0,
  "weight": 55.0,
  "email": "member@example.com"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 11,
    "phoneNumber": "010-1111-2222",
    "name": "이회원",
    "birthDate": "1995-05-15",
    "gender": "F",
    "height": 165.0,
    "weight": 55.0,
    "email": "member@example.com",
    "status": "active",
    "instructorId": 1,
    "createdAt": "2025-10-30T12:00:00.000Z"
  }
}
```

---

### 2.2 회원 목록 조회
**GET** `/members`

강사의 회원 목록을 조회합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken}
```

**Query Parameters**:
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 20): 페이지당 항목 수
- `search` (optional): 검색어 (이름, 전화번호)
- `status` (optional): 상태 필터 (active, inactive, deleted)

**Example**: `/members?page=1&limit=20&search=홍길동&status=active`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": 10,
        "phoneNumber": "010-9876-5432",
        "name": "홍길동",
        "birthDate": "1990-01-01",
        "gender": "M",
        "height": 175.5,
        "weight": 70.0,
        "status": "active",
        "lastLoginAt": "2025-10-29T10:30:00.000Z",
        "createdAt": "2025-01-15T09:00:00.000Z",
        "analysisCount": {
          "golfSwing": 15,
          "posture": 8
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95,
      "itemsPerPage": 20
    }
  }
}
```

---

### 2.3 회원 상세 조회
**GET** `/members/:memberId`

특정 회원의 상세 정보를 조회합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 10,
    "phoneNumber": "010-9876-5432",
    "name": "홍길동",
    "birthDate": "1990-01-01",
    "gender": "M",
    "height": 175.5,
    "weight": 70.0,
    "email": "hong@example.com",
    "status": "active",
    "lastLoginAt": "2025-10-29T10:30:00.000Z",
    "createdAt": "2025-01-15T09:00:00.000Z",
    "recentAnalyses": {
      "golfSwing": [
        {
          "id": 45,
          "date": "2025-10-28",
          "swingType": "full",
          "status": "completed"
        }
      ],
      "posture": [
        {
          "id": 23,
          "date": "2025-10-25",
          "status": "completed"
        }
      ]
    }
  }
}
```

---

### 2.4 회원 정보 수정
**PATCH** `/members/:memberId`

회원 정보를 수정합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken}
```

**Request Body**:
```json
{
  "name": "홍길동",
  "height": 176.0,
  "weight": 72.0,
  "email": "newemail@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "홍길동",
    "height": 176.0,
    "weight": 72.0,
    "email": "newemail@example.com",
    "updatedAt": "2025-10-30T12:30:00.000Z"
  }
}
```

---

## 3. 골프 스윙 분석 (Golf Swing Analysis)

### 3.1 스윙 동영상 업로드 및 분석 요청
**POST** `/golf-swing/analyze`

골프 스윙 동영상을 업로드하고 분석을 요청합니다.

**Request Header**:
```
Authorization: Bearer {memberAccessToken}
Content-Type: multipart/form-data
```

**Request Body** (FormData):
```
video: File (mp4, max 100MB)
swingType: "full" | "half"
height: "175" (cm, string)
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "analysisId": 46,
    "uuid": "abc123-def456-ghi789",
    "status": "processing",
    "swingType": "full",
    "waitTime": 15,
    "message": "분석이 진행 중입니다. 약 15초 후 결과를 확인할 수 있습니다."
  }
}
```

---

### 3.2 스윙 분석 결과 조회
**GET** `/golf-swing/analysis/:analysisId`

골프 스윙 분석 결과를 조회합니다.

**Request Header**:
```
Authorization: Bearer {memberAccessToken}
```

**Response** (200 OK - 풀스윙):
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": 46,
      "uuid": "abc123-def456-ghi789",
      "memberId": 10,
      "memberName": "홍길동",
      "analysisDate": "2025-10-30",
      "swingType": "full",
      "status": "completed",
      "videoUrl": "https://s3.amazonaws.com/...",
      "memo": "백스윙 시 어깨 회전 부족",
      "createdAt": "2025-10-30T10:00:00.000Z"
    },
    "swingPhases": {
      "address": {
        "frame": 10,
        "timestamp": 0.33,
        "metrics": {
          "stance": 1.2,
          "upperBodyTilt": 15.3,
          "shoulderTilt": 2.1,
          "headLocation": 0.5
        }
      },
      "takeback": {
        "frame": 25,
        "timestamp": 0.83,
        "metrics": {
          "leftShoulderRotation": 35.2,
          "rightHipRotation": 15.8,
          "leftArmFlexion": 145.0,
          "rightArmFlexion": 150.2
        }
      },
      "backswing": {
        "frame": 40,
        "timestamp": 1.33,
        "metrics": {
          "headLocation": 0.3,
          "leftShoulderRotation": 85.5,
          "leftArmFlexion": 160.0
        }
      },
      "top": {
        "frame": 55,
        "timestamp": 1.83,
        "metrics": {
          "reverseSpine": -5.2,
          "rightHipRotation": 45.3,
          "rightLegFlexion": 125.0,
          "centerOfGravity": 1.05
        }
      },
      "downswing": {
        "frame": 70,
        "timestamp": 2.33,
        "metrics": {
          "leftShoulderRotation": 45.0,
          "rightHipRotation": 30.0,
          "leftArmFlexion": 140.0
        }
      },
      "impact": {
        "frame": 85,
        "timestamp": 2.83,
        "metrics": {
          "headLocation": 0.2,
          "leftArmFlexion": 175.0,
          "hipRotation": 0.0
        }
      },
      "followthrough": {
        "frame": 100,
        "timestamp": 3.33,
        "metrics": {
          "hipRotation": -30.0,
          "shoulderRotation": -45.0
        }
      },
      "finish": {
        "frame": 115,
        "timestamp": 3.83,
        "metrics": {
          "centerOfGravity": 0.98,
          "upperBodyTilt": 25.5
        }
      }
    },
    "angleData": {
      "kneeLine": [[0.0, -1.657, 2.209], [0.0, -2.5, 3.1], "..."],
      "pelvis": [[-17.104, 1.751, -2.743], [-18.0, 2.0, -3.0], "..."],
      "shoulderLine": [[31.057, 5.993, 3.145], [32.0, 6.0, 3.2], "..."]
    },
    "videoMetadata": {
      "totalFrames": 120,
      "fps": 30,
      "duration": 4.0
    }
  }
}
```

**Response** (200 OK - 반스윙):
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": 47,
      "swingType": "half",
      "status": "completed"
    },
    "swingPhases": {
      "address": { "frame": 10, "metrics": {} },
      "takeback": { "frame": 25, "metrics": {} },
      "backswing": { "frame": 40, "metrics": {} },
      "downswing": { "frame": 55, "metrics": {} },
      "impact": { "frame": 70, "metrics": {} }
    }
  }
}
```

**Response** (200 OK - 처리 중):
```json
{
  "success": true,
  "data": {
    "analysisId": 46,
    "status": "processing",
    "progress": 65,
    "message": "분석 진행 중입니다..."
  }
}
```

---

### 3.3 프레임 이동 (±5 프레임)
**프론트엔드 구현 노트**:

동영상 재생 시 각 스윙 시점 버튼을 클릭하면 해당 프레임으로 이동합니다.
프레임 미세 조정 버튼 (←/→)을 제공하여 ±1~5 프레임씩 이동 가능합니다.

```javascript
// 예시 코드
const goToFrame = (frameNumber) => {
  const fps = videoMetadata.fps; // 30 fps
  const timeInSeconds = frameNumber / fps;
  videoElement.currentTime = timeInSeconds;
};

// 프레임 이동
const adjustFrame = (delta) => {
  const currentFrame = Math.round(videoElement.currentTime * fps);
  const newFrame = currentFrame + delta;
  goToFrame(newFrame);
};

// 버튼 이벤트
<button onClick={() => adjustFrame(-5)}>-5 프레임</button>
<button onClick={() => adjustFrame(-1)}>-1 프레임</button>
<button onClick={() => adjustFrame(1)}>+1 프레임</button>
<button onClick={() => adjustFrame(5)}>+5 프레임</button>
```

---

### 3.4 스윙 분석 메모 추가/수정
**PATCH** `/golf-swing/analysis/:analysisId/memo`

분석 결과에 메모를 추가하거나 수정합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken}
```

**Request Body**:
```json
{
  "memo": "백스윙 탑에서 오른쪽 다리 각도 유지 필요.\n다음 레슨 시 드릴 추천: 하프 스윙 연습"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysisId": 46,
    "memo": "백스윙 탑에서 오른쪽 다리 각도 유지 필요.\n다음 레슨 시 드릴 추천: 하프 스윙 연습",
    "updatedAt": "2025-10-30T14:00:00.000Z"
  }
}
```

---

## 4. 체형 분석 (Body Posture Analysis)

### 4.1 체형 사진 업로드 및 분석 요청
**POST** `/posture/analyze`

A-pose 사진을 업로드하고 체형 분석을 요청합니다.

**Request Header**:
```
Authorization: Bearer {memberAccessToken}
Content-Type: multipart/form-data
```

**Request Body** (FormData):
```
frontImage: File (jpg/png, max 10MB)
sideImage: File (jpg/png, max 10MB)
backImage: File (jpg/png, max 10MB)
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "analysisId": 24,
    "status": "completed",
    "message": "체형 분석이 완료되었습니다.",
    "results": {
      "front": { "status": "completed", "uuid": "uuid-front" },
      "side": { "status": "completed", "uuid": "uuid-side" },
      "back": { "status": "completed", "uuid": "uuid-back" }
    }
  }
}
```

---

### 4.2 체형 분석 결과 조회
**GET** `/posture/analysis/:analysisId`

체형 분석 결과를 조회합니다.

**Request Header**:
```
Authorization: Bearer {memberAccessToken}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": 24,
      "memberId": 10,
      "memberName": "홍길동",
      "analysisDate": "2025-10-30",
      "status": "completed",
      "memo": "전반적으로 양호, 거북목 주의 필요",
      "createdAt": "2025-10-30T11:00:00.000Z"
    },
    "front": {
      "status": "completed",
      "resultImageUrl": "https://s3.amazonaws.com/.../front-result.jpg",
      "metrics": {
        "headBalance": { "value": -0.228, "grade": 0, "status": "정상" },
        "pelvicBalance": { "value": 0.024, "grade": 0, "status": "정상" },
        "shoulderBalance": { "value": -0.511, "grade": 0, "status": "정상" },
        "kneeBalance": { "value": -0.263, "grade": 0, "status": "정상" },
        "bodyTilt": { "value": 0.056, "grade": 0, "status": "정상" },
        "leftLegQAngle": { "value": -2.108, "grade": 0, "status": "정상" },
        "rightLegQAngle": { "value": -3.698, "grade": 0, "status": "정상" }
      }
    },
    "side": {
      "status": "completed",
      "resultImageUrl": "https://s3.amazonaws.com/.../side-result.jpg",
      "metrics": {
        "roundShoulder": { "value": 1.454, "grade": 0, "status": "정상" },
        "turtleNeck": { "value": 29.656, "grade": 0, "status": "정상" },
        "headTilt": { "value": -2.935, "grade": -1, "status": "주의" },
        "bodyTilt": { "value": 6.961, "grade": 0, "status": "정상" }
      }
    },
    "back": {
      "status": "completed",
      "resultImageUrl": "https://s3.amazonaws.com/.../back-result.jpg",
      "metrics": {
        "headBalance": { "value": -1.561, "grade": -1, "status": "주의" },
        "pelvicBalance": { "value": -0.699, "grade": 0, "status": "정상" },
        "shoulderBalance": { "value": 0.06, "grade": 0, "status": "정상" },
        "kneeBalance": { "value": -1.047, "grade": 0, "status": "정상" },
        "bodyTilt": { "value": 0.067, "grade": 0, "status": "정상" },
        "leftLegQAngle": { "value": -2.514, "grade": 0, "status": "정상" },
        "rightLegQAngle": { "value": -3.903, "grade": 0, "status": "정상" }
      }
    },
    "gradeExplanation": {
      "-2": "위험 (왼쪽으로 심하게 기울어짐)",
      "-1": "주의 (왼쪽으로 기울어짐)",
      "0": "정상",
      "1": "주의 (오른쪽으로 기울어짐)",
      "2": "위험 (오른쪽으로 심하게 기울어짐)"
    }
  }
}
```

---

### 4.3 체형 분석 메모 추가/수정
**PATCH** `/posture/analysis/:analysisId/memo`

체형 분석 결과에 메모를 추가하거나 수정합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken}
```

**Request Body**:
```json
{
  "memo": "전반적으로 양호.\n거북목 개선을 위한 스트레칭 권장.\n다음 측정 시 변화 확인 필요."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysisId": 24,
    "memo": "전반적으로 양호.\n거북목 개선을 위한 스트레칭 권장.\n다음 측정 시 변화 확인 필요.",
    "updatedAt": "2025-10-30T14:30:00.000Z"
  }
}
```

---

## 5. 분석 이력 (Analysis History)

### 5.1 회원의 분석 이력 조회 (리스트)
**GET** `/members/:memberId/history`

회원의 전체 분석 이력을 리스트 형식으로 조회합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken} or {memberAccessToken}
```

**Query Parameters**:
- `type` (optional): 분석 타입 (`golf-swing`, `posture`, `all`)
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 20): 페이지당 항목 수
- `startDate` (optional): 시작 날짜 (YYYY-MM-DD)
- `endDate` (optional): 종료 날짜 (YYYY-MM-DD)

**Example**: `/members/10/history?type=all&page=1&limit=20`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "member": {
      "id": 10,
      "name": "홍길동"
    },
    "history": [
      {
        "id": 46,
        "type": "golf-swing",
        "date": "2025-10-30",
        "time": "10:00:00",
        "swingType": "full",
        "status": "completed",
        "hasMemo": true
      },
      {
        "id": 24,
        "type": "posture",
        "date": "2025-10-30",
        "time": "11:00:00",
        "status": "completed",
        "hasMemo": true
      },
      {
        "id": 45,
        "type": "golf-swing",
        "date": "2025-10-28",
        "time": "14:30:00",
        "swingType": "half",
        "status": "completed",
        "hasMemo": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 55,
      "itemsPerPage": 20
    }
  }
}
```

---

### 5.2 달력 형식으로 분석 이력 조회
**GET** `/members/:memberId/history/calendar`

회원의 분석 이력을 달력 형식으로 조회합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken} or {memberAccessToken}
```

**Query Parameters**:
- `year` (required): 연도 (YYYY)
- `month` (required): 월 (1-12)

**Example**: `/members/10/history/calendar?year=2025&month=10`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 10,
    "member": {
      "id": 10,
      "name": "홍길동"
    },
    "calendar": [
      {
        "date": "2025-10-01",
        "analyses": []
      },
      {
        "date": "2025-10-15",
        "analyses": [
          {
            "id": 40,
            "type": "golf-swing",
            "swingType": "full",
            "time": "10:00",
            "status": "completed"
          }
        ]
      },
      {
        "date": "2025-10-28",
        "analyses": [
          {
            "id": 45,
            "type": "golf-swing",
            "swingType": "half",
            "time": "14:30",
            "status": "completed"
          }
        ]
      },
      {
        "date": "2025-10-30",
        "analyses": [
          {
            "id": 46,
            "type": "golf-swing",
            "swingType": "full",
            "time": "10:00",
            "status": "completed"
          },
          {
            "id": 24,
            "type": "posture",
            "time": "11:00",
            "status": "completed"
          }
        ]
      }
    ],
    "summary": {
      "totalAnalyses": 3,
      "golfSwingCount": 2,
      "postureCount": 1
    }
  }
}
```

---

## 6. PDF 생성 (PDF Generation)

### 6.1 골프 스윙 분석 결과 PDF 생성
**POST** `/pdf/golf-swing/:analysisId`

골프 스윙 분석 결과를 PDF로 생성합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken} or {memberAccessToken}
```

**Request Body** (optional):
```json
{
  "includeVideo": false,
  "includeAngleData": true,
  "language": "ko"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "pdfUrl": "https://s3.amazonaws.com/.../golf-swing-analysis-46.pdf",
    "expiresAt": "2025-10-31T10:00:00.000Z",
    "fileSize": 2548736,
    "downloadUrl": "https://api.example.com/pdf/download/abc123"
  }
}
```

---

### 6.2 체형 분석 결과 PDF 생성
**POST** `/pdf/posture/:analysisId`

체형 분석 결과를 PDF로 생성합니다.

**Request Header**:
```
Authorization: Bearer {instructorAccessToken} or {memberAccessToken}
```

**Request Body** (optional):
```json
{
  "includeImages": true,
  "language": "ko"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "pdfUrl": "https://s3.amazonaws.com/.../posture-analysis-24.pdf",
    "expiresAt": "2025-10-31T11:00:00.000Z",
    "fileSize": 1854720,
    "downloadUrl": "https://api.example.com/pdf/download/def456"
  }
}
```

---

### 6.3 PDF 다운로드
**GET** `/pdf/download/:token`

생성된 PDF를 다운로드합니다.

**Response**: PDF 파일 스트림

---

## 7. 에러 코드

### HTTP 상태 코드
- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `202 Accepted`: 요청 접수 (비동기 처리)
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 리소스 충돌 (중복 등)
- `422 Unprocessable Entity`: 유효성 검증 실패
- `500 Internal Server Error`: 서버 오류
- `503 Service Unavailable`: 서비스 이용 불가

### 에러 응답 형식
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 표시할 에러 메시지",
    "details": {
      "field": "문제가 있는 필드",
      "reason": "구체적인 이유"
    }
  }
}
```

### 주요 에러 코드
| 코드 | 설명 |
|------|------|
| `AUTH_FAILED` | 인증 실패 |
| `TOKEN_EXPIRED` | 토큰 만료 |
| `TOKEN_INVALID` | 유효하지 않은 토큰 |
| `MEMBER_NOT_FOUND` | 회원을 찾을 수 없음 |
| `INSTRUCTOR_NOT_FOUND` | 강사를 찾을 수 없음 |
| `ANALYSIS_NOT_FOUND` | 분석 결과를 찾을 수 없음 |
| `ANALYSIS_PROCESSING` | 분석 진행 중 |
| `ANALYSIS_FAILED` | 분석 실패 |
| `PHONE_NUMBER_DUPLICATED` | 전화번호 중복 |
| `FILE_TOO_LARGE` | 파일 크기 초과 |
| `INVALID_FILE_TYPE` | 지원하지 않는 파일 형식 |
| `INSUFFICIENT_SUBSCRIPTION` | 구독 만료 또는 권한 없음 |
| `REMO_API_ERROR` | REMO API 오류 |
| `PDF_GENERATION_FAILED` | PDF 생성 실패 |

---

## 8. 개발 가이드

### 8.1 인증 헤더 설정
모든 인증이 필요한 API는 다음과 같이 헤더를 설정합니다:

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### 8.2 파일 업로드
파일 업로드 시 FormData를 사용합니다:

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('swingType', 'full');
formData.append('height', '175');

const response = await fetch('/api/golf-swing/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

### 8.3 토큰 갱신 로직
Access Token 만료 시 자동으로 갱신하는 로직:

```javascript
async function apiRequest(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  if (response.status === 401) {
    // 토큰 갱신 시도
    const newToken = await refreshAccessToken();
    if (newToken) {
      // 재시도
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        }
      });
    } else {
      // 로그인 페이지로 이동
      redirectToLogin();
    }
  }

  return response;
}
```

### 8.4 에러 처리
통일된 에러 처리:

```javascript
try {
  const response = await apiRequest('/api/members', options);
  const data = await response.json();

  if (!data.success) {
    // 에러 처리
    showErrorMessage(data.error.message);
  } else {
    // 성공 처리
    handleSuccess(data.data);
  }
} catch (error) {
  // 네트워크 에러 등
  showErrorMessage('서버와의 통신에 실패했습니다.');
}
```

---

## 9. 테스트 계정

### 강사 계정
- **Username**: `test_instructor`
- **Password**: `test1234`
- **Payment Type**: `paid`
- **Is Certified**: `true`

### 회원 계정
- **Phone Number**: `010-0000-0001`
- **Name**: `테스트회원1`

---

## 10. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2025-10-30 | 초기 API 명세서 작성 |

---

## 문의

API 관련 문의사항은 백엔드 개발팀에게 연락해주세요.
