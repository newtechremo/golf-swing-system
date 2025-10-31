const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

async function testInstructor001() {
  try {
    console.log('🧪 Testing instructor001 account\n');

    // 1. Login
    console.log('1️⃣ Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'instructor001',
      password: 'password123'
    });

    console.log('✅ Login successful!');
    console.log(`   Username: ${loginResponse.data.user.username}`);
    console.log(`   Name: ${loginResponse.data.user.name}`);
    console.log(`   Token received: ${loginResponse.data.accessToken.substring(0, 20)}...`);

    const token = loginResponse.data.accessToken;

    // 2. Get subjects
    console.log('\n2️⃣ Testing subjects list...');
    const subjectsResponse = await axios.get(`${BASE_URL}/subjects`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const subjects = subjectsResponse.data.subjects || [];

    console.log(`✅ Found ${subjects.length} subjects:`);
    subjects.slice(0, 5).forEach(subject => {
      console.log(`   - ${subject.name} (${subject.phoneNumber})`);
    });

    // 3. Check specific subject (홍길동)
    console.log('\n3️⃣ Checking for 홍길동 (010-9999-0001)...');
    const hongGilDong = subjects.find(s => s.phoneNumber === '010-9999-0001');

    if (hongGilDong) {
      console.log('✅ Found 홍길동:');
      console.log(`   ID: ${hongGilDong.id}`);
      console.log(`   Name: ${hongGilDong.name}`);
      console.log(`   Phone: ${hongGilDong.phoneNumber}`);
      console.log(`   Gender: ${hongGilDong.gender}`);
      console.log(`   Height: ${hongGilDong.height}`);
      console.log(`   Weight: ${hongGilDong.weight}`);
    } else {
      console.log('⚠️ 홍길동 not found');
    }

    console.log('\n🎉 All tests passed!');
    console.log('\n📝 Test account ready for frontend E2E testing:');
    console.log('   Username: instructor001');
    console.log('   Password: password123');
    console.log(`   Subjects: ${subjects.length} available`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testInstructor001();
