const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3003/api';
const TEST_DATA_DIR = '/mnt/d/work/node/golf_swing_system/test_data';

async function testFullFlow() {
  console.log('=== 체형분석 전체 플로우 테스트 ===\n');

  // 1. 로그인
  console.log('1. 로그인 중...');
  const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  const token = loginResponse.data.accessToken;
  console.log('   로그인 성공!\n');

  const headers = { Authorization: `Bearer ${token}` };

  // 2. 체형분석 업로드 (정면, 측면, 후면)
  console.log('2. 체형분석 이미지 업로드 중...');
  console.log('   - front.jpg');
  console.log('   - side.JPG');
  console.log('   - back.jpg');

  const formData = new FormData();
  formData.append('subjectId', '6');
  formData.append('front', fs.createReadStream(path.join(TEST_DATA_DIR, 'front.jpg')));
  formData.append('side', fs.createReadStream(path.join(TEST_DATA_DIR, 'side.JPG')));
  formData.append('back', fs.createReadStream(path.join(TEST_DATA_DIR, 'back.jpg')));

  const uploadStart = Date.now();
  const uploadResponse = await axios.post(`${BASE_URL}/body-posture/analyze`, formData, {
    headers: { ...headers, ...formData.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);

  console.log(`\n   ✅ 업로드 및 분석 완료 (${uploadTime}초)`);
  console.log('   분석 ID:', uploadResponse.data.analysisId);
  console.log('   메시지:', uploadResponse.data.message);

  // 분석 결과 확인 (즉시 반환됨)
  console.log('\n   📊 분석 결과:');
  if (uploadResponse.data.results) {
    if (uploadResponse.data.results.front) {
      console.log('     - 정면: state =', uploadResponse.data.results.front.state);
    }
    if (uploadResponse.data.results.side) {
      console.log('     - 측면: state =', uploadResponse.data.results.side.state);
    }
    if (uploadResponse.data.results.back) {
      console.log('     - 후면: state =', uploadResponse.data.results.back.state);
    }
  }
  console.log('');

  const analysisId = uploadResponse.data.analysisId;

  // 3. DB에서 분석 결과 조회
  console.log('3. DB에서 분석 결과 조회...');
  const resultResponse = await axios.get(`${BASE_URL}/body-posture/analysis/${analysisId}`, { headers });
  console.log('   전체 상태:', resultResponse.data.status);
  console.log('   이미지 상태:');
  console.log('     - 정면:', resultResponse.data.images?.front?.status);
  console.log('     - 측면:', resultResponse.data.images?.side?.status);
  console.log('     - 후면:', resultResponse.data.images?.back?.status);

  // 결과 데이터 확인 (완료된 경우에만 results가 있음)
  if (resultResponse.data.results?.front) {
    console.log('\n   📊 정면 분석 결과 저장됨');
    const front = resultResponse.data.results.front;
    console.log('      - 머리 균형:', front.headBalanceValue, front.headBalanceGrade);
    console.log('      - 어깨 균형:', front.shoulderBalanceValue, front.shoulderBalanceGrade);
  }
  if (resultResponse.data.results?.side) {
    console.log('   📊 측면 분석 결과 저장됨');
    const side = resultResponse.data.results.side;
    console.log('      - 라운드숄더:', side.roundShoulderValue, side.roundShoulderGrade);
    console.log('      - 거북목:', side.turtleNeckValue, side.turtleNeckGrade);
  }
  if (resultResponse.data.results?.back) {
    console.log('   📊 후면 분석 결과 저장됨');
    const back = resultResponse.data.results.back;
    console.log('      - 머리 균형:', back.headBalanceValue, back.headBalanceGrade);
  }

  console.log('\n=== 전체 응답 데이터 (요약) ===');
  const summary = {
    analysisId: resultResponse.data.id,
    analysisDate: resultResponse.data.analysisDate,
    status: resultResponse.data.status,
    subject: resultResponse.data.subject?.name,
    images: {
      front: resultResponse.data.images?.front?.status,
      side: resultResponse.data.images?.side?.status,
      back: resultResponse.data.images?.back?.status,
    },
    hasResults: {
      front: !!resultResponse.data.results?.front,
      side: !!resultResponse.data.results?.side,
      back: !!resultResponse.data.results?.back,
    },
  };
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n=== 테스트 완료 ===');
}

testFullFlow().catch(err => {
  console.error('❌ 에러:', err.response?.data || err.message);
  process.exit(1);
});
