import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { subjectService } from '../services/subject';
import { ROUTES } from '../constants/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SubjectForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEdit && subjectId) {
      loadSubjectData();
    }
  }, [isEdit, subjectId]);

  const loadSubjectData = async () => {
    try {
      setFetchLoading(true);
      const result = await subjectService.getSubjectById(subjectId);

      if (result.success) {
        const subject = result.data;
        setValue('name', subject.name);
        setValue('phoneNumber', subject.phoneNumber);
        setValue('birthDate', subject.birthDate);
        setValue('gender', subject.gender);
        setValue('height', subject.height);
        setValue('weight', subject.weight);
        setValue('email', subject.email);
        setValue('memo', subject.memo);
      } else {
        setError(result.error.message || '대상자 정보를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('[SubjectForm] Load subject error:', err);
      setError('오류가 발생했습니다.');
    } finally {
      setFetchLoading(false);
    }
  };

  // 전화번호 포맷팅
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const phoneNumber = watch('phoneNumber');

  useEffect(() => {
    if (phoneNumber) {
      const formatted = formatPhoneNumber(phoneNumber);
      if (formatted !== phoneNumber) {
        setValue('phoneNumber', formatted);
      }
    }
  }, [phoneNumber, setValue]);

  // 폼 제출
  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      const subjectData = {
        name: data.name,
        phoneNumber: data.phoneNumber,
        birthDate: data.birthDate || null,
        gender: data.gender || null,
        height: data.height ? parseFloat(data.height) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        email: data.email || null,
        memo: data.memo || null,
      };

      const result = isEdit
        ? await subjectService.updateSubject(subjectId, subjectData)
        : await subjectService.createSubject(subjectData);

      if (result.success) {
        alert(isEdit ? '대상자 정보가 수정되었습니다.' : '대상자가 등록되었습니다.');
        navigate(ROUTES.SUBJECT_LIST);
      } else {
        setError(result.error.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('[SubjectForm] Submit error:', err);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return <LoadingSpinner message="대상자 정보를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(ROUTES.SUBJECT_LIST)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            ← 목록으로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? '대상자 정보 수정' : '대상자 등록'}
          </h1>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 필수 정보 */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">필수 정보</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="이름"
                  type="text"
                  placeholder="홍길동"
                  {...register('name', { required: '이름을 입력해주세요' })}
                  error={errors.name?.message}
                  required
                />

                <Input
                  label="전화번호"
                  type="tel"
                  placeholder="010-0000-0000"
                  {...register('phoneNumber', {
                    required: '전화번호를 입력해주세요',
                    pattern: {
                      value: /^010-\d{4}-\d{4}$/,
                      message: '올바른 전화번호 형식이 아닙니다'
                    }
                  })}
                  error={errors.phoneNumber?.message}
                  required
                  maxLength={13}
                />
              </div>
            </div>

            {/* 선택 정보 */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">선택 정보</h2>

              <div className="space-y-4">
                <Input
                  label="생년월일"
                  type="date"
                  {...register('birthDate')}
                  error={errors.birthDate?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    성별
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="M"
                        {...register('gender')}
                        className="mr-2"
                      />
                      남성
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="F"
                        {...register('gender')}
                        className="mr-2"
                      />
                      여성
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="Other"
                        {...register('gender')}
                        className="mr-2"
                      />
                      기타
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="키 (cm)"
                    type="number"
                    step="0.1"
                    placeholder="175.0"
                    {...register('height', { min: 100, max: 250 })}
                    error={errors.height?.message}
                  />

                  <Input
                    label="몸무게 (kg)"
                    type="number"
                    step="0.1"
                    placeholder="70.0"
                    {...register('weight', { min: 30, max: 200 })}
                    error={errors.weight?.message}
                  />
                </div>

                <Input
                  label="이메일"
                  type="email"
                  placeholder="example@email.com"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '올바른 이메일 형식이 아닙니다'
                    }
                  })}
                  error={errors.email?.message}
                />
              </div>
            </div>

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메모
              </label>
              <textarea
                {...register('memo')}
                rows={4}
                placeholder="대상자에 대한 메모를 입력하세요..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                size="large"
                onClick={() => navigate(ROUTES.SUBJECT_LIST)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                loading={loading}
                disabled={loading}
                className="flex-1"
              >
                {isEdit ? '수정하기' : '등록하기'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubjectForm;
