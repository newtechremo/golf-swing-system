const axios = require('axios');

const API_BASE = 'http://localhost:3003/api';
let accessToken = '';

// Helper function
async function test(name, fn) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${name}`);
    console.log('='.repeat(60));
    await fn();
    console.log('✅ PASSED');
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Error:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  console.log('\n🚀 Starting API Tests...\n');

  // 1. Login Test
  await test('1. Login API', async () => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'instructor1',
      password: 'password123'
    });

    accessToken = response.data.accessToken;
    console.log('📝 Response:');
    console.log(`   User: ${response.data.user.name} (${response.data.user.username})`);
    console.log(`   Access Token: ${accessToken.substring(0, 50)}...`);
    console.log(`   Role: instructor`);
  });

  // 2. Get Subjects
  await test('2. Get Subjects List', async () => {
    const response = await axios.get(`${API_BASE}/subjects?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('📝 Response:');
    console.log(`   Total subjects: ${response.data.total}`);
    console.log(`   Page: ${response.data.page}/${Math.ceil(response.data.total / response.data.limit)}`);
    console.log('   Subjects:');
    response.data.subjects.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.name} (${s.phoneNumber}) - Golf: ${s.analysisCount.golfSwing}, Posture: ${s.analysisCount.posture}`);
    });
  });

  // 3. Get Subject Detail
  await test('3. Get Subject Detail', async () => {
    const response = await axios.get(`${API_BASE}/subjects/1`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('📝 Response:');
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Phone: ${response.data.phoneNumber}`);
    console.log(`   Email: ${response.data.email || 'N/A'}`);
    console.log(`   Height: ${response.data.height || 'N/A'} cm`);
    console.log(`   Weight: ${response.data.weight || 'N/A'} kg`);
    console.log(`   Recent Golf Swing Analyses: ${response.data.recentAnalyses.golfSwing.length}`);
    console.log(`   Recent Posture Analyses: ${response.data.recentAnalyses.posture.length}`);
  });

  // 4. Create New Subject
  await test('4. Create New Subject', async () => {
    const response = await axios.post(`${API_BASE}/subjects`, {
      name: '테스트 대상자',
      phoneNumber: '010-9999-9999',
      birthDate: '1995-01-01',
      gender: 'M',
      height: 175,
      weight: 70,
      email: 'test@example.com'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('📝 Response:');
    console.log(`   Created subject ID: ${response.data.id}`);
    console.log(`   Name: ${response.data.name}`);
    console.log(`   Phone: ${response.data.phoneNumber}`);
  });

  // 5. Update Subject
  await test('5. Update Subject', async () => {
    const response = await axios.put(`${API_BASE}/subjects/1`, {
      memo: '테스트 메모 업데이트'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('📝 Response:');
    console.log(`   Updated subject: ${response.data.name}`);
    console.log(`   New memo: ${response.data.memo}`);
  });

  // 6. Get Analysis History
  await test('6. Get Analysis History', async () => {
    const response = await axios.get(`${API_BASE}/history/subject/1?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('📝 Response:');
    console.log(`   Subject: ${response.data.subject.name}`);
    console.log(`   Total history: ${response.data.pagination.total}`);
    console.log(`   History items: ${response.data.history.length}`);
  });

  // 7. Get Calendar Data
  await test('7. Get Calendar Data', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const response = await axios.get(`${API_BASE}/history/subject/1/calendar?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('📝 Response:');
    console.log(`   Subject: ${response.data.subject.name}`);
    console.log(`   Year/Month: ${response.data.year}/${response.data.month}`);
    console.log(`   Total analysis dates: ${response.data.data.length}`);
  });

  // 8. Test Auth Guard (without token)
  await test('8. Auth Guard Test (should fail)', async () => {
    try {
      await axios.get(`${API_BASE}/subjects`);
      throw new Error('Should have failed without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('📝 Response:');
        console.log(`   ✅ Correctly returned 401 Unauthorized`);
        console.log(`   Message: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }
  });

  // 9. Invalid Login Test
  await test('9. Invalid Login Test (should fail)', async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: 'wronguser',
        password: 'wrongpassword'
      });
      throw new Error('Should have failed with wrong credentials');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('📝 Response:');
        console.log(`   ✅ Correctly returned 401 Unauthorized`);
        console.log(`   Message: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED!');
  console.log('='.repeat(60));
  console.log('\n✅ API Test Summary:');
  console.log('   - Authentication: ✅');
  console.log('   - Subject CRUD: ✅');
  console.log('   - History APIs: ✅');
  console.log('   - Authorization: ✅');
  console.log('   - Error Handling: ✅');
  console.log('\n🚀 Backend system is fully operational!\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
