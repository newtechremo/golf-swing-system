import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useInstructor } from '../contexts/InstructorContext';
import { ROUTES } from '../constants/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserAuth = () => {
  const navigate = useNavigate();
  const { loginMember, loading: authLoading } = useAuth();
  const { selectedInstructor, hasSelectedInstructor } = useInstructor();

  const [step, setStep] = useState('phone'); // 'phone' | 'userInfo'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // 강사 선택이 안 되어 있으면 강사 선택 페이지로 이동
  React.useEffect(() => {
    if (!hasSelectedInstructor()) {
      navigate(ROUTES.INSTRUCTOR_SELECT);
    }
  }, [hasSelectedInstructor, navigate]);

  // 전화번호 포맷팅 (010-0000-0000)
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    setError('');
  };

  // 전화번호 검증
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  // Step 1: 전화번호 입력 및 확인
  const handlePhoneNext = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('올바른 전화번호 형식이 아닙니다. (예: 010-0000-0000)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // API 연결 전: 더미 로직
      // 실제로는 서버에 전화번호 확인 요청
      // const duplicateResult = await userService.checkDuplicate(phoneNumber);

      // 임시: 랜덤으로 기존 사용자 or 신규 사용자 판단
      const isExistingUser = Math.random() > 0.5; // 50% 확률

      if (isExistingUser) {
        // 기존 사용자: 로그인 처리
        const result = await loginMember(selectedInstructor.id, phoneNumber);

        if (result.success) {
          // 로그인 성공 -> 대시보드로 이동
          navigate(ROUTES.DASHBOARD);
        } else {
          setError(result.error.message || '로그인에 실패했습니다.');
        }
      } else {
        // 신규 사용자: 정보 입력 단계로
        setStep('userInfo');
      }
    } catch (err) {
      console.error('[UserAuth] Phone check error:', err);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 신규 사용자 정보 입력 및 가입
  const handleUserInfoSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      // API 연결 전: 더미 로직
      // 실제로는 서버에 사용자 생성 요청 후 로그인
      // await userService.createUser({ ...data, phoneNumber, instructorId: selectedInstructor.id });

      const result = await loginMember(selectedInstructor.id, phoneNumber);

      if (result.success) {
        // 가입 및 로그인 성공 -> 대시보드로 이동
        navigate(ROUTES.DASHBOARD);
      } else {
        setError(result.error.message || '회원 가입에 실패했습니다.');
      }
    } catch (err) {
      console.error('[UserAuth] User registration error:', err);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <LoadingSpinner message="인증 처리 중..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">회원 로그인</h1>
          <p className="text-gray-600">
            {step === 'phone' ? '전화번호를 입력해주세요' : '기본 정보를 입력해주세요'}
          </p>
          {selectedInstructor && (
            <p className="mt-2 text-sm text-blue-600">강사: {selectedInstructor.name}</p>
          )}
        </div>

        {/* Step 1: 전화번호 입력 */}
        {step === 'phone' && (
          <div>
            <Input
              label="전화번호"
              type="tel"
              placeholder="010-0000-0000"
              value={phoneNumber}
              onChange={handlePhoneChange}
              error={error}
              required
              maxLength={13}
            />

            <Button
              variant="primary"
              size="large"
              onClick={handlePhoneNext}
              loading={loading}
              disabled={!phoneNumber || loading}
              className="w-full mt-6"
            >
              다음
            </Button>

            <button
              onClick={() => navigate(ROUTES.INSTRUCTOR_SELECT)}
              className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900"
            >
              ← 강사 선택으로 돌아가기
            </button>
          </div>
        )}

        {/* Step 2: 신규 사용자 정보 입력 */}
        {step === 'userInfo' && (
          <form onSubmit={handleSubmit(handleUserInfoSubmit)}>
            <div className="space-y-4">
              <Input
                label="이름"
                type="text"
                placeholder="홍길동"
                {...register('name', { required: '이름을 입력해주세요' })}
                error={errors.name?.message}
                required
              />

              <Input
                label="생년월일"
                type="date"
                {...register('birthDate')}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
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
                </div>
              </div>

              <Input
                label="키 (cm)"
                type="number"
                placeholder="175"
                {...register('height', { min: 100, max: 250 })}
                error={errors.height?.message}
              />

              <Input
                label="몸무게 (kg)"
                type="number"
                placeholder="70"
                {...register('weight', { min: 30, max: 200 })}
                error={errors.weight?.message}
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                variant="primary"
                size="large"
                loading={loading}
                disabled={loading}
                className="w-full mt-6"
              >
                회원 가입 및 로그인
              </Button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full mt-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← 이전으로
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserAuth;
