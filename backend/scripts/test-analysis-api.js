const http = require('http');

// Login to get token
const loginData = JSON.stringify({
  email: 'instructor001@golf.com',
  password: 'instructor001!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3003,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log('Login response:', res.statusCode);
    if (res.statusCode === 201 || res.statusCode === 200) {
      const result = JSON.parse(body);
      const token = result.access_token;
      console.log('Token:', token ? 'received' : 'not received');

      // Get analysis data
      const analysisOptions = {
        hostname: 'localhost',
        port: 3003,
        path: '/api/body-posture/analysis/24',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const analysisReq = http.request(analysisOptions, (res2) => {
        let body2 = '';
        res2.on('data', (d) => { body2 += d; });
        res2.on('end', () => {
          console.log('Analysis response:', res2.statusCode);
          if (res2.statusCode === 200) {
            const analysis = JSON.parse(body2);
            console.log('Analysis ID:', analysis.id);
            console.log('Analysis Date from API:', analysis.analysisDate);

            // Parse and display the date
            const date = new Date(analysis.analysisDate);
            console.log('Parsed as JS Date:', date.toString());
            console.log('KST formatted:', date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
          } else {
            console.log('Error:', body2);
          }
        });
      });
      analysisReq.end();
    } else {
      console.log('Login failed:', body);
    }
  });
});

loginReq.write(loginData);
loginReq.end();
