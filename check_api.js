
const https = require('https');

function check(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data}`);
        resolve();
      });
    }).on('error', err => {
      console.error(err);
      reject(err);
    });
  });
}

async function run() {
  console.log('Checking Root...');
  await check('https://checklist-server-nej7.onrender.com/');
  
  console.log('\nChecking Inspections DB...');
  await check('https://checklist-server-nej7.onrender.com/db/inspections?limit=1');

  console.log('\nChecking Respostas DB...');
  await check('https://checklist-server-nej7.onrender.com/db/respostas_checklist?limit=1');
}

run();
