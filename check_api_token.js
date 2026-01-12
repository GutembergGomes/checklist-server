const https = require('https');

function check(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
        headers: {}
    };
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Token: ${token ? 'YES' : 'NO'}`);
        console.log(`Status: ${res.statusCode}`);
        resolve();
      });
    }).on('error', err => {
      console.error(err);
      reject(err);
    });
  });
}

async function run() {
  console.log('Checking with BAD token...');
  await check('https://checklist-server-nej7.onrender.com/db/inspections?limit=1', 'bad-token-123');
  
  console.log('Checking with NO token...');
  await check('https://checklist-server-nej7.onrender.com/db/inspections?limit=1', null);
}

run();
