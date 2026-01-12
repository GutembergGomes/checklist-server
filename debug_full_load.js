const https = require('https');

const API_URL = 'https://checklist-server-nej7.onrender.com';

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        https.get(`${API_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    console.error(`Erro ao fazer parse de ${path}:`, data.substring(0, 100));
                    resolve([]);
                }
            });
        }).on('error', reject);
    });
}

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE CARREGAMENTO DE DADOS ---');

    // 1. Carregar Equipamentos
    console.log('1. Buscando Equipamentos...');
    const equipments = await fetchJson('/db/equipments?limit=1000');
    const irrigEquipments = await fetchJson('/db/irrig_equipments?limit=1000');
    const equipamentosPT = await fetchJson('/db/equipamentos?limit=1000'); // Migration table

    const allEquipments = [...(equipments || []), ...(irrigEquipments || []), ...(equipamentosPT || [])];
    console.log(`   > Total Equipamentos encontrados: ${allEquipments.length}`);
    
    // Mapa de IDs e Códigos
    const eqMap = new Map();
    const eqCodeMap = new Map();
    
    allEquipments.forEach(e => {
        eqMap.set(String(e.id), e);
        if (e.frota) eqCodeMap.set(String(e.frota), e);
        if (e.codigo) eqCodeMap.set(String(e.codigo), e);
    });

    // 2. Carregar Checklists (Modelos)
    console.log('\n2. Buscando Modelos de Checklist...');
    const checklists = await fetchJson('/db/checklists');
    console.log(`   > Total Modelos: ${checklists ? checklists.length : 0}`);
    const clMap = new Map((checklists || []).map(c => [String(c.id), c]));

    // 3. Carregar Inspeções (Dados Preenchidos)
    console.log('\n3. Buscando Inspeções (Dados Preenchidos)...');
    const inspections = await fetchJson('/db/inspections?limit=50&orderBy=created_at&orderDir=desc');
    const respostas = await fetchJson('/db/respostas_checklist?limit=50&orderBy=created_at&orderDir=desc');
    
    const allInspections = [...(inspections || []), ...(respostas || [])];
    console.log(`   > Total Inspeções recentes baixadas: ${allInspections.length}`);
    if (allInspections.length > 0) {
        console.log('   > EXEMPLO DE INSPEÇÃO (Primeira):');
        console.log(JSON.stringify(allInspections[0], null, 2));
    }

    // 4. Simular Enriquecimento (Onde o App pode estar falhando)
    console.log('\n4. Testando Cruzamento de Dados (Enrichment)...');
    
    let successCount = 0;
    let failCount = 0;
    let failedExamples = [];

    allInspections.forEach(item => {
        let frotaNome = item.frota || item.equipamento_id;
        let foundEq = false;

        // Lógica do App
        const eq = eqMap.get(String(item.equipamento_id)) || eqCodeMap.get(String(item.frota));
        
        if (eq) {
            frotaNome = eq.codigo || eq.frota;
            foundEq = true;
        }

        // Verifica Tipo
        let tipo = item.tipo;
        if (!tipo && item.checklist_id) {
            const cl = clMap.get(String(item.checklist_id));
            if (cl) tipo = cl.tipo;
        }

        if (foundEq) {
            successCount++;
        } else {
            failCount++;
            if (failedExamples.length < 5) {
                failedExamples.push({
                    id: item.id,
                    equipamento_id: item.equipamento_id,
                    frota_original: item.frota,
                    data: item.created_at
                });
            }
        }
    });

    console.log(`   > Sucesso no cruzamento: ${successCount}`);
    console.log(`   > Falha no cruzamento (Equipamento não achado): ${failCount}`);

    if (failCount > 0) {
        console.log('\n   Exemplos de Falhas:');
        console.table(failedExamples);
        console.log('\n   [ANÁLISE]: Se houver muitas falhas, o App pode estar descartando esses itens ou exibindo sem nome.');
    } else {
        console.log('\n   [SUCESSO]: Todos os itens encontraram seus equipamentos correspondentes.');
    }
}

diagnose();
