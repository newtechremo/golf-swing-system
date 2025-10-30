# FINEFIT Park Golf - 프론트엔드 개발 가이드

> **프로젝트**: FINEFIT Park Golf
> **업데이트**: 2025-10-30
> **기술 스택**: React 18+, Tailwind CSS, Axios

---

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [화면 구성](#2-화면-구성)
3. [주요 기능 상세](#3-주요-기능-상세)
4. [UI/UX 가이드라인](#4-uiux-가이드라인)
5. [컴포넌트 구조](#5-컴포넌트-구조)
6. [상태 관리](#6-상태-관리)
7. [API 연동](#7-api-연동)
8. [개발 우선순위](#8-개발-우선순위)

---

## 1. 프로젝트 개요

### 1.1 서비스 설명
FINEFIT Park Golf는 파크골프 강사가 회원을 관리하고, 골프 스윙 분석 및 체형 분석을 제공하는 서비스입니다.

### 1.2 사용자 유형
- **강사 (Instructor)**: 회원 관리, 분석 결과 확인, 메모 작성
- **회원 (Member)**: 로그인, 분석 요청, 결과 확인

### 1.3 핵심 기능
1. 강사 로그인
2. 회원 로그인 (전화번호)
3. 회원 관리
4. 골프 스윙 분석 (풀스윙/반스윙)
5. 체형 분석 (A-pose)
6. 분석 이력 관리 (리스트/달력)
7. PDF 결과지 생성

---

## 2. 화면 구성

### 2.1 화면 목록

```
1. 인증
   ├── 1.1 강사 로그인
   └── 1.2 회원 로그인 (전화번호)

2. 강사 대시보드
   ├── 2.1 회원 목록
   ├── 2.2 회원 상세
   │   ├── 기본 정보
   │   ├── 분석 이력 (리스트)
   │   └── 분석 이력 (달력)
   └── 2.3 회원 등록/수정

3. 분석
   ├── 3.1 골프 스윙 분석
   │   ├── 동영상 업로드
   │   ├── 스윙 타입 선택 (풀스윙/반스윙)
   │   └── 분석 진행 상태
   ├── 3.2 골프 스윙 결과
   │   ├── 동영상 플레이어 (프레임 컨트롤)
   │   ├── 각 시점별 측정값
   │   ├── 각도 데이터 차트
   │   └── 메모 작성
   ├── 3.3 체형 분석
   │   ├── 사진 업로드 (정면/측면/후면)
   │   └── 분석 진행 상태
   └── 3.4 체형 분석 결과
       ├── 결과 이미지 (3방향)
       ├── 측정값 및 등급
       └── 메모 작성

4. PDF
   └── 4.1 결과지 생성 및 다운로드
```

---

### 2.2 화면 플로우

```
[강사 로그인] → [회원 목록]
                    ↓
              [회원 선택]
                    ↓
         [회원 로그인 (전화번호)]
                    ↓
        [분석 타입 선택] ─┬─ [골프 스윙 분석] → [스윙 결과] → [PDF 생성]
                        │
                        └─ [체형 분석] → [체형 결과] → [PDF 생성]
```

---

## 3. 주요 기능 상세

### 3.1 강사 로그인
**화면 경로**: `/login/instructor`

**기능**:
- 아이디/비밀번호 입력
- 로그인 유지 (Remember Me)
- 구독 만료 시 알림

**필요한 상태**:
```javascript
const [credentials, setCredentials] = useState({
  username: '',
  password: ''
});
const [rememberMe, setRememberMe] = useState(false);
```

**API 호출**:
```javascript
POST /api/auth/instructor/login
Body: { username, password }
Response: { accessToken, refreshToken, instructor }
```

---

### 3.2 회원 로그인 (전화번호)
**화면 경로**: `/login/member`

**기능**:
- 전화번호 입력 (010-0000-0000 형식)
- 신규 회원 자동 감지 → 회원 등록 화면으로 이동
- 기존 회원 즉시 로그인

**UI 플로우**:
1. 전화번호 입력
2. "로그인" 버튼 클릭
3. 서버 응답:
   - 200: 로그인 성공 → 분석 타입 선택 화면
   - 404: 신규 회원 → 회원 등록 화면

**컴포넌트 예시**:
```jsx
<div className="login-member">
  <h2>회원 로그인</h2>
  <PhoneNumberInput
    value={phoneNumber}
    onChange={setPhoneNumber}
    format="010-0000-0000"
  />
  <Button onClick={handleLogin}>로그인</Button>
</div>
```

---

### 3.3 회원 관리

#### 3.3.1 회원 목록
**화면 경로**: `/members`

**기능**:
- 회원 목록 표시 (테이블 또는 카드)
- 검색 (이름, 전화번호)
- 필터 (상태)
- 페이지네이션

**표시 정보**:
- 이름
- 전화번호
- 최근 분석 날짜
- 총 분석 횟수 (골프/체형)
- 상태

**액션**:
- 회원 상세보기
- 회원 정보 수정
- 회원 삭제

#### 3.3.2 회원 상세
**화면 경로**: `/members/:memberId`

**탭 구성**:
1. **기본 정보**: 이름, 전화번호, 생년월일, 성별, 키, 몸무게
2. **분석 이력 (리스트)**: 날짜별 분석 목록
3. **분석 이력 (달력)**: 달력 형식으로 분석 날짜 표시

---

### 3.4 골프 스윙 분석

#### 3.4.1 동영상 업로드
**화면 경로**: `/analysis/golf-swing/upload`

**기능**:
- 스윙 타입 선택 (풀스윙/반스윙)
- 동영상 파일 업로드 (Drag & Drop 지원)
- 키 입력 (cm)
- 업로드 진행률 표시

**파일 제한**:
- 형식: mp4
- 최대 크기: 100MB
- 권장 길이: 5~10초

**컴포넌트 예시**:
```jsx
<div className="golf-swing-upload">
  <SwingTypeSelector
    value={swingType}
    onChange={setSwingType}
    options={['full', 'half']}
  />
  <VideoUploader
    onUpload={handleUpload}
    accept="video/mp4"
    maxSize={100 * 1024 * 1024}
  />
  <HeightInput value={height} onChange={setHeight} />
  <Button onClick={handleAnalyze}>분석 시작</Button>
</div>
```

#### 3.4.2 스윙 분석 결과
**화면 경로**: `/analysis/golf-swing/:analysisId`

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 상단: 회원 정보, 분석 날짜, 스윙 타입    │
├─────────────────────────────────────────┤
│                                         │
│          동영상 플레이어                 │
│                                         │
│  [Address] [Takeback] [Backswing] ...   │  ← 시점 버튼
│                                         │
│  [-5] [-1] [재생/정지] [+1] [+5]        │  ← 프레임 컨트롤
│                                         │
├─────────────────────────────────────────┤
│ 각 시점별 측정값 (탭 또는 아코디언)       │
│                                         │
│ Address Phase:                          │
│ - Stance: 1.2                           │
│ - Upper Body Tilt: 15.3°                │
│ - Shoulder Tilt: 2.1°                   │
│ ...                                     │
├─────────────────────────────────────────┤
│ 각도 데이터 차트 (Line Chart)            │
│ - Knee Line                             │
│ - Pelvis                                │
│ - Shoulder Line                         │
├─────────────────────────────────────────┤
│ 메모 작성 영역 (강사만)                  │
│ [저장] [PDF 생성]                       │
└─────────────────────────────────────────┘
```

**주요 기능**:

1. **동영상 플레이어**:
   ```javascript
   // 프레임으로 이동
   const goToFrame = (frameNumber) => {
     const fps = 30; // 서버에서 받은 FPS
     const timeInSeconds = frameNumber / fps;
     videoRef.current.currentTime = timeInSeconds;
   };

   // 시점 버튼 클릭
   const handlePhaseClick = (phase) => {
     const frameNumber = swingPhases[phase].frame;
     goToFrame(frameNumber);
   };

   // 프레임 조정
   const adjustFrame = (delta) => {
     const currentFrame = Math.round(videoRef.current.currentTime * fps);
     goToFrame(currentFrame + delta);
   };
   ```

2. **시점 버튼**:
   - 풀스윙: Address, Takeback, Backswing, Top, Downswing, Impact, Follow-through, Finish
   - 반스윙: Address, Takeback, Backswing, Downswing, Impact

3. **프레임 컨트롤**:
   - -5 프레임 버튼
   - -1 프레임 버튼
   - 재생/정지 버튼
   - +1 프레임 버튼
   - +5 프레임 버튼

4. **측정값 표시**:
   - 각 시점별 측정값을 탭 또는 아코디언으로 표시
   - 단위 명시 (도, cm 등)

5. **차트**:
   - 라이브러리: Chart.js 또는 Recharts
   - X축: 프레임 번호
   - Y축: 각도 (degree)
   - 3개의 라인: Knee Line, Pelvis, Shoulder Line

---

### 3.5 체형 분석

#### 3.5.1 사진 업로드
**화면 경로**: `/analysis/posture/upload`

**기능**:
- 3장의 사진 업로드 (정면, 측면, 후면)
- 각 방향별 미리보기
- A-pose 가이드 표시

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ A-pose 안내 이미지/설명                  │
├─────────────┬─────────────┬─────────────┤
│  정면 사진   │  측면 사진   │  후면 사진  │
│             │             │             │
│ [업로드]    │ [업로드]    │ [업로드]    │
└─────────────┴─────────────┴─────────────┘
              [분석 시작]
```

**파일 제한**:
- 형식: jpg, png
- 최대 크기: 10MB per image
- 권장 해상도: 1920x1080

#### 3.5.2 체형 분석 결과
**화면 경로**: `/analysis/posture/:analysisId`

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 상단: 회원 정보, 분석 날짜               │
├─────────────┬─────────────┬─────────────┤
│  정면 결과   │  측면 결과   │  후면 결과  │
│  이미지     │  이미지     │  이미지     │
│             │             │             │
│ 측정값:     │ 측정값:     │ 측정값:     │
│ - 머리균형  │ - 라운드숄더 │ - 머리균형  │
│   -0.23°   │   1.45°    │   -1.56°   │
│   (정상)   │   (정상)   │   (주의)   │
│ ...        │ ...        │ ...        │
└─────────────┴─────────────┴─────────────┘
┌─────────────────────────────────────────┐
│ 종합 평가 (자동 생성 또는 강사 입력)      │
├─────────────────────────────────────────┤
│ 메모 작성 영역 (강사만)                  │
│ [저장] [PDF 생성]                       │
└─────────────────────────────────────────┘
```

**등급 표시**:
```javascript
const getGradeColor = (grade) => {
  if (grade === -2 || grade === 2) return 'text-red-600'; // 위험
  if (grade === -1 || grade === 1) return 'text-yellow-600'; // 주의
  return 'text-green-600'; // 정상
};

const getGradeText = (grade) => {
  const gradeMap = {
    '-2': '위험 (좌)',
    '-1': '주의 (좌)',
    '0': '정상',
    '1': '주의 (우)',
    '2': '위험 (우)'
  };
  return gradeMap[grade] || '알 수 없음';
};
```

---

### 3.6 분석 이력

#### 3.6.1 리스트 형식
**화면 경로**: `/members/:memberId/history/list`

**기능**:
- 최신순 정렬
- 필터 (골프/체형/전체)
- 날짜 범위 선택
- 각 항목 클릭 시 상세 결과로 이동

**테이블 컬럼**:
| 날짜 | 시간 | 타입 | 상세 | 메모 | 액션 |
|------|------|------|------|------|------|
| 2025-10-30 | 10:00 | 골프(풀스윙) | ✓ | ✓ | [보기] [PDF] |
| 2025-10-30 | 11:00 | 체형 | ✓ | ✓ | [보기] [PDF] |

#### 3.6.2 달력 형식
**화면 경로**: `/members/:memberId/history/calendar`

**기능**:
- 월 단위 달력 표시
- 분석이 있는 날짜에 마커 표시
- 날짜 클릭 시 해당 날짜의 분석 목록 표시

**라이브러리**: `react-calendar` 또는 `react-big-calendar`

**달력 마커**:
```javascript
const renderDay = (date, analyses) => {
  const dayAnalyses = analyses.filter(a =>
    isSameDay(new Date(a.date), date)
  );

  return (
    <div className="calendar-day">
      <span className="day-number">{date.getDate()}</span>
      {dayAnalyses.length > 0 && (
        <div className="markers">
          {dayAnalyses.some(a => a.type === 'golf-swing') && (
            <span className="marker golf">⛳</span>
          )}
          {dayAnalyses.some(a => a.type === 'posture') && (
            <span className="marker posture">🧍</span>
          )}
        </div>
      )}
    </div>
  );
};
```

---

### 3.7 PDF 생성

**기능**:
- 분석 결과 화면에서 "PDF 생성" 버튼 클릭
- 서버에서 PDF 생성 후 다운로드 URL 반환
- 자동으로 다운로드 또는 새 탭에서 열기

**구현**:
```javascript
const handleGeneratePDF = async () => {
  try {
    setLoading(true);

    const response = await axios.post(
      `/api/pdf/golf-swing/${analysisId}`,
      { includeVideo: false, includeAngleData: true },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { pdfUrl, downloadUrl } = response.data.data;

    // 자동 다운로드
    window.open(downloadUrl, '_blank');

    showSuccessMessage('PDF가 생성되었습니다.');
  } catch (error) {
    showErrorMessage('PDF 생성에 실패했습니다.');
  } finally {
    setLoading(false);
  }
};
```

---

## 4. UI/UX 가이드라인

### 4.1 디자인 시스템

#### 색상
```css
/* Primary */
--primary-50: #f0f9ff;
--primary-500: #0ea5e9;
--primary-600: #0284c7;
--primary-700: #0369a1;

/* Success */
--success-500: #10b981;

/* Warning */
--warning-500: #f59e0b;

/* Error */
--error-500: #ef4444;

/* Neutral */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-900: #111827;
```

#### 타이포그래피
```css
/* Headings */
h1: 2rem (32px), font-bold
h2: 1.5rem (24px), font-semibold
h3: 1.25rem (20px), font-semibold

/* Body */
body: 1rem (16px), font-normal
small: 0.875rem (14px), font-normal
```

#### 간격
```css
/* Spacing */
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
```

---

### 4.2 컴포넌트 스타일

#### 버튼
```jsx
<Button variant="primary" size="lg">분석 시작</Button>
<Button variant="secondary" size="md">취소</Button>
<Button variant="ghost" size="sm">삭제</Button>
```

#### 입력 필드
```jsx
<Input
  label="전화번호"
  placeholder="010-0000-0000"
  error="올바른 전화번호를 입력하세요"
/>
```

#### 카드
```jsx
<Card>
  <CardHeader>제목</CardHeader>
  <CardBody>내용</CardBody>
  <CardFooter>액션</CardFooter>
</Card>
```

---

### 4.3 반응형 디자인

**브레이크포인트**:
```css
/* Mobile */
@media (max-width: 639px) { }

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

**우선 순위**:
1. Desktop (1920x1080)
2. Tablet (768x1024)
3. Mobile (추후 고려)

---

## 5. 컴포넌트 구조

### 5.1 폴더 구조
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/           # 공통 컴포넌트
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── Loading.jsx
│   │   ├── auth/             # 인증 관련
│   │   │   ├── InstructorLogin.jsx
│   │   │   └── MemberLogin.jsx
│   │   ├── member/           # 회원 관리
│   │   │   ├── MemberList.jsx
│   │   │   ├── MemberDetail.jsx
│   │   │   └── MemberForm.jsx
│   │   ├── golf-swing/       # 골프 스윙
│   │   │   ├── SwingUpload.jsx
│   │   │   ├── SwingResult.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   └── SwingChart.jsx
│   │   ├── posture/          # 체형 분석
│   │   │   ├── PostureUpload.jsx
│   │   │   └── PostureResult.jsx
│   │   └── history/          # 이력
│   │       ├── HistoryList.jsx
│   │       └── HistoryCalendar.jsx
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── MemberPage.jsx
│   │   └── AnalysisPage.jsx
│   ├── services/             # API 서비스
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── memberService.js
│   │   ├── golfSwingService.js
│   │   └── postureService.js
│   ├── utils/                # 유틸리티
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── constants.js
│   ├── hooks/                # 커스텀 훅
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   └── useVideoPlayer.js
│   ├── contexts/             # Context API
│   │   └── AuthContext.jsx
│   ├── App.jsx
│   └── main.jsx
├── public/
└── package.json
```

---

### 5.2 주요 컴포넌트

#### VideoPlayer 컴포넌트
```jsx
import React, { useRef, useState } from 'react';

export const VideoPlayer = ({ videoUrl, swingPhases, fps }) => {
  const videoRef = useRef(null);
  const [currentPhase, setCurrentPhase] = useState(null);

  const goToFrame = (frameNumber) => {
    if (videoRef.current) {
      const timeInSeconds = frameNumber / fps;
      videoRef.current.currentTime = timeInSeconds;
    }
  };

  const adjustFrame = (delta) => {
    if (videoRef.current) {
      const currentFrame = Math.round(videoRef.current.currentTime * fps);
      goToFrame(currentFrame + delta);
    }
  };

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full"
      />

      {/* 시점 버튼 */}
      <div className="phase-buttons">
        {Object.entries(swingPhases).map(([phase, data]) => (
          <button
            key={phase}
            onClick={() => {
              goToFrame(data.frame);
              setCurrentPhase(phase);
            }}
            className={currentPhase === phase ? 'active' : ''}
          >
            {phase}
          </button>
        ))}
      </div>

      {/* 프레임 컨트롤 */}
      <div className="frame-controls">
        <button onClick={() => adjustFrame(-5)}>-5</button>
        <button onClick={() => adjustFrame(-1)}>-1</button>
        <button onClick={() => videoRef.current?.play()}>▶</button>
        <button onClick={() => videoRef.current?.pause()}>⏸</button>
        <button onClick={() => adjustFrame(1)}>+1</button>
        <button onClick={() => adjustFrame(5)}>+5</button>
      </div>
    </div>
  );
};
```

---

## 6. 상태 관리

### 6.1 Context API 사용
```javascript
// AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬스토리지에서 토큰 복원
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
      setToken(savedToken);
      // 사용자 정보 가져오기
      fetchUserInfo(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (credentials, userType) => {
    // 로그인 API 호출
    const { accessToken, refreshToken, user } = await authService.login(
      credentials,
      userType
    );

    setToken(accessToken);
    setUser(user);

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 7. API 연동

### 7.1 Axios 설정
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 토큰 만료 시 갱신
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', null, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // 리프레시 실패 시 로그아웃
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

### 7.2 서비스 함수
```javascript
// services/golfSwingService.js
import api from './api';

export const golfSwingService = {
  // 스윙 분석 요청
  analyzeSwing: async (videoFile, swingType, height) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('swingType', swingType);
    formData.append('height', height);

    const response = await api.post('/golf-swing/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data.data;
  },

  // 스윙 결과 조회
  getSwingResult: async (analysisId) => {
    const response = await api.get(`/golf-swing/analysis/${analysisId}`);
    return response.data.data;
  },

  // 메모 업데이트
  updateMemo: async (analysisId, memo) => {
    const response = await api.patch(
      `/golf-swing/analysis/${analysisId}/memo`,
      { memo }
    );
    return response.data.data;
  }
};
```

---

## 8. 개발 우선순위

### Phase 1: MVP (2주)
1. ✅ 강사 로그인
2. ✅ 회원 로그인 (전화번호)
3. ✅ 회원 목록 및 등록
4. ✅ 골프 스윙 업로드 (풀스윙만)
5. ✅ 골프 스윙 결과 보기 (기본 버전)

### Phase 2: 핵심 기능 (2주)
6. ✅ 반스윙 지원
7. ✅ 프레임 컨트롤 기능
8. ✅ 체형 분석 (업로드 및 결과)
9. ✅ 메모 작성 기능

### Phase 3: 이력 및 부가 기능 (2주)
10. ✅ 분석 이력 (리스트)
11. ✅ 분석 이력 (달력)
12. ✅ PDF 생성 및 다운로드

### Phase 4: 최적화 및 개선 (1주)
13. ✅ UI/UX 개선
14. ✅ 성능 최적화
15. ✅ 반응형 디자인 (태블릿)

---

## 9. 참고 자료

- **API 명세서**: `API_SPECIFICATION.md`
- **시스템 아키텍처**: `SYSTEM_ARCHITECTURE.md`
- **Git 브랜치 전략**: `README_BRANCHING_STRATEGY.md`

---

## 10. 개발 환경 설정

### 10.1 프로젝트 생성
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

### 10.2 필요한 패키지
```bash
npm install axios react-router-dom
npm install -D tailwindcss postcss autoprefixer
npm install react-calendar recharts
npm install react-dropzone
```

### 10.3 환경 변수
```env
# .env.development
REACT_APP_API_URL=http://localhost:3000/api

# .env.production
REACT_APP_API_URL=https://api.finefit-parkgolf.com/api
```

---

## 문의

프론트엔드 개발 관련 문의사항은 프로젝트 관리자에게 연락해주세요.
