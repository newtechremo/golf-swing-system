const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updatePassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'golf_swing_user',
    password: 'GolfSwing2024!',
    database: 'golf_swing_db'
  });
  
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash:', hash);
  
  await connection.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hash, 'test@example.com']
  );
  
  const [rows] = await connection.execute(
    'SELECT id, email, name, password_hash FROM users WHERE email = ?',
    ['test@example.com']
  );
  
  console.log('Updated user:', rows[0]);
  await connection.end();
}

updatePassword().catch(console.error);
