/**
 * Test script that mimics EXACTLY what the NestJS server does
 * to identify where the difference is
 */
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const sharp = require('sharp');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TEST_DATA_DIR = path.join(__dirname, '../../test_data');

// Exact same compressImage function as in body-posture.controller.ts
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
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(
    `이미지 압축: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% 감소)`,
  );

  return compressed;
}

// Exact same requestBodyPostureAnalysis function as in remo-api.service.ts
async function requestBodyPostureAnalysis(imageBuffer, height, viewType) {
  const baseUrl = process.env.REMO_API_URL || 'http://api.remo.re.kr';
  const apiKey = process.env.REMO_API_KEY;
  const userEmail = process.env.REMO_API_EMAIL;
  const userKey = process.env.REMO_API_USER_KEY;

  const endpoint = `${baseUrl}/api/analysis-walking`;
  const base64Image = imageBuffer.toString('base64');

  const requestData = {
    base64_video: base64Image,
    id: userEmail,
    height: height,
    UserKey: userKey,
    APIKey: apiKey,
  };

  // Debug logging - exactly as in the service
  console.log(`REMO API Request Debug:`);
  console.log(`  - endpoint: ${endpoint}`);
  console.log(`  - id: ${userEmail}`);
  console.log(`  - height: ${height}`);
  console.log(`  - UserKey: ${userKey}`);
  console.log(`  - APIKey: ${apiKey?.substring(0, 10)}...`);
  console.log(`  - base64 length: ${(base64Image.length / 1024).toFixed(1)}KB`);
  console.log(`  - buffer size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
  console.log(`  - isBuffer: ${Buffer.isBuffer(imageBuffer)}`);
  console.log(`  - first 20 bytes hex: ${imageBuffer.slice(0, 20).toString('hex')}`);
  console.log(`  - base64 first 100 chars: ${base64Image.substring(0, 100)}`);

  try {
    const response = await axios.post(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;

    if (data.state !== 1) {
      throw new Error(`Body posture analysis request failed: ${data.message}`);
    }

    console.log(`Body posture analysis requested: ${data.uuid}, view: ${viewType}, wait time: ${data.wait_time}s`);

    return {
      uuid: data.uuid,
      waitTime: data.wait_time,
    };
  } catch (error) {
    console.error(`Failed to request body posture analysis: ${error.message}`);
    if (error.response) {
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Simulate multer receiving file via HTTP
async function simulateMulterBuffer() {
  // This simulates what multer does when receiving a file
  // It reads the file and stores it in memory as a buffer
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
  const fileContents = fs.readFileSync(frontPath);

  // Multer creates an Express.Multer.File object like this:
  const multerFile = {
    fieldname: 'front',
    originalname: 'front.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: fileContents, // This is what multer puts in files.front[0].buffer
    size: fileContents.length,
  };

  return multerFile;
}

async function main() {
  console.log('=== Server Flow Exact Test ===\n');

  // Step 1: Simulate multer receiving file
  console.log('1. Simulating multer file reception...');
  const frontFile = await simulateMulterBuffer();
  console.log(`   Multer file: ${frontFile.originalname}, size: ${(frontFile.size / 1024).toFixed(1)}KB`);
  console.log(`   Buffer type: ${frontFile.buffer.constructor.name}`);
  console.log(`   isBuffer: ${Buffer.isBuffer(frontFile.buffer)}`);

  // Step 2: Compress image (exactly like controller does)
  console.log('\n2. Compressing image (like controller)...');
  const compressedFront = await compressImage(frontFile.buffer);

  console.log(`   Compressed buffer type: ${compressedFront.constructor.name}`);
  console.log(`   isBuffer: ${Buffer.isBuffer(compressedFront)}`);

  // Step 3: Debug info (like controller does)
  console.log('\n3. Debug info (like controller):');
  console.log(`   정면: ${compressedFront.length} bytes (${(compressedFront.length / 1024).toFixed(1)}KB)`);
  console.log(`   isBuffer: ${Buffer.isBuffer(compressedFront)}`);
  console.log(`   정면 first 20 bytes: ${compressedFront.slice(0, 20).toString('hex')}`);
  const frontBase64 = compressedFront.toString('base64');
  console.log(`   정면 base64 length: ${frontBase64.length} chars`);
  console.log(`   정면 base64 first 100 chars: ${frontBase64.substring(0, 100)}`);

  // Step 4: Call REMO API (like service does)
  console.log('\n4. Calling REMO API (like service)...');
  try {
    const result = await requestBodyPostureAnalysis(compressedFront, '170', 'front');
    console.log('\n✅ SUCCESS!');
    console.log(`   UUID: ${result.uuid}`);
    console.log(`   Wait time: ${result.waitTime}s`);
  } catch (error) {
    console.log('\n❌ FAILED!');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
