/**
 * Test to simulate exact multer buffer flow
 * Compare what the server does vs direct test
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const sharp = require('sharp');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TEST_DATA_DIR = path.join(__dirname, '../../test_data');

async function compressImage(buffer) {
  console.log(`\n[compressImage] Input buffer:
  - type: ${buffer.constructor.name}
  - isBuffer: ${Buffer.isBuffer(buffer)}
  - length: ${buffer.length} bytes (${(buffer.length/1024).toFixed(1)}KB)
  - first 20 bytes hex: ${buffer.slice(0, 20).toString('hex')}`);

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

  console.log(`[compressImage] Output buffer:
  - type: ${compressed.constructor.name}
  - isBuffer: ${Buffer.isBuffer(compressed)}
  - length: ${compressed.length} bytes (${(compressed.length/1024).toFixed(1)}KB)
  - first 20 bytes hex: ${compressed.slice(0, 20).toString('hex')}`);

  return compressed;
}

async function sendToRemoApi(imageBuffer, height, viewType) {
  const baseUrl = process.env.REMO_API_URL || 'http://api.remo.re.kr';
  const apiKey = process.env.REMO_API_KEY;
  const userEmail = process.env.REMO_API_EMAIL;
  const userKey = process.env.REMO_API_USER_KEY;
  const endpoint = `${baseUrl}/api/analysis-walking`;

  const base64Image = imageBuffer.toString('base64');

  console.log(`\n[sendToRemoApi] Request details (${viewType}):
  - endpoint: ${endpoint}
  - id: ${userEmail}
  - height: ${height}
  - UserKey: ${userKey}
  - APIKey: ${apiKey?.substring(0, 10)}...
  - buffer size: ${(imageBuffer.length / 1024).toFixed(1)}KB
  - base64 length: ${(base64Image.length / 1024).toFixed(1)}KB
  - base64 first 100 chars: ${base64Image.substring(0, 100)}`);

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
    console.log(`[sendToRemoApi] Response: state=${response.data.state}, uuid=${response.data.uuid || 'none'}`);
    return response.data;
  } catch (error) {
    console.log(`[sendToRemoApi] Error: ${error.message}`);
    if (error.response) {
      console.log(`[sendToRemoApi] Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function testMethod1_DirectFile() {
  console.log('\n=== METHOD 1: Direct file read (like test-debug-flow.js) ===');
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
  const rawBuffer = fs.readFileSync(frontPath);
  console.log(`Read file: ${frontPath}, size: ${(rawBuffer.length/1024).toFixed(1)}KB`);

  const compressed = await compressImage(rawBuffer);
  const result = await sendToRemoApi(compressed, '170', 'front-direct');
  return result;
}

async function testMethod2_SimulateMulter() {
  console.log('\n=== METHOD 2: Simulate multer buffer (like server receives) ===');
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');

  // Read file as multer would receive it
  const rawBuffer = fs.readFileSync(frontPath);

  // Simulate multer's memory storage - it creates a buffer from the stream
  // In multer, files.front[0].buffer is the raw file contents
  const multerBuffer = Buffer.from(rawBuffer);

  console.log(`Simulated multer buffer: ${(multerBuffer.length/1024).toFixed(1)}KB`);
  console.log(`  isBuffer: ${Buffer.isBuffer(multerBuffer)}`);
  console.log(`  first 20 bytes hex: ${multerBuffer.slice(0, 20).toString('hex')}`);

  const compressed = await compressImage(multerBuffer);
  const result = await sendToRemoApi(compressed, '170', 'front-multer');
  return result;
}

async function testMethod3_Uint8Array() {
  console.log('\n=== METHOD 3: Uint8Array (potential issue case) ===');
  const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
  const rawBuffer = fs.readFileSync(frontPath);

  // Convert to Uint8Array (some edge cases might produce this)
  const uint8Array = new Uint8Array(rawBuffer);

  console.log(`Uint8Array: ${(uint8Array.length/1024).toFixed(1)}KB`);
  console.log(`  isBuffer: ${Buffer.isBuffer(uint8Array)}`);
  console.log(`  first 20 bytes: ${Array.from(uint8Array.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('')}`);

  const compressed = await compressImage(uint8Array);
  const result = await sendToRemoApi(compressed, '170', 'front-uint8');
  return result;
}

async function main() {
  console.log('=== Testing different buffer handling methods ===\n');
  console.log('Environment:');
  console.log(`  REMO_API_URL: ${process.env.REMO_API_URL}`);
  console.log(`  REMO_API_KEY: ${process.env.REMO_API_KEY?.substring(0, 10)}...`);
  console.log(`  REMO_API_EMAIL: ${process.env.REMO_API_EMAIL}`);
  console.log(`  REMO_API_USER_KEY: ${process.env.REMO_API_USER_KEY}`);

  try {
    // Test 1: Direct file read
    const result1 = await testMethod1_DirectFile();
    console.log(`\n✅ Method 1 SUCCESS: uuid=${result1.uuid}`);
  } catch (e) {
    console.log(`\n❌ Method 1 FAILED: ${e.message}`);
  }

  // Wait 2 seconds between tests
  await new Promise(r => setTimeout(r, 2000));

  try {
    // Test 2: Simulated multer
    const result2 = await testMethod2_SimulateMulter();
    console.log(`\n✅ Method 2 SUCCESS: uuid=${result2.uuid}`);
  } catch (e) {
    console.log(`\n❌ Method 2 FAILED: ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 2000));

  try {
    // Test 3: Uint8Array
    const result3 = await testMethod3_Uint8Array();
    console.log(`\n✅ Method 3 SUCCESS: uuid=${result3.uuid}`);
  } catch (e) {
    console.log(`\n❌ Method 3 FAILED: ${e.message}`);
  }

  console.log('\n=== All tests completed ===');
}

main().catch(console.error);
