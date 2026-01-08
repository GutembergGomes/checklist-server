require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

const DATA_FILE = path.join(__dirname, 'data.json')
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('Erro: MONGODB_URI não definida no arquivo .env')
  process.exit(1)
}

async function migrate() {
  console.log('Iniciando migração...')
  
  // 1. Ler dados locais
  if (!fs.existsSync(DATA_FILE)) {
    console.error('Arquivo data.json não encontrado.')
    process.exit(1)
  }
  
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  const data = JSON.parse(raw)
  
  // 2. Conectar no Mongo
  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    const db = client.db()
    console.log('Conectado ao MongoDB.')

    // 3. Enviar cada coleção
    for (const [collectionName, items] of Object.entries(data)) {
      if (!Array.isArray(items) || items.length === 0) continue
      
      console.log(`Migrando ${collectionName} (${items.length} itens)...`)
      const collection = db.collection(collectionName)
      
      // Limpar coleção antiga (opcional, cuidado!)
      // await collection.deleteMany({}) 

      // Preparar itens (remover _id duplicado se houver)
      const docs = items.map(item => {
        const { _id, ...rest } = item
        // Garantir que ID seja string
        if (!rest.id && _id) rest.id = _id.toString()
        return rest
      })

      // Inserir
      // Usar updateOne com upsert para evitar duplicatas baseadas no ID
      for (const doc of docs) {
        if (!doc.id) continue
        await collection.updateOne(
          { id: doc.id },
          { $set: doc },
          { upsert: true }
        )
      }
    }
    
    console.log('Migração concluída com sucesso!')
  } catch (e) {
    console.error('Erro na migração:', e)
  } finally {
    await client.close()
  }
}

migrate()
