const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function seedTestData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'golf_swing_user',
    password: 'GolfSwing2024!',
    database: 'golf_swing_db',
  });

  try {
    console.log('🔌 Connected to database');

    // 1. 센터 생성 (중복 체크)
    console.log('📍 Checking/Creating centers...');
    const [existingCenters] = await connection.query('SELECT code FROM centers');
    const existingCenterCodes = existingCenters.map(c => c.code);

    let centersAdded = 0;
    if (!existingCenterCodes.includes('CENTER001')) {
      await connection.query(`
        INSERT INTO centers (name, code, address, contact, status, created_at, updated_at) VALUES
        ('스윙골프센터', 'CENTER001', '서울시 강남구 테헤란로 123', '02-1234-5678', 'active', NOW(), NOW())
      `);
      centersAdded++;
    }
    if (!existingCenterCodes.includes('CENTER002')) {
      await connection.query(`
        INSERT INTO centers (name, code, address, contact, status, created_at, updated_at) VALUES
        ('프로골프아카데미', 'CENTER002', '서울시 서초구 반포대로 456', '02-9876-5432', 'active', NOW(), NOW())
      `);
      centersAdded++;
    }
    console.log(`✅ Centers: ${existingCenters.length} existing, ${centersAdded} added`);

    // 2. 강사 생성 (중복 체크)
    console.log('👨‍🏫 Checking/Creating instructors...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const [existingUsers] = await connection.query('SELECT username FROM users');
    const existingUsernames = existingUsers.map(u => u.username);

    let usersAdded = 0;
    const instructors = [
      ['instructor001', '테스트강사', '010-1234-5678', 'test@example.com', 1],
      ['instructor1', '김코치', '010-1111-2222', 'coach1@example.com', 1],
      ['instructor2', '이코치', '010-3333-4444', 'coach2@example.com', 1],
      ['instructor3', '박코치', '010-5555-6666', 'coach3@example.com', 2]
    ];

    for (const [username, name, phone, email, centerId] of instructors) {
      if (!existingUsernames.includes(username)) {
        await connection.query(`
          INSERT INTO users (center_id, username, password_hash, name, phone_number, email, payment_type, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'paid', 'active', NOW(), NOW())
        `, [centerId, username, passwordHash, name, phone, email]);
        usersAdded++;
      }
    }
    console.log(`✅ Instructors: ${existingUsers.length} existing, ${usersAdded} added`);

    // Get instructor001's ID
    const [instructor001Result] = await connection.query('SELECT id FROM users WHERE username = ?', ['instructor001']);
    const instructor001Id = instructor001Result[0]?.id;

    if (!instructor001Id) {
      console.error('❌ instructor001 not found!');
      throw new Error('instructor001 account not found');
    }
    console.log(`   instructor001 ID: ${instructor001Id}`);

    // 3. 대상자 생성 (중복 체크)
    console.log('👥 Checking/Creating subjects...');
    const [existingSubjects] = await connection.query('SELECT phone_number FROM subjects');
    const existingPhones = existingSubjects.map(s => s.phone_number);

    let subjectsAdded = 0;
    const subjects = [
      ['홍길동', '010-9999-0001', '1990-01-01', 'M', 175.0, 70.0, 'hong@example.com', instructor001Id],
      ['김영희', '010-2000-2000', '1985-08-22', 'F', 165.0, 55.5, 'kim@example.com', instructor001Id],
      ['이철수', '010-3000-3000', '1992-03-10', 'M', 180.0, 75.8, 'lee@example.com', instructor001Id],
      ['박민수', '010-4000-4000', '1988-11-30', 'M', 172.3, 68.0, 'park@example.com', instructor001Id],
      ['최지은', '010-5000-5000', '1995-07-18', 'F', 168.5, 58.3, 'choi@example.com', instructor001Id]
    ];

    for (const [name, phone, birthDate, gender, height, weight, email, userId] of subjects) {
      if (!existingPhones.includes(phone)) {
        await connection.query(`
          INSERT INTO subjects (user_id, name, phone_number, birth_date, gender, height, weight, email, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `, [userId, name, phone, birthDate, gender, height, weight, email]);
        subjectsAdded++;
      } else {
        // Update existing subject to assign to instructor001
        await connection.query(`
          UPDATE subjects SET user_id = ?, name = ?, birth_date = ?, gender = ?, height = ?, weight = ?, email = ?
          WHERE phone_number = ?
        `, [userId, name, birthDate, gender, height, weight, email, phone]);
      }
    }
    console.log(`✅ Subjects: ${existingSubjects.length} existing, ${subjectsAdded} added, reassigned to instructor001`);

    // 결과 확인
    const [centersCount] = await connection.query('SELECT COUNT(*) as count FROM centers');
    const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [subjectsCount] = await connection.query('SELECT COUNT(*) as count FROM subjects');

    console.log('\n🎉 Test data seeded successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Centers: ${centersCount[0].count}`);
    console.log(`   - Instructors: ${usersCount[0].count}`);
    console.log(`   - Subjects: ${subjectsCount[0].count}`);
    console.log('\n📝 Test credentials:');
    console.log('   Username: instructor001 (프론트엔드 E2E 테스트용)');
    console.log('   Password: password123');
    console.log('   Also available: instructor1, instructor2, instructor3');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

seedTestData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
