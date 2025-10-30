import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ROUTES } from './constants/api';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubjectList from './pages/SubjectList';
import SubjectForm from './pages/SubjectForm';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.LOGIN} replace />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />

          {/* Protected Routes - 강사 인증 필요 */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.SUBJECT_LIST}
            element={
              <ProtectedRoute>
                <SubjectList />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.SUBJECT_CREATE}
            element={
              <ProtectedRoute>
                <SubjectForm isEdit={false} />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.SUBJECT_EDIT}
            element={
              <ProtectedRoute>
                <SubjectForm isEdit={true} />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.SUBJECT_DETAIL}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* TODO: 추가 기능 라우트 */}
          <Route
            path={ROUTES.GOLF_SWING_UPLOAD}
            element={
              <ProtectedRoute>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">골프 스윙 분석 (준비 중)</h1>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.GOLF_SWING_RESULT}
            element={
              <ProtectedRoute>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">스윙 분석 결과 (준비 중)</h1>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.POSTURE_UPLOAD}
            element={
              <ProtectedRoute>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">체형 분석 (준비 중)</h1>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.POSTURE_RESULT}
            element={
              <ProtectedRoute>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">체형 분석 결과 (준비 중)</h1>
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.HISTORY}
            element={
              <ProtectedRoute>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-bold">분석 이력 (준비 중)</h1>
                </div>
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
