/**
 * 데이터베이스에 저장된 이미지 URL 확인 스크립트
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkImageUrls() {
  console.log('=== 이미지 URL 저장 상태 확인 ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    // 최근 분석 데이터 조회
    console.log('1. 최근 분석 데이터 확인...\n');
    const [analyses] = await connection.query(`
      SELECT
        id,
        user_id,
        subject_id,
        front_image_url,
        front_image_s3_key,
        front_status,
        side_image_url,
        side_image_s3_key,
        side_status,
        back_image_url,
        back_image_s3_key,
        back_status,
        analysis_date,
        created_at
      FROM body_posture_analyses
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (analyses.length === 0) {
      console.log('   분석 데이터가 없습니다.\n');
      return;
    }

    console.log(`   총 ${analyses.length}개의 최근 분석 데이터:\n`);

    for (const analysis of analyses) {
      console.log(`   --- 분석 ID: ${analysis.id} ---`);
      console.log(`   생성일: ${analysis.created_at}`);
      console.log(`   분석일: ${analysis.analysis_date}`);
      console.log(`   사용자 ID: ${analysis.user_id}`);
      console.log(`   회원 ID: ${analysis.subject_id}`);
      console.log('');
      console.log('   [정면 이미지]');
      console.log(`   - URL: ${analysis.front_image_url || '(없음)'}`);
      console.log(`   - S3 Key: ${analysis.front_image_s3_key || '(없음)'}`);
      console.log(`   - 상태: ${analysis.front_status}`);
      console.log('');
      console.log('   [측면 이미지]');
      console.log(`   - URL: ${analysis.side_image_url || '(없음)'}`);
      console.log(`   - S3 Key: ${analysis.side_image_s3_key || '(없음)'}`);
      console.log(`   - 상태: ${analysis.side_status}`);
      console.log('');
      console.log('   [후면 이미지]');
      console.log(`   - URL: ${analysis.back_image_url || '(없음)'}`);
      console.log(`   - S3 Key: ${analysis.back_image_s3_key || '(없음)'}`);
      console.log(`   - 상태: ${analysis.back_status}`);
      console.log('\n');
    }

    // URL 패턴 분석
    console.log('2. URL 패턴 분석...\n');
    const [urlStats] = await connection.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN front_image_url IS NOT NULL AND front_image_url != '' THEN 1 ELSE 0 END) as front_has_url,
        SUM(CASE WHEN side_image_url IS NOT NULL AND side_image_url != '' THEN 1 ELSE 0 END) as side_has_url,
        SUM(CASE WHEN back_image_url IS NOT NULL AND back_image_url != '' THEN 1 ELSE 0 END) as back_has_url,
        SUM(CASE WHEN front_image_url LIKE '%s3%' OR front_image_url LIKE '%amazonaws%' THEN 1 ELSE 0 END) as front_s3_url,
        SUM(CASE WHEN side_image_url LIKE '%s3%' OR side_image_url LIKE '%amazonaws%' THEN 1 ELSE 0 END) as side_s3_url,
        SUM(CASE WHEN back_image_url LIKE '%s3%' OR back_image_url LIKE '%amazonaws%' THEN 1 ELSE 0 END) as back_s3_url
      FROM body_posture_analyses
    `);

    const stats = urlStats[0];
    console.log(`   전체 분석 수: ${stats.total}`);
    console.log(`   정면 이미지 URL 있음: ${stats.front_has_url} (S3: ${stats.front_s3_url})`);
    console.log(`   측면 이미지 URL 있음: ${stats.side_has_url} (S3: ${stats.side_s3_url})`);
    console.log(`   후면 이미지 URL 있음: ${stats.back_has_url} (S3: ${stats.back_s3_url})`);

    console.log('\n=== 확인 완료 ===');
  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

checkImageUrls().catch((err) => {
  console.error('확인 실패:', err);
  process.exit(1);
});
