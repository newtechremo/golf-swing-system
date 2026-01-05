/**
 * analysis_date 컬럼 타입을 DATE에서 DATETIME으로 변경하는 마이그레이션 스크립트
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('=== analysis_date 컬럼 마이그레이션 시작 ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    // 테이블 존재 확인
    console.log('1. 테이블 존재 확인...');
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'body_posture_analyses'"
    );

    if (tables.length === 0) {
      console.log('   ⚠️ body_posture_analyses 테이블이 존재하지 않습니다.');
      console.log('   서버를 시작하면 자동으로 생성됩니다.');
      return;
    }

    // 현재 컬럼 타입 확인
    console.log('2. 현재 컬럼 타입 확인...');
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM body_posture_analyses LIKE 'analysis_date'"
    );
    console.log('   현재 타입:', columns[0]?.Type || '없음');

    // DATE 타입인 경우만 변경
    if (columns[0]?.Type?.toLowerCase().includes('date') && !columns[0]?.Type?.toLowerCase().includes('datetime')) {
      console.log('\n3. 잘못된 날짜 데이터 수정 중...');

      // 잘못된 날짜 데이터를 현재 시간으로 업데이트
      await connection.query(`
        UPDATE body_posture_analyses
        SET analysis_date = NOW()
        WHERE analysis_date = '0000-00-00' OR analysis_date IS NULL
      `);
      console.log('   ✅ 잘못된 데이터 수정 완료');

      console.log('\n4. DATETIME으로 변경 중...');
      await connection.query(`
        ALTER TABLE body_posture_analyses
        MODIFY COLUMN analysis_date DATETIME NOT NULL
      `);

      console.log('   ✅ 컬럼 타입 변경 완료!');
    } else if (columns[0]?.Type?.toLowerCase().includes('datetime')) {
      console.log('   이미 DATETIME 타입입니다. 변경 불필요.');
    } else {
      console.log('   ⚠️ 컬럼 타입을 확인할 수 없습니다.');
    }

    // 변경 후 확인
    console.log('\n5. 변경 후 확인...');
    const [newColumns] = await connection.query(
      "SHOW COLUMNS FROM body_posture_analyses LIKE 'analysis_date'"
    );
    console.log('   현재 타입:', newColumns[0]?.Type || '없음');

    console.log('\n=== 마이그레이션 완료 ===');
  } catch (error) {
    console.error('에러 발생:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
