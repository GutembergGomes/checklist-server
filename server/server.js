require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb')

const app = express()
const PORT = process.env.PORT || 8080
const STORAGE_DIR = path.join(__dirname, 'storage')
const DATA_FILE = path.join(__dirname, 'data.json')
const MONGODB_URI = process.env.MONGODB_URI

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Storage Setup
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true })

// Database Connection
let db = null
let mongoClient = null

async function connectDB() {
  if (MONGODB_URI) {
    try {
      mongoClient = new MongoClient(MONGODB_URI)
      await mongoClient.connect()
      db = mongoClient.db()
      console.log('Connected to MongoDB')
    } catch (e) {
      console.error('MongoDB connection failed, falling back to JSON file:', e)
    }
  }
}

// JSON File Helpers
function readJsonData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { usuarios: [], equipamentos: [], inspections: [], checklists: [], calibragem: [], controle_3p: [], app_updates: [] }
  }
}

function writeJsonData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// Helper: Generic DB Operations
async function dbFind(collection, query = {}, limit = 0, sort = {}) {
  if (db) {
    // Mongo
    // Convert id to string for consistency
    let cursor = db.collection(collection).find(query)
    if (Object.keys(sort).length) cursor = cursor.sort(sort)
    if (limit) cursor = cursor.limit(limit)
    const docs = await cursor.toArray()
    // Prefer the explicit 'id' field if it exists, otherwise fall back to _id
    return docs.map(d => {
      const { _id, ...rest } = d
      return { ...rest, id: rest.id || _id.toString() }
    })
  } else {
    // JSON
    const data = readJsonData()
    let list = data[collection] || []
    // Basic filter support (equality)
    for (const [k, v] of Object.entries(query)) {
      list = list.filter(item => String(item[k]) === String(v))
    }
    // Sort support
    if (Object.keys(sort).length) {
      const [key, dir] = Object.entries(sort)[0] // simplified single col sort
      list.sort((a, b) => {
        if (a[key] < b[key]) return dir === 1 ? -1 : 1
        if (a[key] > b[key]) return dir === 1 ? 1 : -1
        return 0
      })
    }
    // Limit
    if (limit) list = list.slice(0, limit)
    return list
  }
}

async function dbInsert(collection, items) {
  const payload = Array.isArray(items) ? items : [items]
  const prepared = payload.map(i => ({ 
    ...i, 
    id: i.id || crypto.randomUUID(),
    created_at: i.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  if (db) {
    // Mongo
    // Use custom ID as _id if possible, or keep separate? 
    // Supabase uses UUIDs. Mongo uses ObjectIds.
    // Let's store 'id' as a field and let Mongo manage _id, but we return 'id'.
    await db.collection(collection).insertMany(prepared)
    return prepared
  } else {
    // JSON
    const data = readJsonData()
    if (!data[collection]) data[collection] = []
    data[collection].push(...prepared)
    writeJsonData(data)
    return prepared
  }
}

async function dbUpsert(collection, items, onConflict = 'id') {
  const payload = Array.isArray(items) ? items : [items]
  const results = []
  
  if (db) {
    // Mongo
    for (const item of payload) {
      const filter = { [onConflict]: item[onConflict] || item.id }
      if (!filter[onConflict]) {
        // Insert new if no conflict key
        const inserted = await dbInsert(collection, [item])
        results.push(inserted[0])
        continue
      }
      
      // Ensure created_at is NEVER in $set
      const { created_at, _id, ...updateFields } = item
      // Double check cleanup
      if ('created_at' in updateFields) delete updateFields.created_at
      
      const update = { 
        $set: { ...updateFields, updated_at: new Date().toISOString() }, 
        $setOnInsert: { created_at: created_at || new Date().toISOString() } 
      }
      if (!item.id) update.$setOnInsert.id = crypto.randomUUID()
      
      const res = await db.collection(collection).findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' })
      // res.value is the doc
      // In newer Mongo driver, findOneAndUpdate returns object with value/ok
      // Actually standard driver returns result object.
      // Let's fetch it after upsert to be safe/simple
      const doc = await db.collection(collection).findOne(filter)
      results.push({ ...doc, id: doc.id || doc._id.toString(), _id: undefined })
    }
  } else {
    // JSON
    const data = readJsonData()
    if (!data[collection]) data[collection] = []
    const list = data[collection]
    
    for (const item of payload) {
      const key = String(item[onConflict] || item.id || '')
      const idx = list.findIndex(x => String(x[onConflict] || x.id) === key)
      
      if (idx >= 0 && key) {
        const merged = { ...list[idx], ...item, updated_at: new Date().toISOString() }
        list[idx] = merged
        results.push(merged)
      } else {
        const copy = { ...item }
        if (!copy.id) copy.id = crypto.randomUUID()
        copy.created_at = copy.created_at || new Date().toISOString()
        copy.updated_at = new Date().toISOString()
        list.push(copy)
        results.push(copy)
      }
    }
    writeJsonData(data)
  }
  return results
}

async function dbDelete(collection, id) {
  if (db) {
    await db.collection(collection).deleteOne({ id: id })
    return [{ id }]
  } else {
    const data = readJsonData()
    if (!data[collection]) return []
    const before = data[collection].length
    data[collection] = data[collection].filter(x => String(x.id) !== String(id))
    if (data[collection].length !== before) writeJsonData(data)
    return [{ id }]
  }
}

// --- Routes ---

// Health
app.get('/', (req, res) => res.json({ status: 'online', mode: db ? 'mongodb' : 'json' }))

// Auth (Persistent via MongoDB)
// const sessions = new Map() // REMOVED: In-memory sessions cause disconnects on restart

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return user
  const { password, ...safe } = user
  return safe
}

async function getSessionFromRequest(req) {
  const auth = req.headers['authorization'] || ''
  const token = String(auth).startsWith('Bearer ') ? String(auth).slice('Bearer '.length) : String(auth)
  if (!token) return null
  const sessionsList = await dbFind('sessions', { token })
  return sessionsList[0] || null
}

function requireAuth(handler) {
  return async (req, res) => {
    try {
      const sess = await getSessionFromRequest(req)
      if (!sess || !sess.user) return res.status(401).json({ error: 'Unauthorized' })
      req.user = sess.user
      req.session = sess
      return handler(req, res)
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}

function isAdminUser(user) {
  const adminEmail = process.env.ADMIN_EMAIL || 'gutemberggg10@gmail.com'
  return !!(user && user.email && String(user.email).toLowerCase() === String(adminEmail).toLowerCase())
}

app.post('/auth/signup', async (req, res) => {
  const { email, password, options } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const users = await dbFind('users', { email })
    if (users.length > 0) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Extrair metadados se fornecidos
    const metadata = (options && options.data) ? options.data : {}
    const defaultName = email.split('@')[0]
    
    // Garantir que user_metadata tenha algo útil
    const user_metadata = {
        name: defaultName,
        ...metadata
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      password, // In production, hash this!
      user_metadata: user_metadata,
      created_at: new Date().toISOString()
    }
    
    await dbInsert('users', user)
    
    const token = crypto.randomUUID()
    // Persist session in DB
    await dbInsert('sessions', { 
        id: crypto.randomUUID(),
        token, 
        user_id: user.id, 
        user: sanitizeUser(user), 
        created_at: new Date().toISOString() 
    })
    
    res.json({ token, user: sanitizeUser(user) })
  } catch (e) {
    console.error('Signup error:', e)
    res.status(500).json({ error: 'Signup failed' })
  }
})

app.post('/auth/signin', async (req, res) => {
  const { email, password } = req.body
  // Accept any login for now or check against DB
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  
  // Try to find existing user to preserve ID
  try {
    const users = await dbFind('users', { email })
    let user = users[0]

    if (!user) {
        // Bloquear acesso de não cadastrados
        return res.status(400).json({ error: 'Usuário não encontrado. Faça o cadastro.' })
    }

    // Verificar senha
    if (user.password) {
        if (user.password !== password) {
            return res.status(401).json({ error: 'Senha incorreta' })
        }
    } else {
        // Migração: Usuário antigo sem senha -> Define a senha agora
        user.password = password
        // Atualizar no banco
        // Precisamos de um dbUpdate ou dbUpsert
        await dbUpsert('users', [user], 'id')
    }

    const token = crypto.randomUUID()
    // Persist session in DB
    await dbInsert('sessions', { 
        id: crypto.randomUUID(),
        token, 
        user_id: user.id, 
        user: sanitizeUser(user), 
        created_at: new Date().toISOString() 
    })
    
    res.json({ token, user: sanitizeUser(user) })
  } catch (e) {
    console.error('Login error:', e)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.get('/auth/session', async (req, res) => {
  try {
      const sess = await getSessionFromRequest(req)
      res.json({ user: sess ? sess.user : null })
  } catch (e) {
      res.json({ user: null })
  }
})

app.post('/auth/signout', requireAuth(async (req, res) => {
  try {
    if (req.session?.id) await dbDelete('sessions', req.session.id)
  } catch(e) {}
  res.json({ ok: true })
}))

// Database Endpoints
app.get('/db/:table', requireAuth(async (req, res) => {
  try {
    const { limit, orderBy, orderDir, ...filters } = req.query
    const sort = {}
    if (orderBy) {
        sort[orderBy] = orderDir === 'desc' ? -1 : 1
    }
    const table = req.params.table
    const user = req.user

    if (table === 'sessions' && !isAdminUser(user)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (table === 'users' && !isAdminUser(user)) {
      const wantsId = filters.id != null && String(filters.id) === String(user.id)
      const wantsEmail = filters.email != null && String(filters.email).toLowerCase() === String(user.email || '').toLowerCase()
      if (Object.keys(filters).length > 0 && !(wantsId || wantsEmail)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      if (Object.keys(filters).length === 0) {
        filters.id = user.id
      }
    }

    let docs = await dbFind(table, filters, Number(limit) || 0, sort)
    if (table === 'users') {
      const safe = (Array.isArray(docs) ? docs : [docs]).map(sanitizeUser)
      return res.json(safe)
    }
    res.json(docs)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}))

app.post('/db/:table/insert', requireAuth(async (req, res) => {
  try {
    const table = req.params.table
    const user = req.user
    if (table === 'sessions' && !isAdminUser(user)) return res.status(403).json({ error: 'Forbidden' })
    if (table === 'users' && !isAdminUser(user)) return res.status(403).json({ error: 'Forbidden' })
    const { data } = req.body
    const result = await dbInsert(table, data)
    if (table === 'users') {
      const safe = (Array.isArray(result) ? result : [result]).map(sanitizeUser)
      return res.json(safe)
    }
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}))

app.post('/db/:table/upsert', requireAuth(async (req, res) => {
  try {
    const table = req.params.table
    const user = req.user
    if (table === 'sessions' && !isAdminUser(user)) return res.status(403).json({ error: 'Forbidden' })
    if (table === 'users' && !isAdminUser(user)) {
      const { data } = req.body || {}
      const rows = Array.isArray(data) ? data : [data]
      const allSelf = rows.every((r) => {
        if (!r) return false
        if (r.id && String(r.id) !== String(user.id)) return false
        if (r.email && String(r.email).toLowerCase() !== String(user.email || '').toLowerCase()) return false
        return true
      })
      if (!allSelf) return res.status(403).json({ error: 'Forbidden' })
    }
    const { data, onConflict } = req.body
    if (!data) return res.status(400).json({ error: 'Missing data payload' })
    const result = await dbUpsert(table, data, onConflict)
    if (table === 'users') {
      const safe = (Array.isArray(result) ? result : [result]).map(sanitizeUser)
      return res.json(safe)
    }
    res.json(result)
  } catch (e) {
    console.error('Upsert error:', e)
    res.status(500).json({ error: e.message })
  }
}))

app.delete('/db/:table/:id', requireAuth(async (req, res) => {
  try {
    const table = req.params.table
    const user = req.user
    if (table === 'sessions' && !isAdminUser(user)) return res.status(403).json({ error: 'Forbidden' })
    if (table === 'users' && !isAdminUser(user)) return res.status(403).json({ error: 'Forbidden' })
    const result = await dbDelete(table, req.params.id)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}))

// Storage Routes
// Handle raw body upload (apiClient sends body: file)
app.post('/storage/upload', requireAuth((req, res) => {
  const bucket = req.query.bucket
  const filePath = req.query.path
  
  if (!bucket || !filePath) return res.status(400).json({ error: 'Missing bucket/path' })

  if (db) {
    // MongoDB GridFS
    const gridFs = new GridFSBucket(db, { bucketName: bucket })
    const uploadStream = gridFs.openUploadStream(filePath)
    
    req.pipe(uploadStream)
    
    uploadStream.on('finish', () => res.json({ key: `${bucket}/${filePath}` }))
    uploadStream.on('error', (e) => res.status(500).json({ error: e.message }))
    return
  }

  // Local Filesystem
  const fullPath = path.join(STORAGE_DIR, bucket, filePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  
  const writeStream = fs.createWriteStream(fullPath)
  req.pipe(writeStream)
  
  writeStream.on('finish', () => res.json({ key: `${bucket}/${filePath}` }))
  writeStream.on('error', (e) => res.status(500).json({ error: e.message }))
}))

// Legacy raw route (can be removed if client uses above)
app.post('/storage/upload_raw', requireAuth((req, res) => {
  res.redirect(307, `/storage/upload?bucket=${req.query.bucket}&path=${req.query.path}`)
}))


app.get('/storage/file/:bucket/*', (req, res) => {
  const bucket = req.params.bucket
  const filePath = req.params[0]
  
  if (db) {
    // MongoDB GridFS
    const gridFs = new GridFSBucket(db, { bucketName: bucket })
    const downloadStream = gridFs.openDownloadStreamByName(filePath)
    
    downloadStream.on('error', () => res.status(404).json({ error: 'File not found' }))
    downloadStream.pipe(res)
    return
  }

  // Local Filesystem
  const fullPath = path.join(STORAGE_DIR, bucket, filePath)
  if (fs.existsSync(fullPath)) {
    res.sendFile(fullPath)
  } else {
    res.status(404).json({ error: 'File not found' })
  }
})

// Start
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Mode: ${db ? 'MongoDB' : 'JSON File'}`)
  })
})
