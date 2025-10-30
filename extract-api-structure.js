const fs = require('fs');

// API 응답에서 필요한 메트릭만 추출
function extractMetrics(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // base64 이미지와 coords는 제외하고 메트릭만 추출
  const metrics = {};

  for (const [key, value] of Object.entries(data)) {
    // base64 이미지나 coords 데이터 제외
    if (!key.includes('origimg') && !key.includes('coords') && !key.includes('base64')) {
      metrics[key] = value;
    }
  }

  return metrics;
}

console.log('\n=== Front Posture Metrics ===');
const frontMetrics = extractMetrics('api-responses/front-posture.json');
console.log(JSON.stringify(frontMetrics, null, 2));

console.log('\n=== Side Posture Metrics ===');
const sideMetrics = extractMetrics('api-responses/side-posture.json');
console.log(JSON.stringify(sideMetrics, null, 2));

console.log('\n=== Back Posture Metrics ===');
const backMetrics = extractMetrics('api-responses/back-posture.json');
console.log(JSON.stringify(backMetrics, null, 2));

// 메트릭만 저장
fs.writeFileSync('api-responses/metrics-only.json', JSON.stringify({
  front: frontMetrics,
  side: sideMetrics,
  back: backMetrics
}, null, 2));

console.log('\n\nMetrics extracted and saved to api-responses/metrics-only.json');
