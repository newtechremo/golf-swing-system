const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

// REMO API 설정
const REMO_API_URL = 'http://api.remo.re.kr';
const REMO_API_KEY = '88fd431945dab704836e894d6d5837d6';
const REMO_API_EMAIL = 'example@example.com';
const REMO_API_USER_KEY = 'ex!!';

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

async function main() {
  try {
    console.log('=== REMO API 압축 이미지 테스트 ===\n');

    // 테스트 이미지 읽기 및 압축
    console.log('1. 이미지 로드 및 압축...');
    const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
    const frontBuffer = fs.readFileSync(frontPath);
    const compressedBuffer = await compressImage(frontBuffer);
    const base64Image = compressedBuffer.toString('base64');

    console.log(`   Base64 길이: ${(base64Image.length / 1024).toFixed(1)} KB\n`);

    // REMO API 호출
    console.log('2. REMO API 호출 중...');
    console.log(`   URL: ${REMO_API_URL}/api/analysis-walking`);
    console.log(`   Email: ${REMO_API_EMAIL}`);
    console.log(`   APIKey: ${REMO_API_KEY.substring(0, 10)}...`);
    console.log(`   UserKey: ${REMO_API_USER_KEY}\n`);

    const requestData = {
      base64_video: base64Image,
      id: REMO_API_EMAIL,
      height: '170',
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

    console.log('=== REMO API 응답 ===');
    console.log(`응답 시간: ${elapsed}초`);
    console.log(`상태 코드: ${response.status}`);
    console.log(`응답 데이터:`);
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.state === 1) {
      console.log('\n✅ REMO API 호출 성공!');
      console.log(`UUID: ${response.data.uuid}`);
      console.log(`대기 시간: ${response.data.wait_time}초`);
    } else {
      console.log('\n❌ REMO API 호출 실패');
      console.log(`메시지: ${response.data.message || response.data.msg || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('\n❌ 에러 발생:');
    if (error.response) {
      console.error(`   상태 코드: ${error.response.status}`);
      console.error(`   응답: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.code) {
      console.error(`   에러 코드: ${error.code}`);
      console.error(`   메시지: ${error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

main();
