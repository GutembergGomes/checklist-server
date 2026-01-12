const https = require('https');

const API_URL = 'https://checklist-server-nej7.onrender.com';

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        https.get(`${API_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        }).on('error', reject);
    });
}

async function checkChecklists() {
    console.log('Checking /db/checklists...');
    const res = await fetchJson('/db/checklists');
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
}

checkChecklists();
