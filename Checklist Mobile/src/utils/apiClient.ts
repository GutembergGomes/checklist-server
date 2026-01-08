type UpsertOptions = {
  onConflict?: string
}

type DeleteResult<T> = { data: T[] | null; error: Error | null }
type SelectResult<T> = { data: T[] | null; error: Error | null }
type SingleResult<T> = { data: T | null; error: Error | null }
type UpsertResult<T> = { data: T[] | null; error: Error | null }
type InsertResult<T> = { data: T[] | null; error: Error | null }

const API_URL = import.meta.env.VITE_API_URL || ''

function getToken() {
  try {
    return localStorage.getItem('checklist-mobile-auth-token') || ''
  } catch {
    return ''
  }
}

async function request(path: string, init: RequestInit = {}) {
  if (!API_URL) throw new Error('API local não configurada')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `HTTP ${res.status}`)
    }
    const json = await res.json().catch(() => null)
    return json
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Tempo limite da requisição excedido (15s)')
    }
    throw error
  }
}

class QueryBuilder<T> {
  private table: string
  private filters: Record<string, any> = {}
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private complexFilters: Array<(row: any) => boolean> = []
  
  // State for lazy execution
  private operation: 'select' | 'insert' | 'upsert' | 'delete' = 'select'
  private body: any = null
  private upsertOptions: any = null

  constructor(table: string) {
    this.table = table
  }

  eq(column: string, value: any) {
    this.filters[column] = value
    return this
  }

  neq(column: string, value: any) {
    this.complexFilters.push((row) => row?.[column] !== value)
    return this
  }

  gte(column: string, value: any) {
    this.complexFilters.push((row) => row?.[column] >= value)
    return this
  }

  lte(column: string, value: any) {
    this.complexFilters.push((row) => row?.[column] <= value)
    return this
  }

  contains(column: string, value: any) {
    this.complexFilters.push((row) => {
      const target = row?.[column]
      if (typeof target === 'object' && target !== null && typeof value === 'object' && value !== null) {
        // Simple subset check for JSON
        return Object.entries(value).every(([k, v]) => target[k] === v)
      }
      if (Array.isArray(target)) {
        return target.includes(value)
      }
      return String(target).includes(String(value))
    })
    return this
  }

  in(column: string, values: any[]) {
    this.complexFilters.push((row) => values.includes(row?.[column]))
    return this
  }

  order(column: string, opts: { ascending: boolean }) {
    this.orderBy = { column, ascending: !!opts?.ascending }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  select(columns?: string) {
    this.operation = 'select'
    return this
  }

  insert(payload: Partial<T> | Partial<T>[]) {
    this.operation = 'insert'
    this.body = payload
    return this
  }

  upsert(payload: Partial<T> | Partial<T>[], opts?: UpsertOptions) {
    this.operation = 'upsert'
    this.body = payload
    this.upsertOptions = opts
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  async single(): Promise<SingleResult<T>> {
    // Force execution as select if not set, or whatever operation is pending
    // Usually single() is called after select()
    const res = await this.then((r) => r, (e) => ({ data: null, error: e })) as any
    if (res.error) return { data: null, error: res.error }
    const first = (res.data && res.data[0]) || null
    return { data: first, error: null }
  }

  // Thenable implementation for await
  async then(resolve?: (value: any) => any, reject?: (reason: any) => any) {
    try {
      let result: any
      
      if (this.operation === 'select') {
        // Construct query parameters
        const params = new URLSearchParams()
        
        // Handle standard filters
        for (const [k, v] of Object.entries(this.filters)) {
           params.append(k, String(v))
        }

        // Handle sorting
        if (this.orderBy) {
            params.append('orderBy', this.orderBy.column)
            params.append('orderDir', this.orderBy.ascending ? 'asc' : 'desc')
        }

        // Handle limit if no complex client-side filters
        // If we have complex filters, we might still fetch all. 
        // But if server handles sort, we can pass limit safely if no complex filters.
        if (this.limitCount !== null && this.complexFilters.length === 0) {
            params.append('limit', String(this.limitCount))
        }

        const queryString = params.toString()
        const url = `/db/${this.table}${queryString ? '?' + queryString : ''}`
        
        const list: T[] = await request(url, { method: 'GET' })
        let data = Array.isArray(list) ? [...list] : []
        
        // Client-side filtering (still needed for complex filters or if server ignores some params)
        // But if we sent params, server hopefully filtered some.
        // We re-apply filters to be safe, unless we trust server 100%. 
        // For 'eq' filters, re-applying is harmless.
        
        for (const [k, v] of Object.entries(this.filters)) {
          data = data.filter((row: any) => String(row?.[k] ?? '') === String(v))
        }
        for (const f of this.complexFilters) {
          data = data.filter(f)
        }
        
        // Sorting
        if (this.orderBy) {
          const { column, ascending } = this.orderBy
          data.sort((a: any, b: any) => {
            const av = a?.[column]
            const bv = b?.[column]
            if (av === bv) return 0
            if (av == null) return ascending ? -1 : 1
            if (bv == null) return ascending ? 1 : -1
            return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
          })
        }
        
        // Limit (client side cut if complex filters existed or sort happened)
        if (this.limitCount !== null) {
          data = data.slice(0, this.limitCount)
        }
        
        result = { data, error: null }
      } 
      else if (this.operation === 'insert') {
        const payload = Array.isArray(this.body) ? this.body : [this.body]
        const data: T[] = await request(`/db/${this.table}/insert`, {
           method: 'POST',
           body: JSON.stringify({ data: payload })
        })
        result = { data, error: null }
      }
      else if (this.operation === 'upsert') {
        const payloadRaw = Array.isArray(this.body) ? this.body : [this.body]
          // Don't strip created_at - let server handle it (server uses $setOnInsert)
          // keeping it allows preserving client-side timestamp if set
          const payload = payloadRaw
          const data: T[] = await request(`/db/${this.table}/upsert`, {
           method: 'POST',
           body: JSON.stringify({ data: payload, onConflict: this.upsertOptions?.onConflict })
        })
        result = { data, error: null }
      }
      else if (this.operation === 'delete') {
         const id = this.filters['id']
         if (!id) throw new Error('Delete requer eq("id", valor)')
         const data: T[] = await request(`/db/${this.table}/${id}`, { method: 'DELETE' })
         result = { data, error: null }
      }

      return resolve ? resolve(result) : result
    } catch (e: any) {
      const err = { data: null, error: e }
      return reject ? reject(err) : err
    }
  }

  catch(onrejected?: (reason: any) => any) {
    return this.then().catch(onrejected)
  }

  finally(onfinally?: () => void) {
    return this.then().finally(onfinally)
  }

  get [Symbol.toStringTag]() {
    return 'QueryBuilder'
  }
}

export function createApiClient() {
  const auth = {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await request('/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        const { token, user } = res || {}
        if (token) {
          try { localStorage.setItem('checklist-mobile-auth-token', token) } catch {}
        }
        return { data: { user }, error: null }
      } catch (e: any) {
        return { data: null, error: e }
      }
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
      try {
        const res = await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password, options }),
        })
        const { token, user } = res || {}
        if (token) {
          try { localStorage.setItem('checklist-mobile-auth-token', token) } catch {}
        }
        return { data: { user }, error: null }
      } catch (e: any) {
        return { data: null, error: e }
      }
    },
    async signOut() {
      try {
        await request('/auth/signout', { method: 'POST' })
        try { localStorage.removeItem('checklist-mobile-auth-token') } catch {}
        return { error: null }
      } catch (e: any) {
        return { error: e }
      }
    },
    async getSession() {
      try {
        const res = await request('/auth/session', { method: 'GET' })
        return { data: { session: res }, error: null }
      } catch {
        return { data: { session: null }, error: null }
      }
    },
    async resetPasswordForEmail(email: string, options?: any) {
      // Mock implementation since local server doesn't send emails
      console.log('Reset password requested for:', email)
      return { data: {}, error: null }
    },
  }

  return {
    auth,
    from<T = any>(table: string) {
      return new QueryBuilder<T>(table)
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, file: Blob | File | string, opts?: any) {
            try {
              if (!API_URL) throw new Error('API local não configurada')
              const url = `${API_URL}/storage/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
              const headers: Record<string, string> = {}
              const token = getToken()
              if (token) headers['Authorization'] = `Bearer ${token}`

              const res = await fetch(url, {
                method: 'POST',
                headers,
                body: file,
              })

              if (!res.ok) {
                const text = await res.text().catch(() => '')
                return { data: null, error: new Error(text || `HTTP ${res.status}`) }
              }
              const json = await res.json()
              return { data: json, error: null }
            } catch (e: any) {
              return { data: null, error: e }
            }
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `${API_URL}/storage/file/${bucket}/${path}`,
              },
            }
          },
        }
      },
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
