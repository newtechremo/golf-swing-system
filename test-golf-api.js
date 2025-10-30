const axios = require('axios');
const fs = require('fs');

// REMO API 인증 정보
const REMO_CONFIG = {
  email: 'example@example.com',
  userKey: 'ex!!',
  apiKey: '88fd431945dab704836e894d6d5837d6',
  baseUrl: 'http://api.remo.re.kr'
};

// 테스트용 골프 비디오 URL
const TEST_VIDEO_URL = 'https://fourwk-public.s3.ap-northeast-2.amazonaws.com/motion-analysis-samples/golf.mp4';

async function testGolfAnalysisRequest() {
  console.log('\n=== Testing Golf Video Analysis Request ===\n');

  const uuid = `test-${Date.now()}`;
  const requestData = {
    bucket_url: TEST_VIDEO_URL,
    id: REMO_CONFIG.email,
    uuid: uuid,
    height: '170',
    credit: 1000,
    Email: REMO_CONFIG.email,
    UserKey: REMO_CONFIG.userKey,
    APIKey: REMO_CONFIG.apiKey
  };

  try {
    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-golf`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    // 분석이 성공하면 대기 시간 후 결과 조회
    if (response.data.state === 1 && response.data.wait_time) {
      console.log(`\nWaiting ${response.data.wait_time} seconds for analysis to complete...`);

      // 대기 시간 + 추가 버퍼
      await new Promise(resolve => setTimeout(resolve, (response.data.wait_time + 5) * 1000));

      // 결과 조회
      await testGolfAnalysisResult(uuid);
      await testGolfAnalysisVideo(uuid);
      await testGolfAnalysisAngle(uuid);
    }

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

async function testGolfAnalysisResult(uuid) {
  console.log('\n=== Testing Golf Analysis Result ===\n');

  const requestData = {
    id: REMO_CONFIG.email,
    uuid: uuid,
    Email: REMO_CONFIG.email,
    UserKey: REMO_CONFIG.userKey,
    APIKey: REMO_CONFIG.apiKey
  };

  try {
    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-golf-result`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Data Keys:', Object.keys(response.data));

    // 각 스윙 단계의 데이터 구조 출력
    if (response.data.address) {
      console.log('\nAddress Phase Structure:', Object.keys(response.data.address));
      console.log('Address Phase Sample:', response.data.address);
    }

    if (response.data.takeback) {
      console.log('\nTakeback Phase Structure:', Object.keys(response.data.takeback));
    }

    // 전체 응답을 파일로 저장
    fs.writeFileSync('golf-result-response.json', JSON.stringify(response.data, null, 2));
    console.log('\nFull response saved to golf-result-response.json');

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testGolfAnalysisVideo(uuid) {
  console.log('\n=== Testing Golf Analysis Video ===\n');

  const requestData = {
    id: REMO_CONFIG.email,
    uuid: uuid,
    Email: REMO_CONFIG.email,
    UserKey: REMO_CONFIG.userKey,
    APIKey: REMO_CONFIG.apiKey
  };

  try {
    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-golf-draw`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response Status:', response.status);
    console.log('Has base64_video:', !!response.data.base64_video);
    console.log('base64_video length:', response.data.base64_video?.length);

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testGolfAnalysisAngle(uuid) {
  console.log('\n=== Testing Golf Analysis Angle ===\n');

  const requestData = {
    id: REMO_CONFIG.email,
    uuid: uuid,
    Email: REMO_CONFIG.email,
    UserKey: REMO_CONFIG.userKey,
    APIKey: REMO_CONFIG.apiKey
  };

  try {
    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-golf-angle`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Data Keys:', Object.keys(response.data));

    // 각 부위의 데이터 구조 출력
    if (response.data.KneeLine) {
      console.log('\nKneeLine data points:', response.data.KneeLine.length);
      console.log('KneeLine sample:', response.data.KneeLine[0]);
    }

    if (response.data.Pelvis) {
      console.log('\nPelvis data points:', response.data.Pelvis.length);
      console.log('Pelvis sample:', response.data.Pelvis[0]);
    }

    if (response.data.ShoulderLine) {
      console.log('\nShoulderLine data points:', response.data.ShoulderLine.length);
      console.log('ShoulderLine sample:', response.data.ShoulderLine[0]);
    }

    // 전체 응답을 파일로 저장
    fs.writeFileSync('golf-angle-response.json', JSON.stringify(response.data, null, 2));
    console.log('\nFull response saved to golf-angle-response.json');

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// 테스트 실행
async function runTests() {
  try {
    await testGolfAnalysisRequest();
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();
