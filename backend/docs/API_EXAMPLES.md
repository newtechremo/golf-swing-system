# API 사용 예제

프론트엔드에서 백엔드 API를 호출하는 JavaScript 예제입니다.

## 목차
1. [Axios 설정](#axios-설정)
2. [인증 예제](#인증-예제)
3. [대상자 관리 예제](#대상자-관리-예제)
4. [분석 예제](#분석-예제)

---

## Axios 설정

### 기본 설정
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 모든 요청에 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 에러 시 로그인 페이지로 리다이렉트
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃 처리
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 인증 예제

### 1. 로그인
```javascript
import apiClient from './apiClient';

async function login(username, password) {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });

    // 토큰 저장
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);

    // 사용자 정보 저장
    localStorage.setItem('user', JSON.stringify(response.data.user));

    console.log('로그인 성공:', response.data.user.name);
    return response.data;
  } catch (error) {
    console.error('로그인 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
login('instructor1', 'password123')
  .then((data) => {
    console.log('로그인된 사용자:', data.user);
  })
  .catch((error) => {
    alert('로그인에 실패했습니다.');
  });
```

### 2. 로그아웃
```javascript
function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

### 3. 토큰 갱신
```javascript
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    // 새 액세스 토큰 저장
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data.accessToken;
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    logout();
  }
}
```

---

## 대상자 관리 예제

### 1. 대상자 목록 조회
```javascript
async function getSubjects(page = 1, limit = 10, status = 'active') {
  try {
    const response = await apiClient.get('/subjects', {
      params: {
        page,
        limit,
        status,
      },
    });

    console.log('대상자 목록:', response.data.subjects);
    console.log('총 개수:', response.data.total);
    return response.data;
  } catch (error) {
    console.error('대상자 목록 조회 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
getSubjects(1, 10, 'active').then((data) => {
  data.subjects.forEach((subject) => {
    console.log(`${subject.name} (${subject.phoneNumber})`);
    console.log(`  - 골프 스윙: ${subject.analysisCount.golfSwing}회`);
    console.log(`  - 신체 자세: ${subject.analysisCount.posture}회`);
  });
});
```

### 2. 대상자 검색
```javascript
async function searchSubjects(searchTerm) {
  try {
    const response = await apiClient.get('/subjects', {
      params: {
        search: searchTerm,
        page: 1,
        limit: 20,
      },
    });

    return response.data;
  } catch (error) {
    console.error('검색 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
searchSubjects('홍길동').then((data) => {
  console.log('검색 결과:', data.subjects);
});
```

### 3. 대상자 상세 조회
```javascript
async function getSubjectDetail(subjectId) {
  try {
    const response = await apiClient.get(`/subjects/${subjectId}`);

    console.log('대상자 정보:', response.data);
    console.log('최근 골프 스윙:', response.data.recentAnalyses.golfSwing);
    console.log('최근 자세 분석:', response.data.recentAnalyses.posture);

    return response.data;
  } catch (error) {
    console.error('상세 조회 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
getSubjectDetail(1).then((subject) => {
  console.log(`이름: ${subject.name}`);
  console.log(`키: ${subject.height}cm, 몸무게: ${subject.weight}kg`);
});
```

### 4. 대상자 등록
```javascript
async function createSubject(subjectData) {
  try {
    const response = await apiClient.post('/subjects', subjectData);

    console.log('대상자 등록 성공:', response.data);
    return response.data;
  } catch (error) {
    console.error('등록 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
const newSubject = {
  name: '이영희',
  phoneNumber: '010-9999-8888',
  birthDate: '1995-03-15',
  gender: 'F',
  height: 165.0,
  weight: 55.5,
  email: 'lee@example.com',
  memo: '신규 회원'
};

createSubject(newSubject).then((subject) => {
  console.log('등록된 대상자 ID:', subject.id);
});
```

### 5. 대상자 정보 수정
```javascript
async function updateSubject(subjectId, updateData) {
  try {
    const response = await apiClient.put(`/subjects/${subjectId}`, updateData);

    console.log('수정 완료:', response.data);
    return response.data;
  } catch (error) {
    console.error('수정 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
updateSubject(1, {
  height: 176.0,
  weight: 72.0,
  memo: '체중 증가 확인'
}).then((subject) => {
  console.log('수정된 정보:', subject);
});
```

### 6. 대상자 삭제
```javascript
async function deleteSubject(subjectId) {
  try {
    await apiClient.delete(`/subjects/${subjectId}`);
    console.log('대상자 삭제 완료');
  } catch (error) {
    console.error('삭제 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
deleteSubject(5).then(() => {
  console.log('삭제되었습니다.');
});
```

---

## 분석 예제

### 1. 골프 스윙 비디오 업로드
```javascript
async function uploadGolfSwingVideo(file, subjectId, height) {
  try {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('subjectId', subjectId);
    if (height) {
      formData.append('height', height);
    }

    const response = await apiClient.post('/golf-swing/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('분석 시작:', response.data);
    return response.data;
  } catch (error) {
    console.error('업로드 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제 (React에서)
function GolfSwingUpload() {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await uploadGolfSwingVideo(file, 1, '175.5');
      alert(`분석 시작됨! ID: ${result.analysisId}`);
    } catch (error) {
      alert('업로드 실패');
    }
  };

  return (
    <input
      type="file"
      accept="video/*"
      onChange={handleFileUpload}
    />
  );
}
```

### 2. 신체 자세 이미지 업로드
```javascript
async function uploadPostureImages(frontFile, sideFile, backFile, subjectId) {
  try {
    const formData = new FormData();
    formData.append('front', frontFile);
    formData.append('side', sideFile);
    formData.append('back', backFile);
    formData.append('subjectId', subjectId);

    const response = await apiClient.post('/body-posture/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('자세 분석 시작:', response.data);
    return response.data;
  } catch (error) {
    console.error('업로드 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제 (React에서)
function PostureUpload() {
  const [files, setFiles] = useState({
    front: null,
    side: null,
    back: null
  });

  const handleUpload = async () => {
    if (!files.front || !files.side || !files.back) {
      alert('모든 이미지를 선택해주세요.');
      return;
    }

    try {
      const result = await uploadPostureImages(
        files.front,
        files.side,
        files.back,
        1
      );
      alert(`분석 시작됨! ID: ${result.analysisId}`);
    } catch (error) {
      alert('업로드 실패');
    }
  };

  return (
    <div>
      <input type="file" accept="image/*"
        onChange={(e) => setFiles({...files, front: e.target.files[0]})} />
      <input type="file" accept="image/*"
        onChange={(e) => setFiles({...files, side: e.target.files[0]})} />
      <input type="file" accept="image/*"
        onChange={(e) => setFiles({...files, back: e.target.files[0]})} />
      <button onClick={handleUpload}>분석 시작</button>
    </div>
  );
}
```

### 3. 분석 결과 조회
```javascript
async function getGolfSwingAnalysis(analysisId) {
  try {
    const response = await apiClient.get(`/golf-swing/analysis/${analysisId}`);
    return response.data;
  } catch (error) {
    console.error('조회 실패:', error.response?.data?.message);
    throw error;
  }
}

async function getPostureAnalysis(analysisId) {
  try {
    const response = await apiClient.get(`/body-posture/analysis/${analysisId}`);
    return response.data;
  } catch (error) {
    console.error('조회 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
getGolfSwingAnalysis(1).then((data) => {
  console.log('분석 결과:', data.analysisResult);
  console.log('상태:', data.status);
});
```

### 4. 분석 이력 조회
```javascript
async function getAnalysisHistory(subjectId, type = 'all', page = 1, limit = 10) {
  try {
    const response = await apiClient.get(`/history/subject/${subjectId}`, {
      params: {
        type,
        page,
        limit,
      },
    });

    return response.data;
  } catch (error) {
    console.error('이력 조회 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
getAnalysisHistory(1, 'golf', 1, 20).then((data) => {
  console.log('분석 이력:', data.history);
  data.history.forEach((item) => {
    console.log(`${item.date} ${item.time} - ${item.type}`);
  });
});
```

### 5. 캘린더 데이터 조회
```javascript
async function getCalendarData(subjectId, year, month) {
  try {
    const response = await apiClient.get(
      `/history/subject/${subjectId}/calendar`,
      {
        params: { year, month },
      }
    );

    return response.data;
  } catch (error) {
    console.error('캘린더 조회 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
const now = new Date();
getCalendarData(1, now.getFullYear(), now.getMonth() + 1).then((data) => {
  console.log('이번 달 분석 데이터:', data.data);
  console.log('요약:', data.summary);

  // 캘린더 렌더링
  data.data.forEach((day) => {
    console.log(`${day.date}: ${day.analyses.length}건의 분석`);
  });
});
```

### 6. 메모 업데이트
```javascript
async function updateSwingMemo(analysisId, memo) {
  try {
    const response = await apiClient.put(
      `/golf-swing/analysis/${analysisId}/memo`,
      { memo }
    );
    return response.data;
  } catch (error) {
    console.error('메모 업데이트 실패:', error.response?.data?.message);
    throw error;
  }
}

async function updatePostureMemo(analysisId, memo) {
  try {
    const response = await apiClient.put(
      `/body-posture/analysis/${analysisId}/memo`,
      { memo }
    );
    return response.data;
  } catch (error) {
    console.error('메모 업데이트 실패:', error.response?.data?.message);
    throw error;
  }
}

// 사용 예제
updateSwingMemo(1, '좋은 개선이 보입니다!').then(() => {
  console.log('메모 저장 완료');
});
```

---

## 에러 처리 예제

### 공통 에러 핸들러
```javascript
function handleApiError(error) {
  if (error.response) {
    // 서버가 응답을 반환한 경우
    const { status, data } = error.response;

    switch (status) {
      case 400:
        alert(`잘못된 요청: ${data.message}`);
        break;
      case 401:
        alert('로그인이 필요합니다.');
        logout();
        break;
      case 403:
        alert('권한이 없습니다.');
        break;
      case 404:
        alert('요청한 데이터를 찾을 수 없습니다.');
        break;
      case 409:
        alert(`중복된 데이터: ${data.message}`);
        break;
      case 500:
        alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        break;
      default:
        alert('오류가 발생했습니다.');
    }
  } else if (error.request) {
    // 요청이 전송되었지만 응답이 없는 경우
    alert('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  } else {
    // 요청 설정 중 오류가 발생한 경우
    alert('요청 처리 중 오류가 발생했습니다.');
  }

  console.error('API Error:', error);
}

// 사용 예제
getSubjects()
  .then((data) => {
    // 성공 처리
  })
  .catch((error) => {
    handleApiError(error);
  });
```

---

## React Hook 예제

### useAuth Hook
```javascript
import { useState, useEffect } from 'react';
import apiClient from './apiClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });

    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, login, logout, loading };
}
```

### useSubjects Hook
```javascript
import { useState, useEffect } from 'react';
import apiClient from './apiClient';

export function useSubjects(page = 1, limit = 10) {
  const [subjects, setSubjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, [page, limit]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/subjects', {
        params: { page, limit },
      });
      setSubjects(response.data.subjects);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || '조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (data) => {
    const response = await apiClient.post('/subjects', data);
    await fetchSubjects(); // 목록 새로고침
    return response.data;
  };

  const updateSubject = async (id, data) => {
    const response = await apiClient.put(`/subjects/${id}`, data);
    await fetchSubjects(); // 목록 새로고침
    return response.data;
  };

  const deleteSubject = async (id) => {
    await apiClient.delete(`/subjects/${id}`);
    await fetchSubjects(); // 목록 새로고침
  };

  return {
    subjects,
    total,
    loading,
    error,
    createSubject,
    updateSubject,
    deleteSubject,
    refresh: fetchSubjects,
  };
}
```

---

## 참고사항

1. **CORS 설정**: 프론트엔드 도메인이 다른 경우, 백엔드에서 CORS 설정이 필요합니다.

2. **파일 업로드 크기 제한**: 비디오/이미지 파일 크기 제한을 확인하세요.

3. **토큰 만료**: Access Token은 1시간, Refresh Token은 7일 후 만료됩니다.

4. **개발 환경**: 로컬 개발 시 `http://localhost:4000/api`를 사용하세요.

5. **프로덕션 배포**: 배포 시 Base URL을 환경변수로 설정하세요.
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';
   ```
