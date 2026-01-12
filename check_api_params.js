const https = require('https');

function check(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`URL: ${url}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body Prefix: ${data.substring(0, 200)}`);
        resolve();
      });
    }).on('error', err => {
      console.error(err);
      reject(err);
    });
  });
}

async function run() {
  console.log('Checking with Params...');
  // Simulating: api.from('inspections').select('*').order('created_at', { ascending: false })
  await check('https://checklist-server-nej7.onrender.com/db/inspections?orderBy=created_at&orderDir=desc');
  
  // Simulating: api.from('respostas_checklist').select('*').order('created_at', { ascending: false })
  await check('https://checklist-server-nej7.onrender.com/db/respostas_checklist?orderBy=created_at&orderDir=desc');
}

run();
