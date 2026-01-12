require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 8080
const STORAGE_DIR = path.join(__dirname, 'storage')
const DATA_FILE = path.join(__dirname, 'data.json')
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/checklist'

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Storage Setup
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true })

// Database Connection
let pgPool = null

async function connectDB() {
  if (DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: DATABASE_URL,
      })
      // Test connection
      await pool.query('SELECT NOW()')
      console.log('Connected to PostgreSQL')
      pgPool = pool
      await initSchema()
    } catch (e) {
      console.error('PostgreSQL connection failed, falling back to JSON file:', e.message)
      console.error('Ensure PostgreSQL is running and DATABASE_URL is correct.')
    }
  }
}

async function initSchema() {
  if (!pgPool) return
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
    await pgPool.query(schemaSql)
    console.log('Database schema initialized')
  } catch (e) {
    console.error('Schema initialization failed:', e)
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
  if (pgPool) {
    try {
      // Build WHERE clause
      const conditions = []
      const values = []
      let i = 1
      for (const [k, v] of Object.entries(query)) {
        conditions.push(`${k} = $${i}`)
        values.push(v)
        i++
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
      
      // Build ORDER BY
      const orderClauses = []
      for (const [k, dir] of Object.entries(sort)) {
        orderClauses.push(`${k} ${dir === 1 || dir === 'asc' ? 'ASC' : 'DESC'}`)
      }
      const orderByClause = orderClauses.length ? `ORDER BY ${orderClauses.join(', ')}` : ''
      
      // Build LIMIT
      const limitClause = limit ? `LIMIT ${limit}` : ''
      
      const sql = `SELECT * FROM ${collection} ${whereClause} ${orderByClause} ${limitClause}`
      const res = await pgPool.query(sql, values)
      return res.rows
    } catch (e) {
      console.error(`dbFind error in ${collection}:`, e)
      return []
    }
  } else {
    // JSON Fallback
    const data = readJsonData()
    let list = data[collection] || []
    for (const [k, v] of Object.entries(query)) {
      list = list.filter(item => String(item[k]) === String(v))
    }
    if (Object.keys(sort).length) {
      const [key, dir] = Object.entries(sort)[0]
      list.sort((a, b) => {
        if (a[key] < b[key]) return dir === 1 ? -1 : 1
        if (a[key] > b[key]) return dir === 1 ? 1 : -1
        return 0
      })
    }
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

  if (pgPool) {
    try {
      const results = []
      for (const item of prepared) {
        const keys = Object.keys(item)
        const values = Object.values(item)
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
        // Quote keys to handle reserved words like "user"
        const columns = keys.map(k => `"${k}"`).join(', ')
        
        const sql = `INSERT INTO ${collection} (${columns}) VALUES (${placeholders}) RETURNING *`
        const res = await pgPool.query(sql, values)
        results.push(res.rows[0])
      }
      return results
    } catch (e) {
      console.error(`dbInsert error in ${collection}:`, e)
      throw e
    }
  } else {
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
  
  if (pgPool) {
    try {
      for (const item of payload) {
        // Ensure id exists
        if (!item.id) item.id = crypto.randomUUID()
        // Ensure timestamps
        if (!item.created_at) item.created_at = new Date().toISOString()
        item.updated_at = new Date().toISOString()

        const keys = Object.keys(item)
        const values = Object.values(item)
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
        const columns = keys.map(k => `"${k}"`).join(', ')
        
        // Build UPDATE SET clause for ON CONFLICT
        // Exclude created_at from update
        const updateSet = keys
          .filter(k => k !== 'created_at' && k !== onConflict)
          .map(k => `"${k}" = EXCLUDED."${k}"`)
          .join(', ')

        const sql = `
          INSERT INTO ${collection} (${columns}) 
          VALUES (${placeholders}) 
          ON CONFLICT (${onConflict}) 
          DO UPDATE SET ${updateSet}
          RETURNING *
        `
        const res = await pgPool.query(sql, values)
        results.push(res.rows[0])
      }
    } catch (e) {
      console.error(`dbUpsert error in ${collection}:`, e)
      throw e
    }
  } else {
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
  if (pgPool) {
    try {
      await pgPool.query(`DELETE FROM ${collection} WHERE id = $1`, [id])
      return [{ id }]
    } catch (e) {
      console.error(`dbDelete error in ${collection}:`, e)
      throw e
    }
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
app.get('/', (req, res) => res.json({ status: 'online', mode: pgPool ? 'postgresql' : 'json' }))

// Auth (Persistent)
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

    const metadata = (options && options.data) ? options.data : {}
    const defaultName = email.split('@')[0]
    
    const user_metadata = {
        name: defaultName,
        ...metadata
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      password,
      user_metadata: user_metadata,
      created_at: new Date().toISOString()
    }
    
    await dbInsert('users', user)
    
    const token = crypto.randomUUID()
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
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  
  try {
    const users = await dbFind('users', { email })
    let user = users[0]

    if (!user) {
        return res.status(400).json({ error: 'Usuário não encontrado. Faça o cadastro.' })
    }

    if (user.password) {
        if (user.password !== password) {
            return res.status(401).json({ error: 'Senha incorreta' })
        }
    } else {
        user.password = password
        await dbUpsert('users', [user], 'id')
    }

    const token = crypto.randomUUID()
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
// Using local filesystem for all storage when not using Mongo (and even if using PG, for now)
app.post('/storage/upload', requireAuth((req, res) => {
  const bucket = req.query.bucket
  const filePath = req.query.path
  
  if (!bucket || !filePath) return res.status(400).json({ error: 'Missing bucket/path' })

  // Local Filesystem
  const fullPath = path.join(STORAGE_DIR, bucket, filePath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  
  const writeStream = fs.createWriteStream(fullPath)
  req.pipe(writeStream)
  
  writeStream.on('finish', () => res.json({ key: `${bucket}/${filePath}` }))
  writeStream.on('error', (e) => res.status(500).json({ error: e.message }))
}))

// Legacy raw route
app.post('/storage/upload_raw', requireAuth((req, res) => {
  res.redirect(307, `/storage/upload?bucket=${req.query.bucket}&path=${req.query.path}`)
}))


app.get('/storage/file/:bucket/*', (req, res) => {
  const bucket = req.params.bucket
  const filePath = req.params[0]
  
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
    console.log(`Mode: ${pgPool ? 'PostgreSQL' : 'JSON File'}`)
  })
})
