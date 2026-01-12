const http = require('http');
const https = require('https');

function checkCors(urlString) {
  const url = new URL(urlString);
  const client = url.protocol === 'https:' ? https : http;
  
  const options = {
    method: 'OPTIONS',
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    headers: {
      'Origin': 'http://localhost:3000', // Simulate common dev origin
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization, Content-Type'
    }
  };

  return new Promise((resolve, reject) => {
    console.log(`\nChecking CORS for: ${urlString}`);
    const req = client.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Relevant Headers:');
      console.log(`Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'MISSING'}`);
      console.log(`Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'MISSING'}`);
      console.log(`Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'MISSING'}`);
      
      if (res.statusCode === 200 || res.statusCode === 204) {
          console.log('✅ CORS Preflight OK');
      } else {
          console.log('❌ CORS Preflight Failed');
      }
      resolve();
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve(); // Resolve anyway to continue
    });

    req.end();
  });
}

async function run() {
  // Teste Local
  // await checkCors('http://localhost:8080/db/inspections');
  
  // Teste Produção
  await checkCors('https://checklist-server-nej7.onrender.com/db/inspections');
}

run();
