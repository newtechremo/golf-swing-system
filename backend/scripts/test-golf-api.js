const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3003;

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log('=== 골프 스윙 API 테스트 ===\n');

  // 1. 로그인
  console.log('1. 로그인 테스트...');
  const loginResult = await request('POST', '/api/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });
  console.log('로그인 결과:', loginResult.status);

  if (loginResult.status !== 200 && loginResult.status !== 201) {
    console.log('로그인 실패:', loginResult.data);
    return;
  }

  const token = loginResult.data.accessToken;
  if (!token) {
    console.log('토큰 없음. 응답 데이터:', JSON.stringify(loginResult.data));
    return;
  }
  console.log('토큰 발급 성공:', token.substring(0, 50) + '...\n');

  // 2. 회원 목록 조회
  console.log('2. 회원 목록 조회...');
  const subjectsResult = await request('GET', '/api/subjects', null, token);
  console.log('회원 목록:', subjectsResult.status);
  if (subjectsResult.status === 200 && Array.isArray(subjectsResult.data) && subjectsResult.data.length > 0) {
    console.log('첫번째 회원:', JSON.stringify(subjectsResult.data[0], null, 2));
  }
  console.log();

  // 3. 분석 이력 조회 (히스토리 API 사용)
  const subjectId = subjectsResult.data?.[0]?.id || 1;
  console.log(`3. 분석 이력 조회 (subjectId: ${subjectId})...`);
  const listResult = await request('GET', `/api/history/subject/${subjectId}?type=golf&page=1&limit=10`, null, token);
  console.log('분석 이력 조회 결과:', listResult.status);
  console.log('데이터:', JSON.stringify(listResult.data, null, 2).substring(0, 500));
  console.log();

  // 4. 기존 분석 결과가 있으면 조회
  const historyItems = listResult.data?.items || listResult.data || [];
  if (listResult.status === 200 && Array.isArray(historyItems) && historyItems.length > 0) {
    const analysisId = historyItems[0].id;
    console.log(`3. 분석 결과 조회 (ID: ${analysisId})...`);
    const analysisResult = await request('GET', `/api/golf-swing/analysis/${analysisId}`, null, token);
    console.log('분석 결과:', analysisResult.status);
    console.log('데이터:', JSON.stringify(analysisResult.data, null, 2));
    console.log();

    // 4. 분석 결과 새로고침 (REMO API 호출)
    if (analysisResult.data.status === 'pending' || analysisResult.data.status === 'processing') {
      console.log(`4. 분석 결과 새로고침 (ID: ${analysisId})...`);
      const refreshResult = await request('POST', `/api/golf-swing/analysis/${analysisId}/refresh`, null, token);
      console.log('새로고침 결과:', refreshResult.status);
      console.log('데이터:', JSON.stringify(refreshResult.data, null, 2));
      console.log();
    }

    // 5. 비디오 URL 조회
    console.log(`5. 비디오 URL 조회 (ID: ${analysisId})...`);
    const videoResult = await request('GET', `/api/golf-swing/analysis/${analysisId}/video`, null, token);
    console.log('비디오 URL:', videoResult.status);
    console.log('데이터:', JSON.stringify(videoResult.data, null, 2));
    console.log();

    // 6. 구간 이미지 조회
    console.log(`6. 구간 이미지 조회 (ID: ${analysisId})...`);
    const imagesResult = await request('GET', `/api/golf-swing/analysis/${analysisId}/images`, null, token);
    console.log('구간 이미지:', imagesResult.status);
    if (imagesResult.data && typeof imagesResult.data === 'object') {
      // 이미지 데이터가 너무 크면 요약만 출력
      const summary = {};
      for (const [key, value] of Object.entries(imagesResult.data)) {
        summary[key] = value ? (typeof value === 'string' ? `${value.substring(0, 50)}...` : value) : null;
      }
      console.log('이미지 요약:', JSON.stringify(summary, null, 2));
    }
  } else {
    console.log('분석 데이터가 없습니다. 새로운 분석을 시작해야 합니다.');
  }

  console.log('\n=== 테스트 완료 ===');
}

main().catch(console.error);
