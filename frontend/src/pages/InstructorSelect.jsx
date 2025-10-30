import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstructor } from '../contexts/InstructorContext';
import { ROUTES } from '../constants/api';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const InstructorSelect = () => {
  const navigate = useNavigate();
  const { selectedInstructor, activeInstructors, loading, selectInstructor, hasSelectedInstructor } = useInstructor();

  const [selectedInstructorLocal, setSelectedInstructorLocal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // 이미 선택된 강사가 있으면 설정
    if (selectedInstructor) {
      setSelectedInstructorLocal(selectedInstructor);
    }
  }, [selectedInstructor]);

  // 임시 더미 데이터 (API 연결 전)
  const dummyInstructors = [
    { id: 1, name: '김강사', phoneNumber: '010-1234-5678', isCertified: true, status: 'active' },
    { id: 2, name: '이강사', phoneNumber: '010-2345-6789', isCertified: true, status: 'active' },
    { id: 3, name: '박강사', phoneNumber: '010-3456-7890', isCertified: false, status: 'active' },
  ];

  const instructors = activeInstructors.length > 0 ? activeInstructors : dummyInstructors;

  // 검색 필터링
  const filteredInstructors = instructors.filter((instructor) =>
    instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.phoneNumber.includes(searchTerm)
  );

  const handleSelectInstructor = (instructor) => {
    setSelectedInstructorLocal(instructor);
    setSearchTerm(instructor.name);
    setShowDropdown(false);
  };

  const handleNext = () => {
    if (!selectedInstructorLocal) {
      alert('강사를 선택해주세요.');
      return;
    }

    const result = selectInstructor(selectedInstructorLocal);
    if (result.success) {
      navigate(ROUTES.MEMBER_AUTH);
    } else {
      alert(result.error.message || '강사 선택에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="강사 목록을 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FINEFIT Park Golf</h1>
          <p className="text-gray-600">강사를 선택해주세요</p>
        </div>

        {/* 강사 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            강사 선택 <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <input
              type="text"
              placeholder="강사 이름 또는 전화번호 검색"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* 드롭다운 목록 */}
            {showDropdown && searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredInstructors.length > 0 ? (
                  filteredInstructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      onClick={() => handleSelectInstructor(instructor)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{instructor.name}</div>
                      <div className="text-sm text-gray-500">{instructor.phoneNumber}</div>
                      {instructor.isCertified && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                          인증 강사
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center text-gray-500">검색 결과가 없습니다.</div>
                )}
              </div>
            )}
          </div>

          {/* 선택된 강사 표시 */}
          {selectedInstructorLocal && !showDropdown && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{selectedInstructorLocal.name}</div>
                  <div className="text-sm text-gray-600">{selectedInstructorLocal.phoneNumber}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedInstructorLocal(null);
                    setSearchTerm('');
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  변경
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 다음 버튼 */}
        <Button
          variant="primary"
          size="large"
          onClick={handleNext}
          className="w-full"
          disabled={!selectedInstructorLocal}
        >
          다음
        </Button>

        {/* 이미 선택된 강사가 있는 경우 */}
        {hasSelectedInstructor() && (
          <div className="mt-4 text-center text-sm text-gray-600">
            이전에 선택한 강사: <span className="font-semibold">{selectedInstructor?.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorSelect;
