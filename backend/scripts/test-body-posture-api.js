const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';
const TEST_DATA_DIR = path.join(__dirname, '../../test_data');

async function main() {
  try {
    console.log('=== 체형분석 API 테스트 시작 ===\n');

    // 1. 로그인하여 토큰 획득
    console.log('1. 로그인 중...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('   로그인 응답:', JSON.stringify(loginRes.data, null, 2));
    const token = loginRes.data.accessToken || loginRes.data.access_token;
    if (!token) {
      throw new Error('토큰을 찾을 수 없습니다. 응답: ' + JSON.stringify(loginRes.data));
    }
    console.log('   로그인 성공! 토큰 획득:', token.substring(0, 50) + '...\n');

    // 2. 테스트 파일 확인
    console.log('2. 테스트 파일 확인...');
    const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
    const sidePath = path.join(TEST_DATA_DIR, 'side.JPG');
    const backPath = path.join(TEST_DATA_DIR, 'back.jpg');

    if (!fs.existsSync(frontPath)) throw new Error('front.jpg not found');
    if (!fs.existsSync(sidePath)) throw new Error('side.JPG not found');
    if (!fs.existsSync(backPath)) throw new Error('back.jpg not found');

    const frontSize = fs.statSync(frontPath).size;
    const sideSize = fs.statSync(sidePath).size;
    const backSize = fs.statSync(backPath).size;

    console.log(`   front.jpg: ${(frontSize / 1024).toFixed(1)} KB`);
    console.log(`   side.JPG: ${(sideSize / 1024).toFixed(1)} KB`);
    console.log(`   back.jpg: ${(backSize / 1024).toFixed(1)} KB\n`);

    // 3. 체형분석 API 호출
    console.log('3. 체형분석 API 호출 중...');
    console.log('   POST /api/body-posture/analyze\n');

    const form = new FormData();
    form.append('front', fs.createReadStream(frontPath));
    form.append('side', fs.createReadStream(sidePath));
    form.append('back', fs.createReadStream(backPath));
    form.append('subjectId', '1'); // instructor001의 회원 (홍길동)

    const startTime = Date.now();

    const uploadRes = await axios.post(`${BASE_URL}/body-posture/analyze`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 120000 // 2분 타임아웃
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('=== API 응답 ===');
    console.log(`응답 시간: ${elapsed}초`);
    console.log('응답 데이터:');
    console.log(JSON.stringify(uploadRes.data, null, 2));

    // 4. 결과 분석
    console.log('\n=== 결과 분석 ===');
    if (uploadRes.data.analysisId) {
      console.log(`✅ 분석 ID 생성됨: ${uploadRes.data.analysisId}`);
    }
    if (uploadRes.data.frontUuid && !uploadRes.data.frontUuid.includes('mock')) {
      console.log(`✅ REMO API 성공 - 실제 UUID 사용`);
      console.log(`   Front UUID: ${uploadRes.data.frontUuid}`);
      console.log(`   Side UUID: ${uploadRes.data.sideUuid}`);
      console.log(`   Back UUID: ${uploadRes.data.backUuid}`);
    } else if (uploadRes.data.frontUuid && uploadRes.data.frontUuid.includes('mock')) {
      console.log(`⚠️ REMO API 실패 - Mock UUID 사용`);
      console.log(`   이유: REMO API 호출이 실패하여 mock UUID로 대체됨`);
    }

  } catch (error) {
    console.error('\n❌ 에러 발생:');
    if (error.response) {
      console.error(`   상태 코드: ${error.response.status}`);
      console.error(`   응답: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

main();
