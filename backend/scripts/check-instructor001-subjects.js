const mysql = require('mysql2/promise');

async function checkSubjects() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'golf_swing_user',
    password: 'GolfSwing2024!',
    database: 'golf_swing_db',
  });

  try {
    // 1. Check instructor001's user_id
    const [users] = await connection.query(`
      SELECT id, username, name FROM users WHERE username = 'instructor001'
    `);

    if (users.length === 0) {
      console.log('❌ instructor001 not found!');
      return;
    }

    const instructor001 = users[0];
    console.log(`✅ Found instructor001:`);
    console.log(`   ID: ${instructor001.id}`);
    console.log(`   Name: ${instructor001.name}\n`);

    // 2. Check subjects assigned to instructor001
    const [subjects] = await connection.query(`
      SELECT id, name, phone_number, gender, height, weight, user_id
      FROM subjects
      WHERE user_id = ?
    `, [instructor001.id]);

    console.log(`📊 Subjects assigned to instructor001: ${subjects.length}`);
    subjects.forEach(subject => {
      console.log(`   - ${subject.name} (${subject.phone_number})`);
      console.log(`     ID: ${subject.id}, Gender: ${subject.gender}, Height: ${subject.height}, Weight: ${subject.weight}`);
    });

    // 3. Check all subjects
    const [allSubjects] = await connection.query(`
      SELECT id, name, phone_number, user_id FROM subjects
    `);

    console.log(`\n📊 All subjects in database: ${allSubjects.length}`);
    allSubjects.forEach(subject => {
      console.log(`   - ${subject.name} (${subject.phone_number}) -> user_id: ${subject.user_id}`);
    });

  } finally {
    await connection.end();
  }
}

checkSubjects();
