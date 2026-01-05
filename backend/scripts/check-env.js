/**
 * Compare environment variables between dotenv and current process
 */
const path = require('path');

// Load dotenv explicitly
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('=== ENV CHECK ===');
console.log('REMO_API_URL:', process.env.REMO_API_URL);
console.log('REMO_API_KEY:', process.env.REMO_API_KEY);
console.log('REMO_API_EMAIL:', process.env.REMO_API_EMAIL);
console.log('REMO_API_USER_KEY:', process.env.REMO_API_USER_KEY);
console.log('');
console.log('Are these placeholder values?');
console.log('  EMAIL looks like placeholder:', process.env.REMO_API_EMAIL === 'example@example.com');
console.log('  USER_KEY looks like placeholder:', process.env.REMO_API_USER_KEY === 'ex!!');
