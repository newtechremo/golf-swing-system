// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    INSTRUCTOR_LOGIN: '/auth/instructor/login',
    MEMBER_LOGIN: '/auth/member/login',
    REFRESH: '/auth/refresh',
  },
  MEMBERS: {
    LIST: '/members',
    CREATE: '/members',
    GET_BY_ID: (id) => `/members/${id}`,
    UPDATE: (id) => `/members/${id}`,
    HISTORY: (id) => `/members/${id}/history`,
    CALENDAR: (id) => `/members/${id}/history/calendar`,
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
  INSTRUCTORS: {
    LIST: '/instructors/active/list',
  },
};

// Routes
export const ROUTES = {
  HOME: '/',
  INSTRUCTOR_SELECT: '/instructor-select',
  MEMBER_AUTH: '/member-auth',
  DASHBOARD: '/dashboard',
  MEMBER_LIST: '/members',
  MEMBER_DETAIL: '/members/:memberId',
  GOLF_SWING_UPLOAD: '/analysis/golf-swing/upload',
  GOLF_SWING_RESULT: '/analysis/golf-swing/:analysisId',
  POSTURE_UPLOAD: '/analysis/posture/upload',
  POSTURE_RESULT: '/analysis/posture/:analysisId',
  HISTORY_LIST: '/members/:memberId/history',
  HISTORY_CALENDAR: '/members/:memberId/calendar',
};

// Storage Keys
export const STORAGE_KEYS = {
  SELECTED_INSTRUCTOR: 'selectedInstructor',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CURRENT_USER: 'currentUser',
};
