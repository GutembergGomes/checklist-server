require('dotenv').config()
const fs = require('fs')
const csv = require('csv-parser')
const { MongoClient } = require('mongodb')
const path = require('path')

// Config
const CSV_DIR = 'c:/Users/Gutemberg Gomes/Downloads'
const MAPPINGS = {
  'equipments_rows.csv': 'equipments',
  'inspections_rows.csv': 'inspections',
  'controle_3p_rows.csv': 'controle_3p',
  'access_controls_rows.csv': 'access_controls',
  'users_rows.csv': 'users'
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('ERRO: MONGODB_URI não definida no .env')
  process.exit(1)
}
const client = new MongoClient(uri)

async function importCsv(filename, collectionName) {
  const filePath = path.join(CSV_DIR, filename)
  if (!fs.existsSync(filePath)) {
    console.log(`Arquivo não encontrado (pulando): ${filename}`)
    return
  }

  const results = []
  console.log(`Lendo ${filename} -> ${collectionName}...`)
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Try to parse JSON fields if they look like JSON
        for (const key in data) {
            if (typeof data[key] === 'string' && (data[key].startsWith('{') || data[key].startsWith('['))) {
                try {
                    const parsed = JSON.parse(data[key])
                    data[key] = parsed
                } catch (e) {
                    // ignore, keep as string
                }
            }
            // Fix boolean strings
            if (data[key] === 't' || data[key] === 'true') data[key] = true
            if (data[key] === 'f' || data[key] === 'false') data[key] = false
            
            // Fix nulls
            if (data[key] === '' || data[key] === 'NULL') data[key] = null
            
            // Fix numbers (optional, but good for id if numeric)
            // if (!isNaN(data[key]) && data[key] !== null && data[key] !== '') {
            //    data[key] = Number(data[key])
            // }
        }
        
        results.push(data)
      })
      .on('end', async () => {
        try {
          if (results.length > 0) {
            const db = client.db()
            

                // Delete existing? No, maybe just append.
                // But if we run multiple times, we get dupes.
                // Let's rely on _id if provided, or just insert.
                // Supabase exports might have 'id'. Mongo uses '_id'.
                // If we map 'id' -> '_id', we avoid dupes.
                
                const prepared = results.map(r => {
                    const doc = { ...r }
                    // If 'id' exists, use it as 'id' field (my app uses 'id').
                    // Mongo will generate unique '_id'.
                // To prevent duplicates, we can check if exists or use 'id' as unique index.
                // For now, simple insert.
                return doc
            })

            // Batch insert
            const BATCH_SIZE = 50
            let total = 0
            for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
                const chunk = prepared.slice(i, i + BATCH_SIZE)
                try {
                    await db.collection(collectionName).insertMany(chunk, { ordered: false })
                    total += chunk.length
                    console.log(`✅ Importado lote ${i} a ${i + chunk.length} (${collectionName})`)
                } catch (e) {
                    console.log(`⚠️ Erro no lote ${i} (${collectionName}): ${e.message}`)
                    // If batch fails (e.g. document too large), try one by one
                    for (const doc of chunk) {
                        try {
                             await db.collection(collectionName).insertOne(doc)
                             total++
                        } catch (err) {
                             console.error(`❌ Erro registro individual (provavelmente muito grande ou duplicado): ${err.message}`)
                        }
                    }
                }
            }
            console.log(`🏁 Total importado em '${collectionName}': ${total}`)

          } else {
            console.log(`ℹ️ Arquivo vazio: ${filename}`)
          }
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      .on('error', reject)
  })
}

async function run() {
  try {
    console.log('Conectando ao MongoDB...')
    await client.connect()
    console.log('Conectado!')
    
    for (const [file, col] of Object.entries(MAPPINGS)) {
      await importCsv(file, col)
    }
    
    console.log('🎉 Importação finalizada!')
  } catch (e) {
    console.error('Erro Geral:', e)
  } finally {
    await client.close()
  }
}

run()
