/**
 * REMO API 응답 필드 확인 스크립트
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

async function checkRemoResponse() {
  console.log('=== REMO API 응답 필드 확인 ===\n');

  // 로그인
  const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  const token = loginResponse.data.accessToken;
  console.log('로그인 성공\n');

  // 분석 결과 조회 (최근 분석)
  const headers = { Authorization: `Bearer ${token}` };

  // 최근 분석 ID 조회 (16번이 마지막 테스트)
  const analysisId = 16;

  const resultResponse = await axios.get(`${BASE_URL}/body-posture/analysis/${analysisId}`, { headers });

  console.log('=== 분석 결과 전체 구조 ===');
  console.log(JSON.stringify(resultResponse.data, null, 2));

  // 결과 내 이미지 관련 필드 확인
  if (resultResponse.data.results) {
    console.log('\n=== 정면 결과 필드 ===');
    console.log(Object.keys(resultResponse.data.results.front || {}));

    console.log('\n=== 측면 결과 필드 ===');
    console.log(Object.keys(resultResponse.data.results.side || {}));

    console.log('\n=== 후면 결과 필드 ===');
    console.log(Object.keys(resultResponse.data.results.back || {}));
  }
}

checkRemoResponse().catch(err => {
  console.error('에러:', err.response?.data || err.message);
  process.exit(1);
});
