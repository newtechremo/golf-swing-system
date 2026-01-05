/**
 * Debug test: Compare direct REMO API vs server flow
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const sharp = require('sharp');

// .env 파일 로드
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TEST_DATA_DIR = path.join(__dirname, '../../test_data');

async function compressImage(buffer) {
  return await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer();
}

async function testDirectRemo(imageBuffer, height) {
  const baseUrl = process.env.REMO_API_URL || 'http://api.remo.re.kr';
  const apiKey = process.env.REMO_API_KEY;
  const userEmail = process.env.REMO_API_EMAIL;
  const userKey = process.env.REMO_API_USER_KEY;

  const endpoint = `${baseUrl}/api/analysis-walking`;
  const base64Image = imageBuffer.toString('base64');

  console.log('=== 직접 REMO API 테스트 ===');
  console.log(`Buffer size: ${imageBuffer.length} bytes (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
  console.log(`Base64 length: ${base64Image.length} chars (${(base64Image.length / 1024).toFixed(1)}KB)`);
  console.log(`Buffer isBuffer: ${Buffer.isBuffer(imageBuffer)}`);
  console.log(`First 20 bytes hex: ${imageBuffer.slice(0, 20).toString('hex')}`);
  console.log(`Base64 first 100 chars: ${base64Image.substring(0, 100)}`);

  const requestData = {
    base64_video: base64Image,
    id: userEmail,
    height: height,
    UserKey: userKey,
    APIKey: apiKey,
  };

  try {
    const response = await axios.post(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });
    console.log(`응답: state=${response.data.state}, uuid=${response.data.uuid || 'none'}`);
    return { success: response.data.state === 1, data: response.data };
  } catch (error) {
    console.log(`에러: ${error.message}`);
    if (error.response) {
      console.log(`응답 데이터: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=== 직접 REMO API 테스트 스크립트 ===\n');

  // 1. 이미지 로드
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
  console.log(`1. 이미지 경로: ${frontPath}`);

  if (!fs.existsSync(frontPath)) {
    console.log('   ERROR: 이미지 파일이 없습니다!');
    return;
  }

  const rawBuffer = fs.readFileSync(frontPath);
  console.log(`   원본 크기: ${(rawBuffer.length / 1024).toFixed(1)}KB`);

  // 2. 압축
  console.log('\n2. 이미지 압축...');
  const compressedBuffer = await compressImage(rawBuffer);
  console.log(`   압축 크기: ${(compressedBuffer.length / 1024).toFixed(1)}KB`);

  // 3. 직접 REMO API 테스트
  console.log('\n3. 직접 REMO API 테스트...');
  const result = await testDirectRemo(compressedBuffer, '170');

  if (result.success) {
    console.log('\n✅ 직접 테스트 성공!');
  } else {
    console.log('\n❌ 직접 테스트 실패');
  }

  // 4. .env 환경변수 확인
  console.log('\n4. 환경변수 확인:');
  console.log(`   REMO_API_URL: ${process.env.REMO_API_URL || 'default'}`);
  console.log(`   REMO_API_KEY: ${process.env.REMO_API_KEY?.substring(0, 10)}...`);
  console.log(`   REMO_API_EMAIL: ${process.env.REMO_API_EMAIL}`);
  console.log(`   REMO_API_USER_KEY: ${process.env.REMO_API_USER_KEY}`);
}

main().catch(console.error);
