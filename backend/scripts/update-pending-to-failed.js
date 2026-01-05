const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePendingToFailed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    // 현재 pending 상태 조회
    const [pendingRows] = await connection.execute(`
      SELECT id, front_status, side_status, back_status
      FROM body_posture_analyses
      WHERE front_status = 'pending' OR side_status = 'pending' OR back_status = 'pending'
    `);

    console.log(`Found ${pendingRows.length} records with pending status`);

    if (pendingRows.length === 0) {
      console.log('No pending records to update');
      return;
    }

    // 모든 pending 상태를 failed로 변경
    const [result] = await connection.execute(`
      UPDATE body_posture_analyses
      SET
        front_status = CASE WHEN front_status = 'pending' THEN 'failed' ELSE front_status END,
        side_status = CASE WHEN side_status = 'pending' THEN 'failed' ELSE side_status END,
        back_status = CASE WHEN back_status = 'pending' THEN 'failed' ELSE back_status END
      WHERE front_status = 'pending' OR side_status = 'pending' OR back_status = 'pending'
    `);

    console.log(`Updated ${result.affectedRows} records: pending -> failed`);

    // 업데이트 결과 확인
    const [updatedRows] = await connection.execute(`
      SELECT id, front_status, side_status, back_status
      FROM body_posture_analyses
      ORDER BY id DESC LIMIT 10
    `);

    console.log('\nUpdated records:');
    updatedRows.forEach(row => {
      console.log(`  ID ${row.id}: front=${row.front_status}, side=${row.side_status}, back=${row.back_status}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

updatePendingToFailed();
