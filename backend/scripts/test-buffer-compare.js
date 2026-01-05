/**
 * Compare buffer handling between direct test and server flow
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

async function testDirectRemo(imageBuffer, height) {
  const baseUrl = process.env.REMO_API_URL || 'http://api.remo.re.kr';
  const apiKey = process.env.REMO_API_KEY;
  const userEmail = process.env.REMO_API_EMAIL;
  const userKey = process.env.REMO_API_USER_KEY;

  const endpoint = `${baseUrl}/api/analysis-walking`;
  const base64Image = imageBuffer.toString('base64');

  console.log('\n=== 직접 REMO API 테스트 ===');
  console.log(`Buffer size: ${imageBuffer.length} bytes`);
  console.log(`Base64 length: ${base64Image.length} chars`);
  console.log(`Base64 preview: ${base64Image.substring(0, 50)}...`);
  console.log(`First 10 bytes: ${Array.from(imageBuffer.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

  const requestData = {
    base64_video: base64Image,
    id: userEmail,
    height: height,
    UserKey: userKey,
    APIKey: apiKey,
  };

  const startTime = Date.now();

  try {
    const response = await axios.post(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      validateStatus: () => true,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`응답 시간: ${elapsed}초`);
    console.log(`상태 코드: ${response.status}`);
    console.log(`응답 데이터: ${JSON.stringify(response.data, null, 2)}`);

    return { success: response.data.state === 1, data: response.data };
  } catch (error) {
    console.log(`에러: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testViaServer(imagePath, subjectId, token) {
  console.log('\n=== 서버 경유 테스트 ===');

  // Create FormData with the same image for all 3 views
  const form = new FormData();
  form.append('front', fs.createReadStream(imagePath), { filename: 'front.jpg' });
  form.append('side', fs.createReadStream(imagePath), { filename: 'side.jpg' });
  form.append('back', fs.createReadStream(imagePath), { filename: 'back.jpg' });
  form.append('subjectId', String(subjectId));

  console.log(`Form data created for subject ${subjectId}`);

  const startTime = Date.now();

  try {
    const response = await axios.post(
      'http://localhost:3003/api/body-posture/analyze',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        timeout: 120000,
        validateStatus: () => true,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`응답 시간: ${elapsed}초`);
    console.log(`상태 코드: ${response.status}`);
    console.log(`응답 데이터: ${JSON.stringify(response.data, null, 2)}`);

    return { success: response.status === 201 || response.status === 200, data: response.data };
  } catch (error) {
    console.log(`에러: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function getToken() {
  const response = await axios.post('http://localhost:3003/api/auth/login', {
    email: 'instructor@test.com',
    password: 'test1234'
  });
  return response.data.accessToken;
}

async function main() {
  console.log('=== Buffer 비교 테스트 ===\n');

  // 이미지 로드 및 압축
  console.log('1. 이미지 로드 및 압축...');
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
  const frontBuffer = fs.readFileSync(frontPath);
  console.log(`   원본 파일 크기: ${(frontBuffer.length / 1024).toFixed(1)}KB`);

  const compressedBuffer = await compressImage(frontBuffer);

  // 압축된 버퍼의 특성 출력
  console.log('\n2. 압축된 버퍼 특성:');
  console.log(`   Buffer size: ${compressedBuffer.length} bytes`);
  console.log(`   Buffer is Buffer: ${Buffer.isBuffer(compressedBuffer)}`);
  console.log(`   First 10 bytes: ${Array.from(compressedBuffer.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

  // 직접 REMO API 테스트
  console.log('\n3. 직접 REMO API 테스트 (압축된 버퍼 사용)...');
  const directResult = await testDirectRemo(compressedBuffer, '170');

  if (directResult.success) {
    console.log('\n✅ 직접 테스트 성공!');
  } else {
    console.log('\n❌ 직접 테스트 실패');
  }

  // 서버 테스트 (토큰 획득)
  console.log('\n4. 서버 경유 테스트...');
  try {
    const token = await getToken();
    console.log(`   토큰 획득 완료`);

    const serverResult = await testViaServer(frontPath, 6, token);

    if (serverResult.success) {
      console.log('\n✅ 서버 테스트 성공!');
    } else {
      console.log('\n❌ 서버 테스트 실패');
    }
  } catch (error) {
    console.log(`   서버 테스트 에러: ${error.message}`);
  }
}

main().catch(console.error);
