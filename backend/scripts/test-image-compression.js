const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(
    `이미지 압축: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% 감소)`,
  );

  return compressed;
}

async function main() {
  try {
    console.log('=== 이미지 압축 테스트 ===\n');

    const frontPath = path.join(TEST_DATA_DIR, 'front.jpg');
    const sidePath = path.join(TEST_DATA_DIR, 'side.JPG');
    const backPath = path.join(TEST_DATA_DIR, 'back.jpg');

    // 원본 이미지 읽기
    console.log('1. 원본 이미지 로드...');
    const frontBuffer = fs.readFileSync(frontPath);
    const sideBuffer = fs.readFileSync(sidePath);
    const backBuffer = fs.readFileSync(backPath);

    console.log(`   front.jpg: ${(frontBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`   side.JPG: ${(sideBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`   back.jpg: ${(backBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`   총 원본 크기: ${((frontBuffer.length + sideBuffer.length + backBuffer.length) / 1024).toFixed(1)} KB\n`);

    // 압축 실행
    console.log('2. 이미지 압축 중...');
    const compressedFront = await compressImage(frontBuffer);
    const compressedSide = await compressImage(sideBuffer);
    const compressedBack = await compressImage(backBuffer);

    console.log(`\n   총 압축 크기: ${((compressedFront.length + compressedSide.length + compressedBack.length) / 1024).toFixed(1)} KB`);

    // Base64 크기 확인
    console.log('\n3. Base64 인코딩 후 크기...');
    const frontBase64 = compressedFront.toString('base64');
    const sideBase64 = compressedSide.toString('base64');
    const backBase64 = compressedBack.toString('base64');

    console.log(`   front base64: ${(frontBase64.length / 1024).toFixed(1)} KB`);
    console.log(`   side base64: ${(sideBase64.length / 1024).toFixed(1)} KB`);
    console.log(`   back base64: ${(backBase64.length / 1024).toFixed(1)} KB`);

    console.log('\n✅ 이미지 압축 테스트 완료!');

  } catch (error) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
}

main();
