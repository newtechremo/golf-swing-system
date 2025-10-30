import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');

    const result = await login({
      username: data.username,
      password: data.password,
    });

    if (result.success) {
      // 로그인 성공 -> 대상자 목록으로 이동
      navigate(ROUTES.SUBJECT_LIST);
    } else {
      setError(result.error.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FINEFIT Park Golf</h1>
          <p className="text-gray-600">강사 로그인</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="아이디"
            type="text"
            placeholder="instructor001"
            {...register('username', { required: '아이디를 입력해주세요' })}
            error={errors.username?.message}
            required
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            {...register('password', { required: '비밀번호를 입력해주세요' })}
            error={errors.password?.message}
            required
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            loading={loading}
            disabled={loading}
            className="w-full mt-6"
          >
            로그인
          </Button>
        </form>

        {/* 도움말 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>테스트 계정: test_instructor / test1234</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
