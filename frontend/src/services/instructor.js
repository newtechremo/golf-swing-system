import api, { handleApiError } from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants/api';

class InstructorService {
  // 활성 강사 목록 조회 (센터 개념 대신 강사 개념)
  async getActiveInstructors() {
    try {
      const response = await api.get(API_ENDPOINTS.INSTRUCTORS.LIST);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 선택한 강사 로컬스토리지에 저장
  saveSelectedInstructor(instructor) {
    try {
      const instructorData = {
        ...instructor,
        selectedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SELECTED_INSTRUCTOR, JSON.stringify(instructorData));
      return { success: true, data: instructorData };
    } catch (error) {
      console.error('[saveSelectedInstructor] Error:', error);
      return { success: false, error: { message: '강사 정보 저장에 실패했습니다.' } };
    }
  }

  // 저장된 강사 정보 가져오기
  getSelectedInstructor() {
    try {
      const instructorStr = localStorage.getItem(STORAGE_KEYS.SELECTED_INSTRUCTOR);
      if (!instructorStr) {
        return { success: false, error: { message: '선택된 강사가 없습니다.' } };
      }

      const instructor = JSON.parse(instructorStr);
      return { success: true, data: instructor };
    } catch (error) {
      console.error('[getSelectedInstructor] Error:', error);
      return { success: false, error: { message: '강사 정보를 불러올 수 없습니다.' } };
    }
  }

  // 강사 정보 삭제
  clearSelectedInstructor() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_INSTRUCTOR);
      return { success: true };
    } catch (error) {
      console.error('[clearSelectedInstructor] Error:', error);
      return { success: false, error: { message: '강사 정보 삭제에 실패했습니다.' } };
    }
  }

  // 선택된 강사 유효성 검증 (7일 기한)
  validateSelectedInstructor() {
    const result = this.getSelectedInstructor();
    if (!result.success) return false;

    const { selectedAt } = result.data;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return new Date(selectedAt) > sevenDaysAgo;
  }
}

export const instructorService = new InstructorService();
