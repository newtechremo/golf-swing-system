const axios = require('axios');
const fs = require('fs');

// REMO API 인증 정보
const REMO_CONFIG = {
  email: 'example@example.com',
  userKey: 'ex!!',
  apiKey: '88fd431945dab704836e894d6d5837d6',
  baseUrl: 'http://api.remo.re.kr'
};

// 파일을 base64로 인코딩
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// 골프 스윙 분석 요청
async function testGolfSwingAnalysis() {
  console.log('\n========================================');
  console.log('Golf Swing Analysis Test');
  console.log('========================================\n');

  const uuid = `golf-${Date.now()}`;

  try {
    // 1. 골프 스윙 분석 요청
    console.log('1. Requesting golf swing analysis...');
    const requestData = {
      bucket_url: 'https://fourwk-public.s3.ap-northeast-2.amazonaws.com/motion-analysis-samples/golf.mp4',
      id: REMO_CONFIG.email,
      uuid: uuid,
      height: '170',
      credit: 1000,
      Email: REMO_CONFIG.email,
      UserKey: REMO_CONFIG.userKey,
      APIKey: REMO_CONFIG.apiKey
    };

    const analysisResponse = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-golf`,
      requestData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Analysis Request Response:', JSON.stringify(analysisResponse.data, null, 2));

    if (analysisResponse.data.state === 1) {
      const waitTime = analysisResponse.data.wait_time || 10;
      console.log(`\nWaiting ${waitTime + 5} seconds for analysis to complete...`);
      await new Promise(resolve => setTimeout(resolve, (waitTime + 5) * 1000));

      // 2. 골프 스윙 분석 결과 조회
      console.log('\n2. Fetching golf swing analysis result...');
      const resultResponse = await axios.post(
        `${REMO_CONFIG.baseUrl}/api/analysis-golf-result`,
        {
          id: REMO_CONFIG.email,
          uuid: uuid,
          Email: REMO_CONFIG.email,
          UserKey: REMO_CONFIG.userKey,
          APIKey: REMO_CONFIG.apiKey
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('Result Response Keys:', Object.keys(resultResponse.data));
      fs.writeFileSync('api-responses/golf-result.json', JSON.stringify(resultResponse.data, null, 2));
      console.log('Full result saved to api-responses/golf-result.json');

      // 3. 골프 스윙 각도 데이터 조회
      console.log('\n3. Fetching golf swing angle data...');
      const angleResponse = await axios.post(
        `${REMO_CONFIG.baseUrl}/api/analysis-golf-angle`,
        {
          id: REMO_CONFIG.email,
          uuid: uuid,
          Email: REMO_CONFIG.email,
          UserKey: REMO_CONFIG.userKey,
          APIKey: REMO_CONFIG.apiKey
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('Angle Response Keys:', Object.keys(angleResponse.data));
      fs.writeFileSync('api-responses/golf-angle.json', JSON.stringify(angleResponse.data, null, 2));
      console.log('Full angle data saved to api-responses/golf-angle.json');

      // 4. 골프 스윙 분석 비디오 조회
      console.log('\n4. Fetching golf swing analysis video...');
      const videoResponse = await axios.post(
        `${REMO_CONFIG.baseUrl}/api/analysis-golf-draw`,
        {
          id: REMO_CONFIG.email,
          uuid: uuid,
          Email: REMO_CONFIG.email,
          UserKey: REMO_CONFIG.userKey,
          APIKey: REMO_CONFIG.apiKey
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('Video Response - has base64_video:', !!videoResponse.data.base64_video);
      console.log('Video base64 length:', videoResponse.data.base64_video?.length || 0);

      return {
        uuid,
        result: resultResponse.data,
        angle: angleResponse.data,
        video: !!videoResponse.data.base64_video
      };
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// 체형 분석 - 정면
async function testFrontPostureAnalysis() {
  console.log('\n========================================');
  console.log('Front Posture Analysis Test');
  console.log('========================================\n');

  try {
    const base64Image = fileToBase64('test_data/front.jpg');

    const requestData = {
      Email: REMO_CONFIG.email,
      UserKey: REMO_CONFIG.userKey,
      APIKey: REMO_CONFIG.apiKey,
      forigimg: base64Image
    };

    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-skeleton-v2-front`,
      requestData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Response Status:', response.data.state);
    console.log('Response Keys:', Object.keys(response.data));

    // 측정 값들 출력
    const metrics = [
      'far_head_bal_m_',
      'far_pelvic_bal_m_',
      'far_shoulder_bal_m_',
      'far_knee_bal_m_',
      'far_tilt_m_',
      'far_left_qang_m_',
      'far_right_qang_m_'
    ];

    console.log('\nFront Posture Metrics:');
    metrics.forEach(metric => {
      if (response.data[metric] !== undefined) {
        const grade = response.data[metric.replace('_m_', '_grade')] || 'N/A';
        console.log(`  ${metric}: ${response.data[metric]}° (Grade: ${grade})`);
      }
    });

    fs.writeFileSync('api-responses/front-posture.json', JSON.stringify(response.data, null, 2));
    console.log('\nFull response saved to api-responses/front-posture.json');

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// 체형 분석 - 측면
async function testSidePostureAnalysis() {
  console.log('\n========================================');
  console.log('Side Posture Analysis Test');
  console.log('========================================\n');

  try {
    const base64Image = fileToBase64('test_data/side.JPG');

    const requestData = {
      Email: REMO_CONFIG.email,
      UserKey: REMO_CONFIG.userKey,
      APIKey: REMO_CONFIG.apiKey,
      sorigimg: base64Image
    };

    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-skeleton-v2-side`,
      requestData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Response Status:', response.data.state);
    console.log('Response Keys:', Object.keys(response.data));

    // 측정 값들 출력
    const metrics = [
      { key: 'round_shoulder_m_', grade: 'round_shoulder_grade', name: 'Round Shoulder' },
      { key: 'turtle_neck_m_', grade: 'turtle_neck_grade', name: 'Turtle Neck' },
      { key: 'sar_head_tilt_m_', grade: 'sar_head_tilt_grade', name: 'Head Tilt' },
      { key: 'sar_tilt_m_', grade: 'sar_tilt_grade', name: 'Body Tilt' }
    ];

    console.log('\nSide Posture Metrics:');
    metrics.forEach(metric => {
      if (response.data[metric.key] !== undefined) {
        const grade = response.data[metric.grade] || 'N/A';
        console.log(`  ${metric.name}: ${response.data[metric.key]}° (Grade: ${grade})`);
      }
    });

    fs.writeFileSync('api-responses/side-posture.json', JSON.stringify(response.data, null, 2));
    console.log('\nFull response saved to api-responses/side-posture.json');

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// 체형 분석 - 후면
async function testBackPostureAnalysis() {
  console.log('\n========================================');
  console.log('Back Posture Analysis Test');
  console.log('========================================\n');

  try {
    const base64Image = fileToBase64('test_data/back.jpg');

    const requestData = {
      Email: REMO_CONFIG.email,
      UserKey: REMO_CONFIG.userKey,
      APIKey: REMO_CONFIG.apiKey,
      borigimg: base64Image
    };

    const response = await axios.post(
      `${REMO_CONFIG.baseUrl}/api/analysis-skeleton-v2-back`,
      requestData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Response Status:', response.data.state);
    console.log('Response Keys:', Object.keys(response.data));

    // 측정 값들 출력
    const metrics = [
      'bar_head_bal_m_',
      'bar_pelvic_bal_m_',
      'bar_shoulder_bal_m_',
      'bar_left_qang_m_',
      'bar_right_qang_m_',
      'bar_knee_bal_m_',
      'bar_tilt_m_'
    ];

    console.log('\nBack Posture Metrics:');
    metrics.forEach(metric => {
      if (response.data[metric] !== undefined) {
        const grade = response.data[metric.replace('_m_', '_grade')] || 'N/A';
        console.log(`  ${metric}: ${response.data[metric]}° (Grade: ${grade})`);
      }
    });

    fs.writeFileSync('api-responses/back-posture.json', JSON.stringify(response.data, null, 2));
    console.log('\nFull response saved to api-responses/back-posture.json');

    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// 모든 테스트 실행
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  REMO API Comprehensive Test Suite    ║');
  console.log('╔════════════════════════════════════════╝');
  console.log('\n');

  // api-responses 디렉토리 생성
  if (!fs.existsSync('api-responses')) {
    fs.mkdirSync('api-responses');
  }

  const results = {
    golfSwing: null,
    frontPosture: null,
    sidePosture: null,
    backPosture: null
  };

  try {
    // 체형 분석 테스트 (빠르게 완료됨)
    results.frontPosture = await testFrontPostureAnalysis();
    results.sidePosture = await testSidePostureAnalysis();
    results.backPosture = await testBackPostureAnalysis();

    // 골프 스윙 분석 테스트 (시간이 걸림)
    results.golfSwing = await testGolfSwingAnalysis();

    console.log('\n\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║  All Tests Completed Successfully!    ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n');
    console.log('Results saved to api-responses/ directory');
    console.log('\n');

  } catch (error) {
    console.error('\n\nTest suite failed:', error.message);
    process.exit(1);
  }
}

// 실행
runAllTests();
