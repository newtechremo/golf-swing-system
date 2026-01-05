/**
 * REMO API 직접 테스트 (서버 방식과 동일하게)
 * 서버와 동일한 axios 설정으로 테스트
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

// .env 파일 로드
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TEST_DATA_DIR = path.join(__dirname, '../../test_data');

async function compressImage(buffer) {
  const originalSize = buffer.length;

  const compressed = await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer();

  const compressedSize = compressed.length;
  console.log(
    `   압축: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB`,
  );

  return compressed;
}

// 서버와 동일한 방식으로 요청
async function makeRequestLikeServer(imageBuffer, height) {
  const baseUrl = process.env.REMO_API_URL || 'http://api.remo.re.kr';
  const apiKey = process.env.REMO_API_KEY;
  const userEmail = process.env.REMO_API_EMAIL;
  const userKey = process.env.REMO_API_USER_KEY;

  console.log('\n=== 서버 방식 요청 설정 ===');
  console.log(`baseUrl: ${baseUrl}`);
  console.log(`apiKey: ${apiKey?.substring(0, 10)}...`);
  console.log(`userEmail: ${userEmail}`);
  console.log(`userKey: ${userKey}`);
  console.log(`height: ${height}`);

  const endpoint = `${baseUrl}/api/analysis-walking`;
  const base64Image = imageBuffer.toString('base64');

  console.log(`base64 length: ${(base64Image.length / 1024).toFixed(1)}KB`);
  console.log(`buffer size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);

  const requestData = {
    base64_video: base64Image,
    id: userEmail,
    height: height,
    UserKey: userKey,
    APIKey: apiKey,
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  console.log('\n=== 요청 전송 (서버와 동일한 axios 설정) ===');
  console.log(`endpoint: ${endpoint}`);
  console.log(`headers: ${JSON.stringify(headers)}`);

  const startTime = Date.now();

  try {
    // 서버와 동일하게 axios.post 사용 (timeout, validateStatus 없이)
    const response = await axios.post(endpoint, requestData, { headers });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n응답 시간: ${elapsed}초`);
    console.log(`상태 코드: ${response.status}`);
    console.log(`응답 데이터: ${JSON.stringify(response.data, null, 2)}`);

    return response.data;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n응답 시간: ${elapsed}초`);

    if (error.response) {
      console.log(`상태 코드: ${error.response.status}`);
      console.log(`응답 데이터: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`에러: ${error.message}`);
    }
    throw error;
  }
}

// 직접 테스트 스크립트와 동일한 방식
async function makeRequestLikeTestScript(imageBuffer, height) {
  const REMO_API_URL = 'http://api.remo.re.kr';
  const REMO_API_KEY = '88fd431945dab704836e894d6d5837d6';
  const REMO_API_EMAIL = 'example@example.com';
  const REMO_API_USER_KEY = 'ex!!';

  console.log('\n=== 테스트 스크립트 방식 요청 설정 ===');
  console.log(`URL: ${REMO_API_URL}`);
  console.log(`APIKey: ${REMO_API_KEY.substring(0, 10)}...`);
  console.log(`Email: ${REMO_API_EMAIL}`);
  console.log(`UserKey: ${REMO_API_USER_KEY}`);
  console.log(`height: ${height}`);

  const base64Image = imageBuffer.toString('base64');
  console.log(`base64 length: ${(base64Image.length / 1024).toFixed(1)}KB`);

  const requestData = {
    base64_video: base64Image,
    id: REMO_API_EMAIL,
    height: height,
    UserKey: REMO_API_USER_KEY,
    APIKey: REMO_API_KEY,
  };

  const startTime = Date.now();

  const response = await axios.post(
    `${REMO_API_URL}/api/analysis-walking`,
    requestData,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      validateStatus: () => true,
    }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n응답 시간: ${elapsed}초`);
  console.log(`상태 코드: ${response.status}`);
  console.log(`응답 데이터: ${JSON.stringify(response.data, null, 2)}`);

  return response.data;
}

async function main() {
  console.log('=== REMO API 서버 방식 vs 테스트 스크립트 방식 비교 ===\n');

  // 이미지 로드 및 압축
  console.log('1. 이미지 로드 및 압축...');
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
  const frontBuffer = fs.readFileSync(frontPath);
  const compressedBuffer = await compressImage(frontBuffer);

  // 테스트 1: 테스트 스크립트 방식 (하드코딩된 값 사용)
  console.log('\n\n========================================');
  console.log('TEST 1: 테스트 스크립트 방식 (하드코딩)');
  console.log('========================================');

  try {
    const result1 = await makeRequestLikeTestScript(compressedBuffer, '170');
    if (result1.state === 1) {
      console.log('\n✅ 테스트 스크립트 방식 성공!');
      console.log(`   UUID: ${result1.uuid}`);
    } else {
      console.log('\n❌ 테스트 스크립트 방식 실패');
    }
  } catch (error) {
    console.log('\n❌ 테스트 스크립트 방식 에러:', error.message);
  }

  // 잠시 대기
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 테스트 2: 서버 방식 (.env 파일에서 값 로드)
  console.log('\n\n========================================');
  console.log('TEST 2: 서버 방식 (.env에서 로드)');
  console.log('========================================');

  try {
    const result2 = await makeRequestLikeServer(compressedBuffer, '170');
    if (result2.state === 1) {
      console.log('\n✅ 서버 방식 성공!');
      console.log(`   UUID: ${result2.uuid}`);
    } else {
      console.log('\n❌ 서버 방식 실패');
    }
  } catch (error) {
    console.log('\n❌ 서버 방식 에러:', error.message);
  }
}

main().catch(console.error);
