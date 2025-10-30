import React, { createContext, useState, useEffect, useContext } from 'react';
import { instructorService } from '../services/instructor';

const InstructorContext = createContext(null);

export const InstructorProvider = ({ children }) => {
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [activeInstructors, setActiveInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 초기화
  useEffect(() => {
    const initializeInstructor = async () => {
      try {
        setLoading(true);

        // 저장된 강사 정보 복원
        const instructorResult = instructorService.getSelectedInstructor();
        if (instructorResult.success && instructorService.validateSelectedInstructor()) {
          setSelectedInstructor(instructorResult.data);
        }

        // 활성 강사 목록 로드 (실제 API 연결 후에는 주석 해제)
        // await loadActiveInstructors();
      } catch (err) {
        console.error('[InstructorContext] Initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeInstructor();
  }, []);

  // 활성 강사 목록 로드
  const loadActiveInstructors = async () => {
    try {
      setLoading(true);
      const result = await instructorService.getActiveInstructors();

      if (result.success) {
        setActiveInstructors(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }

      return result;
    } catch (err) {
      console.error('[InstructorContext] Load instructors error:', err);
      setError(err.message);
      return { success: false, error: { message: err.message } };
    } finally {
      setLoading(false);
    }
  };

  // 강사 선택
  const selectInstructor = (instructor) => {
    const result = instructorService.saveSelectedInstructor(instructor);

    if (result.success) {
      setSelectedInstructor(result.data);
      setError(null);
    } else {
      setError(result.error.message);
    }

    return result;
  };

  // 강사 선택 해제
  const clearInstructor = () => {
    const result = instructorService.clearSelectedInstructor();

    if (result.success) {
      setSelectedInstructor(null);
      setError(null);
    }

    return result;
  };

  // 강사 선택 여부 확인
  const hasSelectedInstructor = () => {
    return !!selectedInstructor && instructorService.validateSelectedInstructor();
  };

  const value = {
    selectedInstructor,
    activeInstructors,
    loading,
    error,
    loadActiveInstructors,
    selectInstructor,
    clearInstructor,
    hasSelectedInstructor,
  };

  return <InstructorContext.Provider value={value}>{children}</InstructorContext.Provider>;
};

export const useInstructor = () => {
  const context = useContext(InstructorContext);
  if (!context) {
    throw new Error('useInstructor must be used within InstructorProvider');
  }
  return context;
};
