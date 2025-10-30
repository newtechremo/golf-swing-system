// API Endpoints (변경된 구조: Center → User(강사) → Subject(대상자) → Analysis)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',  // 강사 로그인 (username + password)
    REFRESH: '/auth/refresh',
  },
  SUBJECTS: {
    LIST: '/subjects',
    CREATE: '/subjects',
    GET_BY_ID: (id) => `/subjects/${id}`,
    UPDATE: (id) => `/subjects/${id}`,
    DELETE: (id) => `/subjects/${id}`,
    SEARCH: '/subjects/search',
    ANALYSES: (id) => `/subjects/${id}/analyses`,  // 대상자별 분석 이력
  },
  GOLF_SWING: {
    ANALYZE: '/golf-swing/analyze',
    GET_RESULT: (id) => `/golf-swing/analysis/${id}`,
    UPDATE_MEMO: (id) => `/golf-swing/analysis/${id}/memo`,
  },
  POSTURE: {
    ANALYZE: '/posture/analyze',
    GET_RESULT: (id) => `/posture/analysis/${id}`,
    UPDATE_MEMO: (id) => `/posture/analysis/${id}/memo`,
  },
  PDF: {
    GOLF_SWING: (id) => `/pdf/golf-swing/${id}`,
    POSTURE: (id) => `/pdf/posture/${id}`,
    DOWNLOAD: (token) => `/pdf/download/${token}`,
  },
  HISTORY: {
    LIST: '/history',  // Query params: subjectId, type, page, limit
    CALENDAR: '/history/calendar',  // Query params: subjectId, year, month
  },
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',  // 강사 로그인
  DASHBOARD: '/dashboard',
  SUBJECT_LIST: '/subjects',
  SUBJECT_CREATE: '/subjects/new',
  SUBJECT_DETAIL: '/subjects/:subjectId',
  SUBJECT_EDIT: '/subjects/:subjectId/edit',
  GOLF_SWING_UPLOAD: '/analysis/golf-swing/upload',
  GOLF_SWING_RESULT: '/analysis/golf-swing/:analysisId',
  POSTURE_UPLOAD: '/analysis/posture/upload',
  POSTURE_RESULT: '/analysis/posture/:analysisId',
  HISTORY: '/history',
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CURRENT_USER: 'currentUser',  // 강사 정보
  SELECTED_SUBJECT: 'selectedSubject',  // 현재 선택된 대상자
};
