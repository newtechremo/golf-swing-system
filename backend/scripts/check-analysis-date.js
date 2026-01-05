const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'golf_swing_user',
    password: 'GolfSwing2024!',
    database: 'golf_swing_db',
    timezone: '+09:00'
  });

  const [rows] = await connection.execute(
    'SELECT id, analysis_date, created_at FROM body_posture_analyses ORDER BY id DESC LIMIT 3'
  );

  console.log('DB Results:');
  rows.forEach(row => {
    console.log(`ID: ${row.id}`);
    console.log(`  analysis_date: ${row.analysis_date}`);
    console.log(`  created_at: ${row.created_at}`);
    console.log(`  JS Date from analysis_date: ${new Date(row.analysis_date)}`);
    console.log('');
  });

  await connection.end();
}

main().catch(console.error);
