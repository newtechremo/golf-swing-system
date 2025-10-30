import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subjectService } from '../services/subject';
import { ROUTES } from '../constants/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SubjectList = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  // 대상자 목록 로드
  const loadSubjects = async (page = 1) => {
    try {
      setLoading(true);
      setError('');

      const result = await subjectService.getSubjects({
        page,
        limit: 20,
        search: searchTerm,
        status: 'active',
      });

      if (result.success) {
        setSubjects(result.data.subjects || []);
        setPagination(result.data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20,
        });
      } else {
        setError(result.error.message || '대상자 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('[SubjectList] Load subjects error:', err);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // 검색
  const handleSearch = () => {
    loadSubjects(1);
  };

  // 대상자 선택
  const handleSelectSubject = (subject) => {
    // 대상자 정보 저장
    subjectService.saveSelectedSubject(subject);
    // 대상자 상세 페이지로 이동
    navigate(ROUTES.SUBJECT_DETAIL.replace(':subjectId', subject.id));
  };

  // 로그아웃
  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  if (loading) {
    return <LoadingSpinner message="대상자 목록을 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">대상자 관리</h1>
              <p className="text-sm text-gray-600 mt-1">
                강사: {user?.name} ({user?.username})
              </p>
            </div>
            <Button variant="secondary" size="medium" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 및 추가 버튼 */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="이름 또는 전화번호로 검색"
              value={searchTerm}
              onChange={setSearchTerm}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="primary" onClick={handleSearch}>
              검색
            </Button>
          </div>
          <Button
            variant="success"
            onClick={() => navigate(ROUTES.SUBJECT_CREATE)}
          >
            + 대상자 등록
          </Button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 대상자 목록 */}
        {subjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">등록된 대상자가 없습니다.</p>
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.SUBJECT_CREATE)}
            >
              첫 대상자 등록하기
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      성별/나이
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      분석 횟수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectSubject(subject)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {subject.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {subject.phoneNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {subject.gender === 'M' ? '남' : subject.gender === 'F' ? '여' : '-'} / {subject.age || '-'}세
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            스윙 {subject.analysisCount?.golfSwing || 0}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            체형 {subject.analysisCount?.posture || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          subject.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subject.status === 'active' ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(ROUTES.SUBJECT_EDIT.replace(':subjectId', subject.id));
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSubject(subject);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={pagination.currentPage === 1}
                  onClick={() => loadSubjects(pagination.currentPage - 1)}
                >
                  이전
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => loadSubjects(pagination.currentPage + 1)}
                >
                  다음
                </Button>
              </div>
            )}

            {/* 통계 */}
            <div className="mt-4 text-center text-sm text-gray-600">
              전체 {pagination.totalItems}명의 대상자
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SubjectList;
