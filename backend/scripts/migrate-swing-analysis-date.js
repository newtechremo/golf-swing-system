/**
 * golf_swing_analyses 테이블의 analysis_date 컬럼을
 * date에서 datetime으로 변경 후 created_at 시간으로 마이그레이션
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'golf_swing_system',
  });

  try {
    console.log('=== Golf Swing Analysis Date 마이그레이션 시작 ===\n');

    // 1. 현재 데이터 확인
    const [before] = await connection.execute(
      'SELECT id, analysis_date, created_at FROM golf_swing_analyses ORDER BY id'
    );
    console.log('마이그레이션 전 데이터:');
    before.forEach(row => {
      console.log(`  ID ${row.id}: analysis_date=${row.analysis_date}, created_at=${row.created_at}`);
    });

    // 2. 컬럼 타입 변경 (DATE → DATETIME)
    console.log('\n컬럼 타입 변경 중 (DATE → DATETIME)...');
    await connection.execute(
      'ALTER TABLE golf_swing_analyses MODIFY COLUMN analysis_date DATETIME NOT NULL'
    );
    console.log('컬럼 타입 변경 완료');

    // 3. analysis_date를 created_at 시간으로 업데이트
    console.log('\nanalysis_date를 created_at 시간으로 업데이트 중...');
    const [result] = await connection.execute(
      'UPDATE golf_swing_analyses SET analysis_date = created_at'
    );
    console.log(`${result.affectedRows}개 행 업데이트 완료`);

    // 4. 결과 확인
    const [after] = await connection.execute(
      'SELECT id, analysis_date, created_at FROM golf_swing_analyses ORDER BY id'
    );
    console.log('\n마이그레이션 후 데이터:');
    after.forEach(row => {
      console.log(`  ID ${row.id}: analysis_date=${row.analysis_date}, created_at=${row.created_at}`);
    });

    console.log('\n=== 마이그레이션 완료 ===');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
  } finally {
    await connection.end();
  }
}

migrate();
