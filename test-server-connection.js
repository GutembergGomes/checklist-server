
const API_BASE_URL = 'https://checklist-server-nej7.onrender.com';

async function testFetch() {
    try {
        console.log('Testing connection to:', API_BASE_URL);
        
        // 1. Health check
        const health = await fetch(API_BASE_URL);
        console.log('Health Status:', health.status);
        const healthData = await health.json();
        console.log('Health Data:', healthData);

        // 2. Auth (Login) - we need a token to fetch db
        // I will try to sign in with a known user or just check public endpoints if any.
        // But /db endpoints require auth.
        // I'll try to signup a temp user or login if I knew credentials.
        // Since I don't know credentials, I'll try to signup a random user.
        const email = `test_${Date.now()}@example.com`;
        const password = 'password123';
        
        console.log('Attempting signup with:', email);
        const signupRes = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const signupData = await signupRes.json();
        console.log('Signup Status:', signupRes.status);
        console.log('Signup Data:', signupData);
        
        const token = signupData.token;
        if (!token) {
            console.error('No token received');
            return;
        }

        // 3. Fetch Inspections
        console.log('Fetching inspections...');
        const dbRes = await fetch(`${API_BASE_URL}/db/inspections?limit=5`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('DB Status (Inspections):', dbRes.status);
        const text = await dbRes.text();
        console.log('DB Response Body (Inspections):', text);

        // 4. Fetch Respostas Checklist
        console.log('Fetching respostas_checklist...');
        const resRes = await fetch(`${API_BASE_URL}/db/respostas_checklist?limit=5`, {
             headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('DB Status (Respostas):', resRes.status);
        const resText = await resRes.text();
        console.log('DB Response Body (Respostas):', resText);

    } catch (e) {
        console.error('Test failed:', e);
    }
}

testFetch();
