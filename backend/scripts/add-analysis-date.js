/**
 * analysis_date 컬럼을 수동으로 추가하는 스크립트
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumn() {
  console.log('=== analysis_date 컬럼 수동 추가 ===\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    // 현재 컬럼 확인
    console.log('1. 컬럼 존재 여부 확인...');
    const [cols] = await conn.query("SHOW COLUMNS FROM body_posture_analyses LIKE 'analysis_date'");
    if (cols.length > 0) {
      console.log('   이미 컬럼이 존재합니다:', cols[0].Type);
      return;
    }
    console.log('   컬럼이 없습니다. 추가를 시작합니다.\n');

    // 컬럼 추가 (NULL 허용, 기본값 현재시간)
    console.log('2. 컬럼 추가 중 (nullable)...');
    await conn.query("ALTER TABLE body_posture_analyses ADD COLUMN analysis_date DATETIME NULL DEFAULT CURRENT_TIMESTAMP");
    console.log('   ✅ 완료\n');

    // 기존 데이터 업데이트 (created_at 기준으로)
    console.log('3. 기존 데이터 업데이트 중 (created_at 기준)...');
    const [result] = await conn.query('UPDATE body_posture_analyses SET analysis_date = created_at WHERE analysis_date IS NULL');
    console.log('   ✅ 완료 -', result.affectedRows, '행 업데이트됨\n');

    // NOT NULL 제약 추가
    console.log('4. NOT NULL 제약 추가 중...');
    await conn.query('ALTER TABLE body_posture_analyses MODIFY COLUMN analysis_date DATETIME NOT NULL');
    console.log('   ✅ 완료\n');

    // 인덱스 추가
    console.log('5. 인덱스 추가 중...');
    try {
      await conn.query('CREATE INDEX IDX_analysis_date ON body_posture_analyses(analysis_date)');
      console.log('   ✅ 완료\n');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('   인덱스가 이미 존재합니다.\n');
      } else {
        throw e;
      }
    }

    // 확인
    console.log('6. 최종 확인...');
    const [newCols] = await conn.query("SHOW COLUMNS FROM body_posture_analyses LIKE 'analysis_date'");
    console.log('   최종 컬럼 타입:', newCols[0]?.Type);

    const [data] = await conn.query('SELECT id, analysis_date, created_at FROM body_posture_analyses LIMIT 3');
    console.log('   샘플 데이터:', data);

    console.log('\n=== 마이그레이션 성공 ===');
  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

addColumn().catch(err => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
