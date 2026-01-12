
const API_URL = 'https://checklist-server-nej7.onrender.com';

async function run() {
  try {
    const params = new URLSearchParams();
    params.append('orderBy', 'created_at');
    params.append('orderDir', 'desc');
    
    // Simulate what apiClient does
    const url = `${API_URL}/db/inspections?${params.toString()}`;
    console.log('Fetching:', url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    console.log('Count:', data.length);
    console.log('IDs:', data.map(i => i.id));
  } catch (e) {
    console.error(e);
  }
}

run();
