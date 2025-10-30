import api, { handleApiError } from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants/api';

class SubjectService {
  // 대상자 목록 조회 (강사의 대상자들)
  async getSubjects(params = {}) {
    try {
      const { page = 1, limit = 20, search = '', status = 'active' } = params;
      const response = await api.get(API_ENDPOINTS.SUBJECTS.LIST, {
        params: { page, limit, search, status }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 대상자 상세 조회
  async getSubjectById(id) {
    try {
      const response = await api.get(API_ENDPOINTS.SUBJECTS.GET_BY_ID(id));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 대상자 등록
  async createSubject(subjectData) {
    try {
      const response = await api.post(API_ENDPOINTS.SUBJECTS.CREATE, subjectData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 대상자 정보 수정
  async updateSubject(id, subjectData) {
    try {
      const response = await api.put(API_ENDPOINTS.SUBJECTS.UPDATE(id), subjectData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 대상자 삭제
  async deleteSubject(id) {
    try {
      const response = await api.delete(API_ENDPOINTS.SUBJECTS.DELETE(id));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 대상자 검색
  async searchSubjects(name) {
    try {
      const response = await api.get(API_ENDPOINTS.SUBJECTS.SEARCH, {
        params: { name }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 대상자별 분석 이력 조회
  async getSubjectAnalyses(subjectId, params = {}) {
    try {
      const { page = 1, limit = 20, type = 'all' } = params;
      const response = await api.get(API_ENDPOINTS.SUBJECTS.ANALYSES(subjectId), {
        params: { page, limit, type }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: handleApiError(error) };
    }
  }

  // 선택된 대상자 저장 (로컬스토리지)
  saveSelectedSubject(subject) {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_SUBJECT, JSON.stringify(subject));
      return { success: true, data: subject };
    } catch (error) {
      console.error('[saveSelectedSubject] Error:', error);
      return { success: false, error: { message: '대상자 정보 저장에 실패했습니다.' } };
    }
  }

  // 선택된 대상자 가져오기
  getSelectedSubject() {
    try {
      const subjectStr = localStorage.getItem(STORAGE_KEYS.SELECTED_SUBJECT);
      if (!subjectStr) {
        return { success: false, error: { message: '선택된 대상자가 없습니다.' } };
      }

      const subject = JSON.parse(subjectStr);
      return { success: true, data: subject };
    } catch (error) {
      console.error('[getSelectedSubject] Error:', error);
      return { success: false, error: { message: '대상자 정보를 불러올 수 없습니다.' } };
    }
  }

  // 선택된 대상자 삭제
  clearSelectedSubject() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_SUBJECT);
      return { success: true };
    } catch (error) {
      console.error('[clearSelectedSubject] Error:', error);
      return { success: false, error: { message: '대상자 정보 삭제에 실패했습니다.' } };
    }
  }
}

export const subjectService = new SubjectService();
