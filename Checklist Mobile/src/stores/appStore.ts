import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createApiClient } from '../utils/apiClient'
import { offlineStorage } from '../utils/offlineStorage'
import { Checklist, RespostaChecklist, Equipamento, Usuario } from '../types/database'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { tanquesData } from '../utils/tankData'

// Initialize API client
const api = createApiClient()

const notify = (detail: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number }) => {
  try {
    window.dispatchEvent(new CustomEvent('app:notify', { detail }))
    // Also trigger native notification for important events
    if (detail.type === 'success' || detail.type === 'error' || detail.type === 'warning') {
       notifyNative(detail.type === 'error' ? 'Erro' : 'Checklist', detail.message)
    }
  } catch {}
}

const notifyNative = async (title: string, body?: string) => {
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now(),
        title,
        body: body || '',
        schedule: { at: new Date(Date.now() + 100) } // 100ms delay
      }]
    })
  } catch (e) {
    console.warn('Native notification failed:', e)
  }
}

const getRole = (email: string): 'admin' | 'tecnico' => {
  return email === 'gutemberggg10@gmail.com' ? 'admin' : 'tecnico'
}

interface AppState {
  // Auth state
  user: Usuario | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Data state
  checklists: Checklist[]
  equipamentos: Equipamento[]
  inspections: any[]
  pendingSync: number
  allowedSections: string[]
  
  // Connection state
  isOnline: boolean
  lastSync: string | null
  syncInProgress: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  loadAccessControls: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>
  
  // Data actions
  loadChecklists: () => Promise<void>
  loadEquipamentos: () => Promise<void>
  loadInspections: () => Promise<void>
  saveChecklistResponse: (response: RespostaChecklist) => Promise<void>
  deleteChecklist: (id: string) => Promise<void>
  deleteInspection: (id: string) => Promise<void>

  // Inventory actions
  saveCalibragem: (payload: any) => Promise<void>
  saveControle3p: (payload: any) => Promise<void>
  loadHistoricoPneus: (filters?: { tipo?: string; frota?: string; data_ini?: string; data_fim?: string }) => Promise<{ calibragem: any[]; c3p: any[] }>
  
  // Sync actions
  syncData: () => Promise<void>
  setOnlineStatus: (online: boolean) => void
  
  // Initialize offline storage
  initializeOfflineStorage: () => Promise<void>
  
  // Debug
  debugLogs: string[]
  addDebugLog: (msg: string) => void
  clearDebugLogs: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      checklists: [],
      equipamentos: [],
      inspections: [],
      pendingSync: 0,
      allowedSections: [],
      isOnline: navigator.onLine,
      lastSync: null,
      syncInProgress: false,
      debugLogs: [],
      
      addDebugLog: (msg: string) => {
        set(state => {
            const logs = state.debugLogs || []
            return { debugLogs: [...logs.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`] }
        })
      },
      clearDebugLogs: () => set({ debugLogs: [] }),

      // Auth actions
      resetPasswordForEmail: async (email: string) => {
        try {
           const { error } = await api.auth.resetPasswordForEmail(email, {
             // Redirecionar para o site web de recuperação
             // Ajuste esta URL para o seu site de produção
             redirectTo: 'https://gutemberggomes.github.io/CheckList/reset-password.html' 
           })
           return { error }
        } catch (err) {
           return { error: err }
        }
      },
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          const { data, error } = await api.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          if (data.user) {
            const mapped: Usuario = {
              id: data.user.id,
              email: data.user.email || '',
              nome: (data.user.user_metadata && (data.user.user_metadata.name || data.user.user_metadata.full_name)) || (data.user.email || 'Usuário'),
              role: getRole(data.user.email || ''),
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            set({
              user: mapped,
              isAuthenticated: true,
              isLoading: false,
            })
            await get().loadEquipamentos()
            await get().loadChecklists()
            await get().loadInspections()
            await get().loadAccessControls()
            return true
          }
          
          set({ isLoading: false })
          return false
        } catch (error) {
          const msg = String((error as any)?.message || error)
          const networkFail = msg.includes('Failed to fetch') || msg.includes('net::ERR_FAILED')
          if (networkFail) {
            const offlineUser: Usuario = {
              id: 'offline-user',
              email: email || 'offline@local',
              nome: (email && (email.split('@')[0] || email)) || 'Usuário',
              role: getRole(email || 'offline@local'),
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            set({
              user: offlineUser,
              isAuthenticated: true,
              isLoading: false,
            })
            notify({ message: 'Servidor indisponível. Entrando em modo offline.', type: 'warning' })
            try {
              await get().loadEquipamentos()
              await get().loadChecklists()
              await get().loadInspections()
              await get().loadAccessControls()
            } catch {}
            return true
          }
          console.error('Login error:', error)
          set({ isLoading: false })
          notify({ message: 'Falha na autenticação. Verifique suas credenciais.', type: 'error' })
          return false
        }
      },

      signUp: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          const { data, error } = await api.auth.signUp({
            email,
            password,
          })

          if (error) throw error

          if (data.user) {
            const mapped: Usuario = {
              id: data.user.id,
              email: data.user.email || '',
              nome: (data.user.user_metadata && (data.user.user_metadata.name || data.user.user_metadata.full_name)) || (data.user.email || 'Usuário'),
              role: getRole(data.user.email || ''),
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            
            set({ 
              user: mapped,
              isAuthenticated: true,
              isLoading: false 
            })

            notify({ message: 'Cadastro realizado com sucesso! Bem-vindo.', type: 'success' })
            
            await get().loadEquipamentos()
            await get().loadChecklists()
            await get().loadInspections()
            await get().loadAccessControls()
            
            return true
          }
          return false
        } catch (error: any) {
          console.error('Signup error:', error)
          set({ isLoading: false })
          notify({ message: error.message || 'Falha no cadastro.', type: 'error' })
          return false
        }
      },

      logout: async () => {
        try {
          await api.auth.signOut()
          set({
            user: null,
            isAuthenticated: false,
            checklists: [],
            equipamentos: [],
          })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      checkAuth: async () => {
        try {
          const { data: { session }, error } = await api.auth.getSession()
          
          if (error) throw error

          if (session?.user) {
            const mapped: Usuario = {
              id: session.user.id,
              email: session.user.email || '',
              nome: (session.user.user_metadata && (session.user.user_metadata.name || session.user.user_metadata.full_name)) || (session.user.email || 'Usuário'),
              role: getRole(session.user.email || ''),
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            set({
              user: mapped,
              isAuthenticated: true,
            })
            // Load data sequentially to ensure enrichment works
            // First load base data (equipments, checklists, access), then inspections
            Promise.allSettled([
                get().loadEquipamentos(),
                get().loadChecklists(),
                get().loadAccessControls()
            ]).then(() => {
                return get().loadInspections()
            })
          } else {
            // No session, ensure logout
            if (get().isAuthenticated) {
               set({ isAuthenticated: false, user: null })
            }
          }
        } catch (error: any) {
          console.error('Auth check error:', error)
          // Handle invalid session/refresh token
          const msg = error?.message || String(error)
          if (msg.includes('Invalid Refresh Token') || msg.includes('invalid_grant') || msg.includes('not found')) {
             set({ isAuthenticated: false, user: null })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      // Data actions
      loadChecklists: async () => {
        try {
          await offlineStorage.init()
          const list = await offlineStorage.getChecklists()
          set({ checklists: list })
        } catch (error) {
          console.error('Load checklists error:', error)
          set({ checklists: [] })
        }
      },

      loadInspections: async () => {
        const addLog = get().addDebugLog
        console.log('App Version: v3.8-fix-race-condition')
        addLog('[DEBUG] Iniciando loadInspections v3.8')
        
        const safeErr = (e: any) => {
            if (e instanceof Error) return e.message + (e.stack ? ' ' + e.stack.split('\n')[1] : '')
            if (typeof e === 'object') {
                try { return JSON.stringify(e) } catch { return String(e) }
            }
            return String(e)
        }

        let cached: any[] = []
        let fresh: any[] = []
        let pendingInspections: any[] = []

        try {
          // 1. Load cache first for immediate display
          try {
            cached = await offlineStorage.getInspectionsCache() || []
            if (Array.isArray(cached) && cached.length) {
              addLog(`[DEBUG] Cache local carregado: ${cached.length} itens`)
              set({ inspections: cached })
            } else {
              addLog('[DEBUG] Cache local vazio ou inválido')
            }
          } catch (e: any) {
             addLog(`[DEBUG] Erro ao ler cache: ${safeErr(e)}`)
          }

          // 2. Fetch fresh data from server (both tables)
          addLog('[DEBUG] Buscando dados do servidor...')
          let data1: any[] = []
          let data2: any[] = []
          let serverSuccess = false
          
          try {
              // API returns { data: [], error: null }
              // Use Promise.allSettled to avoid one failure breaking everything
              const results = await Promise.allSettled([
                 api.from('inspections').select('*').order('created_at', { ascending: false }),
                 api.from('respostas_checklist').select('*').order('created_at', { ascending: false })
              ])
              
              const res1 = results[0].status === 'fulfilled' ? results[0].value : { data: [], error: results[0].reason }
              const res2 = results[1].status === 'fulfilled' ? results[1].value : { data: [], error: results[1].reason }

              if (res1.error) addLog(`[DEBUG] Erro API Inspections: ${safeErr(res1.error)}`)
              if (res2.error) addLog(`[DEBUG] Erro API Respostas: ${safeErr(res2.error)}`)
              
              data1 = (res1 && res1.data && Array.isArray(res1.data)) ? res1.data : []
              data2 = (res2 && res2.data && Array.isArray(res2.data)) ? res2.data : []
              
              addLog(`[DEBUG] Retorno servidor: ${data1.length} inspections, ${data2.length} respostas`)
              
              // RELAXED SUCCESS CHECK: If we got inspections (res1), we show them even if answers (res2) failed
              if (!res1.error && results[0].status === 'fulfilled') {
                  serverSuccess = true
                  if (res2.error) {
                      addLog(`[WARN] Falha ao carregar respostas (detalhes), mas mostrando inspeções: ${safeErr(res2.error)}`)
                  }
              } else {
                  serverSuccess = false
                  addLog('[DEBUG] Erro na comunicação com servidor (inspeções falharam).')
              }
              
          } catch (e: any) {
              addLog(`[DEBUG] Erro crítico API: ${safeErr(e)}`)
              serverSuccess = false
          }

          // 3. Merge remote data or fallback to cache
          if (serverSuccess) {
              try {
                  const data1Ids = new Set(data1.map((i:any) => i.id))
                  const data1LocalIds = new Set(data1.map((i:any) => i.local_id).filter(Boolean))
                  
                  const uniqueData2 = data2.filter((i:any) => !data1Ids.has(i.id) && !data1LocalIds.has(i.id))
                  fresh = [...data1, ...uniqueData2]
                  
                  // Update cache with fresh data
                  offlineStorage.replaceInspectionsCache(fresh).catch(err => addLog(`[DEBUG] Erro salvar cache: ${safeErr(err)}`))
                  
              } catch (e: any) {
                  addLog(`[DEBUG] Erro merge remote: ${safeErr(e)}`)
                  fresh = cached // Fallback if merge fails
              }
          } else {
              addLog('[DEBUG] Falha no servidor. Mantendo cache local.')
              fresh = cached
          }

          // 4. Enrich data
          try {
              const equipamentos = get().equipamentos || []
              const checklists = get().checklists || []
              // Ensure arrays
              const safeEquipamentos = Array.isArray(equipamentos) ? equipamentos : []
              const safeChecklists = Array.isArray(checklists) ? checklists : []
              
              const eqMap = new Map(safeEquipamentos.map(e => [e.id, e]))
              const eqCodeMap = new Map(safeEquipamentos.map(e => [e.codigo, e]))
              const clMap = new Map(safeChecklists.map(c => [c.id, c]))

              fresh = fresh.map((item: any) => {
                 try {
                     // Basic enrichment logic
                     let frotaNome = item.frota || item.equipamento_id
                     const eq = eqMap.get(item.equipamento_id) || eqCodeMap.get(item.frota)
                     if (eq) frotaNome = eq.codigo
                     
                     let tipo = item.tipo
                     if (!tipo && item.checklist_id) {
                         const cl = clMap.get(item.checklist_id)
                         if (cl) tipo = cl.tipo
                     }
                     if (!tipo) tipo = 'Checklist'

                     let percentage = 0
                     let results = item.results || { ok: 0, notOk: 0, percentage: 0 }
                     
                     // Calculate results if missing (for legacy items)
                     if (item.results?.percentage === undefined && Array.isArray(item.respostas)) {
                        const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
                        const statuses = item.respostas.map((r: any) => {
                           const val = r.valor
                           const n = normalize(val)
                           if (n === 'ok' || n === 'aprovado' || n === 'true' || n === 'sim' || n === 'conforme' || n === 'bom') return 'ok'
                           if (n.includes('nao') || n === 'reprovado' || n === 'false' || n === 'ruim') return 'notok'
                           if (n.includes('nao aplica') || n === 'na' || n === 'n/a') return 'na'
                           return null
                        }).filter((s:any) => s !== null)
                        
                        const ok = statuses.filter((s:any) => s === 'ok').length
                        const notOk = statuses.filter((s:any) => s === 'notok').length
                        const total = statuses.filter((s:any) => s !== 'na').length
                        percentage = total ? Math.round((ok / total) * 100) : 0
                        results = { ok, notOk, percentage }
                     }

                     return {
                       ...item,
                       frota: frotaNome,
                       tipo,
                       results,
                       created_at: item.created_at || item.data_execucao
                     }
                 } catch (e) {
                     return item // Return raw item if enrichment fails
                 }
              })
              addLog(`[DEBUG] Itens enriquecidos: ${fresh.length}`)
          } catch (e: any) {
               addLog(`[DEBUG] Erro enrichment: ${safeErr(e)}`)
          }

          // 5. Merge with local pending items (source of truth for unsynced)
          let pending: any[] = []
          try {
             pending = await offlineStorage.getRespostasPendentes() || []
             addLog(`[DEBUG] Pendentes locais brutos: ${pending.length}`)
          } catch (e) {
             addLog(`[DEBUG] Erro ao ler pendentes: ${safeErr(e)}`)
          }
          
          // Map pending to inspection format
          for (const r of pending) {
             try {
                 const checklist = await offlineStorage.getChecklistById(r.checklist_id)
                 pendingInspections.push({
                   id: r.id,
                   local_id: r.id,
                   frota: r.equipamento_id, // simplified
                   tipo: checklist?.tipo || 'Checklist',
                   created_at: r.created_at || r.data_execucao || new Date().toISOString(),
                   results: { percentage: 0 }, // will be calculated in UI or needs logic here
                   pending: true
                 })
             } catch (e) {
                addLog(`[DEBUG] Erro ao processar pendente ${r.id}: ${safeErr(e)}`)
             }
          }

          addLog(`[DEBUG] Pendentes processados: ${pendingInspections.length}`)

          // 6. Merge Final: Fresh (Server) + Pending (Local)
          let merged: any[] = []
          try {
              const freshIds = new Set(fresh.map((i:any) => i.id))
              const freshLocalIds = new Set(fresh.map((i:any) => i.local_id).filter(Boolean))
              
              const uniquePending = pendingInspections.filter(p => !freshIds.has(p.id) && !freshLocalIds.has(p.local_id))
              
              merged = [...uniquePending, ...fresh].sort((a:any,b:any)=> {
                 const tA = new Date(a.created_at || a.data || 0).getTime()
                 const tB = new Date(b.created_at || b.data || 0).getTime()
                 return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA)
              })

              addLog(`[DEBUG] Total final: ${merged.length}`)
              set({ inspections: merged })
              if (merged.length > 0) {
                 get().notify({ message: `Dados carregados: ${merged.length} registros`, type: 'success' })
              }
          } catch (e: any) {
              addLog(`[DEBUG] Erro merge final: ${safeErr(e)}`)
              // If merge fails, try to show at least something
              if (fresh.length > 0) set({ inspections: fresh })
              else if (cached.length > 0) set({ inspections: cached })
          }
          
          try {
            if (merged.length > 0) {
                await offlineStorage.replaceInspectionsCache(merged)
            }
          } catch (e: any) {
             addLog(`[DEBUG] Erro ao salvar cache final: ${safeErr(e)}`)
          }

        } catch (error: any) {
          console.error('Load inspections error:', error)
          addLog(`[DEBUG] FATAL loadInspections: ${safeErr(error)}`)
          get().notify({ message: 'Erro ao carregar dados. Verifique sua conexão.', type: 'error' })
          
          // Fallback to cache if everything fails
          if (cached.length > 0) {
             addLog(`[DEBUG] Usando fallback cache (FATAL): ${cached.length}`)
             set({ inspections: cached })
          } else {
             set({ inspections: [] })
          }
        }
      },

      loadAccessControls: async () => {
        try {
          const email = get().user?.email
          if (!email) { set({ allowedSections: [] }); return }
          const { data, error } = await api
            .from('access_controls')
            .select('allowed_sections')
            .eq('email', email)
            .limit(1)
          if (error) throw error
          const row = Array.isArray(data) && data.length ? data[0] : null
          const allowed = Array.isArray(row?.allowed_sections) ? row!.allowed_sections : []
          set({ allowedSections: allowed })
        } catch (e) {
          console.error('Load access_controls error:', e)
          set({ allowedSections: [] })
        }
      },

      loadEquipamentos: async () => {
        try {
          await offlineStorage.init()

          // Prepare fallback tanks
          const fallbackTanks = tanquesData.map((t) => ({
            id: `local-tank-${t.frota}`,
            codigo: t.frota,
            tipo: 'tanques',
            descricao: t.descricao,
            ativo: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })) as Equipamento[]

          const mergeEquipments = (base: Equipamento[], extra: Equipamento[]) => {
            const map = new Map(base.map(i => [i.codigo, i]))
            extra.forEach(i => {
              if (!map.has(i.codigo)) map.set(i.codigo, i)
            })
            return Array.from(map.values())
          }

          // Tenta tabela original do site: 'equipments'
          const { data: eq1, error: err1 } = await api
            .from('equipments')
            .select('*')
            .order('frota', { ascending: true })

          if (!err1 && Array.isArray(eq1) && eq1.length > 0) {
            const mapped: Equipamento[] = (eq1 as any[]).map((row) => ({
              id: String(row.id),
              codigo: String(row.frota ?? ''),
              tipo: String(row.tipo === 'irrigacao_tanques' ? 'tanques' : (row.tipo ?? '')),
              descricao: row.descricao ?? undefined,
              localizacao: undefined,
              qr_code_data: undefined,
              ativo: String(row.status ?? '').toLowerCase() === 'ativo',
              ultima_manutencao: undefined,
              created_at: row.created_at ?? new Date().toISOString(),
              updated_at: row.created_at ?? new Date().toISOString(),
            }))

            const final = mergeEquipments(mapped, fallbackTanks)
            set({ equipamentos: final })
            await offlineStorage.replaceEquipamentos(final)
            return
          }
          
          // Tenta tabela 'equipamentos' (Português - Migration 001)
          const { data: eqPt, error: errPt } = await api
            .from('equipamentos')
            .select('*')
            .order('codigo', { ascending: true }) // codigo é o equivalente a frota
            
          if (!errPt && Array.isArray(eqPt) && eqPt.length > 0) {
             const mapped: Equipamento[] = (eqPt as any[]).map((row) => ({
              id: String(row.id),
              codigo: String(row.codigo ?? ''),
              tipo: String(row.tipo === 'irrigacao_tanques' ? 'tanques' : (row.tipo ?? '')),
              descricao: row.descricao ?? undefined,
              localizacao: row.localizacao ?? undefined,
              qr_code_data: row.qr_code_data ?? undefined,
              ativo: Boolean(row.ativo),
              ultima_manutencao: row.ultima_manutencao ?? undefined,
              created_at: row.created_at ?? new Date().toISOString(),
              updated_at: row.updated_at ?? new Date().toISOString(),
            }))
            
            const final = mergeEquipments(mapped, fallbackTanks)
            set({ equipamentos: final })
            await offlineStorage.replaceEquipamentos(final)
            return
          }

          const { data: eqAlt, error: errAlt } = await api
            .from('irrig_equipments')
            .select('*')
            .order('frota', { ascending: true })

          if (!errAlt && Array.isArray(eqAlt)) {
            const mapped: Equipamento[] = (eqAlt as any[]).map((row) => ({
              id: String(row.id),
              codigo: String(row.frota ?? ''),
              tipo: String(row.tipo ?? ''),
              descricao: row.descricao ?? undefined,
              localizacao: undefined,
              qr_code_data: undefined,
              ativo: String(row.status ?? '').toLowerCase() === 'ativo',
              ultima_manutencao: undefined,
              created_at: row.created_at ?? new Date().toISOString(),
              updated_at: row.created_at ?? new Date().toISOString(),
            }))
            const final = mergeEquipments(mapped, fallbackTanks)
            set({ equipamentos: final })
            await offlineStorage.replaceEquipamentos(final)
            return
          }

          // Fallback offline
          const equipamentosOffline = await offlineStorage.getEquipamentos()
          const final = mergeEquipments(equipamentosOffline || [], fallbackTanks)
          set({ equipamentos: final })
        } catch (error) {
          console.error('Load equipamentos error:', error)
          // Retry simples para erros de fetch abortado
          const msg = String((error as any)?.message || error)
          if (msg.includes('Failed to fetch') || msg.includes('net::ERR_ABORTED')) {
            try {
              await new Promise((r) => setTimeout(r, 600))
              await offlineStorage.init()
              const { data: eq2, error: err2 } = await api
                .from('equipments')
                .select('*')
                .order('frota', { ascending: true })
              if (!err2 && Array.isArray(eq2)) {
                const mapped: Equipamento[] = (eq2 as any[]).map((row) => ({
                id: String(row.id),
                codigo: String(row.frota ?? ''),
                tipo: String(row.tipo ?? ''),
                descricao: row.descricao ?? undefined,
                localizacao: undefined,
                qr_code_data: undefined,
                ativo: String(row.status ?? '').toLowerCase() === 'ativo',
                ultima_manutencao: undefined,
                created_at: row.created_at ?? new Date().toISOString(),
                updated_at: row.created_at ?? new Date().toISOString(),
              }))
                set({ equipamentos: mapped })
                await offlineStorage.replaceEquipamentos(mapped)
                return
              }
              const { data: eq3, error: err3 } = await api
                .from('irrig_equipments')
                .select('*')
                .order('frota', { ascending: true })
              if (!err3 && Array.isArray(eq3)) {
                const mapped: Equipamento[] = (eq3 as any[]).map((row) => ({
                  id: String(row.id),
                  codigo: String(row.frota ?? ''),
                  tipo: String(row.tipo === 'irrigacao_tanques' ? 'tanques' : (row.tipo ?? '')),
                  descricao: row.descricao ?? undefined,
                  localizacao: undefined,
                  qr_code_data: undefined,
                  ativo: String(row.status ?? '').toLowerCase() === 'ativo',
                  ultima_manutencao: undefined,
                  created_at: row.created_at ?? new Date().toISOString(),
                  updated_at: row.created_at ?? new Date().toISOString(),
                }))
                set({ equipamentos: mapped })
                await offlineStorage.replaceEquipamentos(mapped)
                return
              }
            } catch {}
          }
          try {
            const equipamentos = await offlineStorage.getEquipamentos()
            set({ equipamentos })
          } catch (offlineError) {
            console.error('Offline fallback error:', offlineError)
          }
        }
      },

      saveChecklistResponse: async (response: RespostaChecklist) => {
        try {
          const normalizedResponse: RespostaChecklist = {
            ...response,
            id: response.id || crypto.randomUUID(),
            created_at: response.created_at || new Date().toISOString(),
            sincronizado: typeof response.sincronizado === 'boolean' ? response.sincronizado : false,
          }
          const toBlob = (dataUrl: string) => {
            const arr = dataUrl.split(',')
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
            const bstr = atob(arr[1])
            let n = bstr.length
            const u8arr = new Uint8Array(n)
            while (n--) u8arr[n] = bstr.charCodeAt(n)
            return new Blob([u8arr], { type: mime })
          }
          // Determine tipo for duplicate window check
          let tipoPayload = 'preventiva'
          try {
            const checklist = await offlineStorage.getChecklistById(normalizedResponse.checklist_id)
            if (checklist && typeof checklist.tipo === 'string' && checklist.tipo.length) {
              tipoPayload = checklist.tipo
            }
          } catch {}

          // 30-minute duplicate prevention (server-side)
          const now = Date.now()
          const windowMs = 30 * 60 * 1000
          const sinceIso = new Date(now - windowMs).toISOString()
          const onlineDuplicateCheck = async () => {
            try {
              const { data, error } = await api
                .from('inspections')
                .select('id')
                .eq('tipo', tipoPayload)
                .eq('frota', response.equipamento_id)
                .gte('created_at', sinceIso)
                .limit(1)
              if (!error && Array.isArray(data) && data.length > 0) {
                throw new Error('Checklist já lançado para esta frota nos últimos 30 minutos')
              }
            } catch (e) {
              if ((e as any).message?.includes('Checklist já lançado')) throw e
            }
          }

          // 30-minute duplicate prevention (offline cache)
          const offlineDup = async () => {
            try {
              const prev = await offlineStorage.getRespostasByChecklistId(response.checklist_id)
              const cutoff = now - windowMs
              const recentSameFrota = (prev || []).some((r:any) => r.equipamento_id === response.equipamento_id && new Date(r.created_at).getTime() >= cutoff)
              if (recentSameFrota) throw new Error('Checklist já lançado para esta frota nos últimos 30 minutos')
            } catch {}
          }

          if (navigator.onLine) { await onlineDuplicateCheck() } else { await offlineDup() }

          // If there are fotos em dataURL na resposta, faça upload e substitua por URL pública
          try {
            const checklist = await offlineStorage.getChecklistById(normalizedResponse.checklist_id)
            const fotoItems = (checklist?.itens || []).filter((it:any)=> it.tipo === 'foto')
            const timestamp = Date.now()
            const uploadPromises = fotoItems.map(async (it: any) => {
              const val = (normalizedResponse.respostas || []).find((r:any)=> r.item_id === it.id)?.valor
              if (typeof val === 'string' && val.startsWith('data:')) {
                const blob = toBlob(val)
                const path = `photos/${normalizedResponse.id}/${it.id}-${timestamp}.jpg`
                const up = await api.storage.from('app').upload(path, blob, { upsert: true })
                if (!up.error) {
                  const publicUrl = `${api.storage.from('app').getPublicUrl(path).data.publicUrl}`
                  // persist foto separadamente
                  await offlineStorage.saveFoto({ id: `${normalizedResponse.id}-${it.id}-${timestamp}`, resposta_id: normalizedResponse.id, url: publicUrl, created_at: new Date().toISOString() } as any)
                  // também atualiza valor no array
                  const target = (normalizedResponse.respostas || []).find((r:any)=> r.item_id === it.id)
                  if (target) target.valor = publicUrl
                }
              }
            })
            await Promise.all(uploadPromises)
          } catch (e) {
            console.error('Upload de fotos falhou:', e)
          }

          // Save to offline storage
          notify({ message: 'Lançamento em andamento...', type: 'info' })
          notifyNative('Lançamento em andamento', 'Processando dados')
          await offlineStorage.saveResposta(normalizedResponse)
          
          // Update pending sync count
          const updatePendingCount = async () => {
             const pendentes = await offlineStorage.getRespostasPendentes()
             const queue = await offlineStorage.getSyncQueue()
             const uniqueQueue = queue.filter((q:any) => {
               if (q.table === 'respostas_checklist' && q.data?.id) {
                 return !pendentes.some((p:any) => p.id === q.data.id)
               }
               return true
             })
             set({ pendingSync: (pendentes?.length || 0) + (uniqueQueue?.length || 0) })
          }
          await updatePendingCount()

          // Try to sync immediately if online
          const tryImmediateSync = async () => {
            try {
              const currentUser = get().user
              if (!currentUser || currentUser.id.startsWith('offline')) {
                notify({ message: 'Modo offline. Salvo localmente.', type: 'warning' })
                return
              }

              notify({ message: 'Sincronizando lançamento...', type: 'info' })
              notifyNative('Sincronizando lançamento', 'Enviando para o servidor')
              // Build items in web schema { id, name, section, status, note }
              let itemsResult: any[] = []
              try {
                const checklist = await offlineStorage.getChecklistById(normalizedResponse.checklist_id)
                const itens = (checklist?.itens || [])
                itemsResult = itens.map((it: any) => {
                  const raw = String(it.descricao || '')
                  const parts = raw.split(' • ')
                  const section = parts.length > 1 ? parts[0] : 'Geral'
                  const name = parts.length > 1 ? parts.slice(1).join(' • ') : raw
                  const val = (normalizedResponse.respostas || []).find((r:any)=> r.item_id === it.id)?.valor
                  const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
                  let status: 'ok' | 'notok' | 'na' = 'na'
                  if (it.tipo === 'booleano' || it.tipo === 'opcoes') {
                    const n = normalize(val)
                    if (n === 'ok' || n === 'aprovado' || n === 'true' || n === 'sim' || n === 'conforme' || n === 'bom' || n === 'boa') status = 'ok'
                    else if (n.includes('nao ok') || n.includes('nao') || n.includes('não ok') || n === 'reprovado' || n === 'false' || n === 'ruim' || n === 'critico' || n === 'quebrado') status = 'notok'
                    else if (n.includes('nao aplica') || n.includes('não aplica') || n === 'na' || n === 'n/a' || n === 'nao se aplica') status = 'na'
                  }
                  const note = typeof val === 'string' ? val : (val === true ? 'OK' : (val === false ? 'Não OK' : String(val ?? '')))
                  return { id: it.id, name, section, status, note }
                })
                if (normalizedResponse.observacoes) {
                  itemsResult.push({ id: 'observacao', name: 'Observação', section: 'Geral', status: 'na', note: normalizedResponse.observacoes })
                }
                try {
                  const fotos = await offlineStorage.getFotosByRespostaId(normalizedResponse.id)
                  const urls = (fotos || []).map((f:any)=> f.url).filter(Boolean)
                  if (urls.length) {
                    itemsResult.push({ id: 'fotos', name: 'Fotos', section: 'Geral', status: 'na', note: '', photos: urls })
                  }
                } catch {}
              } catch {}
              const ok_count = itemsResult.filter((x:any)=> x.status === 'ok').length
              const nao_ok_count = itemsResult.filter((x:any)=> x.status === 'notok').length
              const total = ok_count + nao_ok_count
              const nivel = total ? Math.round((ok_count / total) * 100) : 0
              const nomeRaw = (get().user?.nome || get().user?.email || 'Tecnico')
              const mecanicoNome = nomeRaw.includes('@') ? nomeRaw.split('@')[0] : nomeRaw
              const payload = {
                data: new Date(normalizedResponse.data_execucao).toISOString().slice(0, 10),
                tipo: tipoPayload,
                frota: normalizedResponse.equipamento_id,
                items: itemsResult,
                results: { ok: ok_count, notOk: nao_ok_count, percentage: nivel },
                user_id: currentUser?.id || normalizedResponse.usuario_id,
                observacao: normalizedResponse.observacoes ?? null,
                mecanico: mecanicoNome,
                local_id: normalizedResponse.id,
                id: normalizedResponse.id,
                // created_at removed to avoid conflict
              }
              const retry = async (fn: ()=>Promise<any>, attempts=3) => {
                let lastErr
                for (let i=0;i<attempts;i++) {
                  const res = await fn().catch(e=>{ lastErr = e; return { error: e } })
                  if (!res?.error) return res
                  await new Promise(r=>setTimeout(r, 500 * Math.pow(2,i)))
                }
                return { error: lastErr || new Error('Upsert failed') }
              }
              const upsertCall = () => api.from('inspections').upsert(payload, { onConflict: 'id' })
              const { error, data: upsertData } = await retry(upsertCall)
              if (!error) {
                await offlineStorage.saveResposta({ ...normalizedResponse, sincronizado: true }, true)
                
                // Cleanup queue item to prevent double count later
                try {
                  const q = await offlineStorage.getSyncQueue()
                  const qItem = q.find((x:any) => x.table === 'respostas_checklist' && x.data?.id === normalizedResponse.id)
                  if (qItem) {
                    await offlineStorage.markAsSynced(qItem.id)
                  }
                } catch {}

                await updatePendingCount()
                
                // Optimistic Update: Add to local state immediately so it doesn't "disappear"
                const serverItem = (upsertData && Array.isArray(upsertData) && upsertData[0]) ? upsertData[0] : null
                const finalItem = serverItem ? { ...serverItem, ...payload, id: serverItem.id } : payload
                
                // Ensure results/frota/tipo are present for UI
                if (!finalItem.results) finalItem.results = payload.results
                if (!finalItem.frota) finalItem.frota = payload.frota // name might need mapping but payload has ID usually
                
                // Update Cache
                try { await offlineStorage.upsertInspectionCache(finalItem) } catch {}
                
                // Update State
                const currentInspections = get().inspections
                const nextInspections = [finalItem, ...currentInspections.filter((i:any) => i.local_id !== payload.local_id)]
                set({ inspections: nextInspections })

                notify({ message: 'Lançamento sincronizado', type: 'success' })
                notifyNative('Lançamento sincronizado', 'Dados enviados com sucesso')
              } else {
                console.error('Immediate sync error:', error)
                notify({ message: 'Falha ao sincronizar. Tentará novamente.', type: 'warning' })
                notifyNative('Falha ao sincronizar', 'Tentaremos novamente')
              }
            } catch (e) {
              console.error('Immediate sync network error:', e)
              notify({ message: 'Sem conexão. Lançamento salvo offline.', type: 'warning' })
              notifyNative('Sem conexão', 'Lançamento salvo offline')
            }
          }

          await tryImmediateSync()
          // Only schedule sync when offline; online immediate upsert above handles sync
          if (!get().isOnline) {
            notify({ message: 'Sem internet. Pendentes serão sincronizados ao conectar.', type: 'info' })
            notifyNative('Sem internet', 'Pendentes serão sincronizados ao conectar')
            await get().syncData()
          }
        } catch (error) {
          console.error('Save checklist response error:', error)
          notify({ message: 'Erro no lançamento', type: 'error' })
          notifyNative('Erro no lançamento', 'Verifique e tente novamente')
          throw error
        }
      },

      deleteChecklist: async (id: string) => {
        try {
          await offlineStorage.init()
          await offlineStorage.deleteRespostasByChecklistId(id)
          await offlineStorage.deleteChecklist(id)
          const list = await offlineStorage.getChecklists()
          set({ checklists: list })
        } catch (error) {
          console.error('Delete checklist error:', error)
        }
      },

      deleteInspection: async (id: string) => {
        try {
           const currentUser = get().user
           
           if (currentUser?.role !== 'admin') {
              get().notify({ message: 'Permissão negada: Apenas administradores podem excluir.', type: 'error' })
              return
           }

           const isOfflineUser = currentUser?.id?.startsWith('offline')
           
           // 1. Delete from local storage (cache and pending)
           await offlineStorage.init()
           await offlineStorage.deleteInspectionCache(id)
           await offlineStorage.deleteResposta(id)
           
           // 2. Delete from Server if online and authorized
           if (get().isOnline && !isOfflineUser) {
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
              
              if (isUuid) {
                 // Try deleting from 'inspections' table
                 const { error: err1 } = await api.from('inspections').delete().eq('id', id)
                 if (err1) {
                   console.error('Remote delete error (inspections):', err1)
                   
                   // Fallback: Try deleting from 'respostas_checklist' table (legacy/original)
                   const { error: err2 } = await api.from('respostas_checklist').delete().eq('id', id)
                   if (err2) {
                     // Enqueue for retry if it was a network error or similar
                     // But strictly, if we are online and it failed, maybe we should queue it?
                     // For now, let's rely on the offline branch for explicit offline mode.
                     console.error('Remote delete error (respostas_checklist):', err2)
                     throw new Error('Falha ao excluir no servidor: ' + (err1.message || err2.message))
                   }
                 }
              } else {
                 console.warn('Cannot delete remote item with non-UUID id:', id)
              }
           } else {
             // Offline: Enqueue delete
             await offlineStorage.enqueue('inspections', { id }, 'delete')
             notify({ message: 'Exclusão pendente (offline)', type: 'info' })
           }
           
           // 3. Update local state
           const current = get().inspections
           const next = current.filter((i:any) => (i.local_id !== id && i.id !== id))
           set({ inspections: next })
           
           // 4. Update pending count
           const pendentes = await offlineStorage.getRespostasPendentes()
           const queue = await offlineStorage.getSyncQueue()
           const uniqueQueue = queue.filter((q:any) => {
             if (q.table === 'respostas_checklist' && q.data?.id) {
               return !pendentes.some((p:any) => p.id === q.data.id)
             }
             return true
           })
           set({ pendingSync: (pendentes?.length || 0) + (uniqueQueue?.length || 0) })
           
           notify({ message: 'Inspeção excluída', type: 'success' })
        } catch (e: any) {
           console.error('Delete inspection error:', e)
           notify({ message: `Erro ao excluir: ${e.message || 'Erro desconhecido'}`, type: 'error' })
        }
      },

      saveCalibragem: async (record: any) => {
        try {
          const { error } = await api.from('calibragem').upsert([record], { onConflict: 'local_id' })
          if (error) throw error
          notify({ message: 'Calibragem lançada', type: 'success' })
          notifyNative('Calibragem lançada', 'Dados enviados')
        } catch (e) {
          console.error('Save calibragem error:', e)
          try { await offlineStorage.enqueue('calibragem', { ...record, offline: true }) } catch {}
          notify({ message: 'Sem internet. Calibragem salva offline.', type: 'warning' })
          notifyNative('Sem internet', 'Calibragem salva offline')
        }
      },

      saveControle3p: async (record: any) => {
        try {
          const { error } = await api.from('controle_3p').upsert([record], { onConflict: 'local_id' })
          if (error) throw error
          notify({ message: 'Controle 3P lançado', type: 'success' })
          notifyNative('Controle 3P lançado', 'Dados enviados')
        } catch (e) {
          console.error('Save controle_3p error:', e)
          try { await offlineStorage.enqueue('controle_3p', { ...record, offline: true }) } catch {}
          notify({ message: 'Sem internet. Controle 3P salvo offline.', type: 'warning' })
          notifyNative('Sem internet', 'Controle 3P salvo offline')
        }
      },

      loadHistoricoPneus: async (filters) => {
        try {
          let queryCal: any = api.from('calibragem').select('*').order('created_at', { ascending: false }).limit(100)
          let queryC3p: any = api.from('controle_3p').select('*').order('created_at', { ascending: false }).limit(100)
          if (filters?.frota) {
            queryCal = queryCal.contains('header', { frota: filters.frota })
            queryC3p = queryC3p.contains('header', { frota: filters.frota })
          }
          const [cal, c3p] = await Promise.all([queryCal, queryC3p])
          return { calibragem: Array.isArray(cal.data) ? cal.data : [], c3p: Array.isArray(c3p.data) ? c3p.data : [] }
        } catch (e) {
          console.error('Load historico pneus error:', e)
          return { calibragem: [], c3p: [] }
        }
      },

      // Sync actions
      syncData: async () => {
        const currentUser = get().user
        if (get().syncInProgress || !get().isOnline) return
        
        // Allow sync if we have a token, even if currentUser is "offline" (e.g. app started offline)
        const token = localStorage.getItem('checklist-mobile-auth-token')
        if (!token && (!currentUser || currentUser.id.startsWith('offline'))) return

        set({ syncInProgress: true })
        
        try {
          const pendentes = await offlineStorage.getRespostasPendentes()
          const queue = await offlineStorage.getSyncQueue()
          
          // Deduplicate: Don't count queue items that are already in pendentes
          const uniqueQueue = queue.filter(q => {
            if (q.table === 'respostas_checklist' && q.data?.id) {
              return !pendentes.some(p => p.id === q.data.id)
            }
            return true
          })
          
          const totalPend = (pendentes?.length || 0) + (uniqueQueue?.length || 0)
          if (totalPend > 0) {
            notify({ message: `Sincronizando pendentes (${totalPend})`, type: 'info' })
            notifyNative('Sincronizando pendentes', `Itens: ${totalPend}`)
          }

          // Helper to convert Base64 to Blob
          const toBlob = (dataUrl: string) => {
            const arr = dataUrl.split(',')
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
            const bstr = atob(arr[1])
            let n = bstr.length
            const u8arr = new Uint8Array(n)
            while (n--) u8arr[n] = bstr.charCodeAt(n)
            return new Blob([u8arr], { type: mime })
          }

          // Cleanup stale sync_queue items for respostas_checklist
          if (Array.isArray(queue)) {
            const pendenteIds = new Set(pendentes.map((p: any) => p.id))
            const staleQueueItems = queue.filter((q: any) => 
              q.table === 'respostas_checklist' && 
              q.data?.id && 
              !pendenteIds.has(q.data.id)
            )
            for (const q of staleQueueItems) {
               try { await offlineStorage.markAsSynced(q.id) } catch {}
            }
          }
          
          if (pendentes.length > 0) {
            // Cache checklist definitions to avoid repeated DB calls
            const checklistCache = new Map<string, Checklist>()

            // Sync responses to legacy 'inspections'
            for (const resposta of pendentes) {
              try {
                // 1. Check for Base64 photos and upload them first
                let photosUpdated = false
                const timestamp = Date.now()
                
                // Identify items that are photos
                let checklist = checklistCache.get(resposta.checklist_id)
                if (!checklist) {
                  try {
                    const c = await offlineStorage.getChecklistById(resposta.checklist_id)
                    if (c) {
                      checklist = c
                      checklistCache.set(resposta.checklist_id, c)
                    }
                  } catch {}
                }

                if (checklist && Array.isArray(checklist.itens)) {
                   const fotoItems = checklist.itens.filter((it:any)=> it.tipo === 'foto')
                   
                   // Parallel upload
                   const uploadPromises = fotoItems.map(async (it: any) => {
                      const target = (resposta.respostas || []).find((r:any)=> r.item_id === it.id)
                      const val = target?.valor
                      
                      if (typeof val === 'string' && val.startsWith('data:')) {
                        try {
                          const blob = toBlob(val)
                          const path = `photos/${resposta.id}/${it.id}-${timestamp}.jpg`
                          const { error: upError } = await api.storage.from('app').upload(path, blob, { upsert: true })
                          
                          if (!upError) {
                            const publicUrl = api.storage.from('app').getPublicUrl(path).data.publicUrl
                            
                            // Save foto entry
                            await offlineStorage.saveFoto({ 
                              id: `${resposta.id}-${it.id}-${timestamp}`, 
                              resposta_id: resposta.id, 
                              url: publicUrl, 
                              created_at: new Date().toISOString() 
                            } as any)

                            // Update response value
                            if (target) {
                              target.valor = publicUrl
                              photosUpdated = true
                            }
                          }
                        } catch (photoErr) {
                          console.error('Failed to upload pending photo:', photoErr)
                        }
                      }
                   })
                   await Promise.all(uploadPromises)
                }

                // If photos were updated, save the response locally before syncing
                if (photosUpdated) {
                  await offlineStorage.saveResposta(resposta, true)
                }

                let tipoPayload = 'preventiva'
                if (checklist && typeof checklist.tipo === 'string' && checklist.tipo.length) {
                  tipoPayload = checklist.tipo
                }
                
                let itemsResult: any[] = []
                try {
                  const itens = (checklist?.itens || [])
                  itemsResult = itens.map((it: any) => {
                    const raw = String(it.descricao || '')
                    const parts = raw.split(' • ')
                    const section = parts.length > 1 ? parts[0] : 'Geral'
                    const name = parts.length > 1 ? parts.slice(1).join(' • ') : raw
                    const respItem = (resposta.respostas || []).find((r:any)=> r.item_id === it.id)
                    const val = respItem?.valor
                    const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
                    let status: 'ok' | 'notok' | 'na' = 'na'
                    if (it.tipo === 'booleano' || it.tipo === 'opcoes') {
                      const n = normalize(val)
                      if (n === 'ok' || n === 'aprovado' || n === 'true') status = 'ok'
                      else if (n.includes('nao ok') || n.includes('não ok') || n === 'reprovado' || n === 'false') status = 'notok'
                      else if (n.includes('nao aplica') || n.includes('não aplica') || n === 'na' || n === 'n/a') status = 'na'
                    }
                    const note = (respItem && respItem.observacao) ? String(respItem.observacao) : (typeof val === 'string' ? val : (val === true ? 'OK' : (val === false ? 'Não OK' : String(val ?? ''))))
                    return { id: it.id, name, section, status, note }
                  })
                  if (resposta.observacoes) {
                    itemsResult.push({ id: 'observacao', name: 'Observação', section: 'Geral', status: 'na', note: resposta.observacoes })
                  }
                  try {
                    const fotos = await offlineStorage.getFotosByRespostaId(resposta.id)
                    const urls = (fotos || []).map((f:any)=> f.url).filter(Boolean)
                    if (urls.length) {
                      itemsResult.push({ id: 'fotos', name: 'Fotos', section: 'Geral', status: 'na', note: '', photos: urls })
                    }
                  } catch {}
                } catch {}
                const ok_count = itemsResult.filter((x:any)=> x.status === 'ok').length
                const nao_ok_count = itemsResult.filter((x:any)=> x.status === 'notok').length
                const total = ok_count + nao_ok_count
                const nivel = total ? Math.round((ok_count / total) * 100) : 0
                const nomeRaw = (get().user?.nome || get().user?.email || 'Tecnico')
                const mecanicoNome = nomeRaw.includes('@') ? nomeRaw.split('@')[0] : nomeRaw
                const payload = {
                  data: new Date(resposta.data_execucao).toISOString().slice(0, 10),
                  tipo: tipoPayload,
                  frota: resposta.equipamento_id,
                  items: itemsResult,
                  results: { ok: ok_count, notOk: nao_ok_count, percentage: nivel },
                  user_id: (currentUser?.id && !currentUser.id.startsWith('offline')) ? currentUser.id : resposta.usuario_id,
                  observacao: resposta.observacoes ?? null,
                  mecanico: mecanicoNome,
                  local_id: resposta.id,
                  created_at: new Date().toISOString(),
                }
                const retry = async (fn: ()=>Promise<any>, attempts=3) => {
                  let lastErr
                  for (let i=0;i<attempts;i++) {
                    const res = await fn().catch(e=>{ lastErr = e; return { error: e } })
                    if (!res?.error) return res
                    await new Promise(r=>setTimeout(r, 500 * Math.pow(2,i)))
                  }
                  return { error: lastErr || new Error('Upsert failed') }
                }
                const upsertCall = () => api.from('inspections').upsert(payload, { onConflict: 'local_id' }).select()
                const { error, data: upsertData } = await retry(upsertCall)

                if (!error) {
                  // Mark as synced in offline storage
                  await offlineStorage.saveResposta({
                    ...resposta,
                    sincronizado: true,
                  }, true)

                  // Cleanup queue
                  const qItems = queue.filter((q:any) => q.table === 'respostas_checklist' && q.data?.id === resposta.id)
                  for (const q of qItems) { try { await offlineStorage.markAsSynced(q.id) } catch {} }

                  // Update Cache
                  try { await offlineStorage.upsertInspectionCache(payload) } catch {}
                  
                  // Optimistic Update: Add to local state immediately so it doesn't "disappear"
                  // Use server returned ID if available
                  const serverItem = (upsertData && Array.isArray(upsertData) && upsertData[0]) ? upsertData[0] : null
                  const finalItem = serverItem ? { ...serverItem, ...payload, id: serverItem.id } : payload
                  
                  if (!finalItem.results) finalItem.results = payload.results
                  if (!finalItem.frota) finalItem.frota = payload.frota
                  
                  // Avoid direct state set loop, accumulate if needed or just cache
                  // But here we are in a loop (syncData), so maybe just cache is safer to avoid render trashing
                  // Ideally we should update the state at the end of the loop (line 1166)
                  // However, loadInspections() might overwrite it if server lag.
                  // The "Safety Merge" in loadInspections should handle this now.
                  
                }
              } catch (loopErr) {
                console.error(`Erro processando resposta ${resposta.id}:`, loopErr)
              }
            }
          }

          // Process generic queue (calibragem, controle_3p, deletes)
          if (Array.isArray(queue) && queue.length) {
            const remaining: any[] = []
            for (const item of queue) {
              try {
                // Handle Delete Operations
                if (item.type === 'delete') {
                   if (item.table === 'inspections' || item.table === 'respostas_checklist') {
                      const { error: err1 } = await api.from('inspections').delete().eq('id', item.data.id)
                      // Also try legacy table just in case
                      const { error: err2 } = await api.from('respostas_checklist').delete().eq('id', item.data.id)
                      
                      if (err1 && err2) throw new Error(err1.message || err2.message)
                   } else if (item.table === 'calibragem') {
                      await api.from('calibragem').delete().eq('id', item.data.id)
                   } else if (item.table === 'controle_3p') {
                      await api.from('controle_3p').delete().eq('id', item.data.id)
                   }
                   continue // Success
                }

                if (item.table === 'calibragem') {
                  const { error } = await api.from('calibragem').upsert([item.data], { onConflict: 'local_id' })
                  if (error) throw error
                } else if (item.table === 'controle_3p') {
                  const { error } = await api.from('controle_3p').upsert([item.data], { onConflict: 'local_id' })
                  if (error) throw error
                } else {
                  remaining.push(item)
                }
              } catch (e) {
                console.error('Queue sync error:', e)
                remaining.push(item)
              }
            }
            // Mark synced ones
            try {
              const syncedIds = queue.filter(q => !remaining.includes(q)).map(q => q.id)
              for (const id of syncedIds) { try { await offlineStorage.markAsSynced(id) } catch {} }
            } catch {}
          }

          // Reload data from server
          await get().loadChecklists()
          await get().loadEquipamentos()
          await get().loadInspections()
          try {
            const current = get().inspections
            window.localStorage.setItem('cached_inspections', JSON.stringify(current))
          } catch {}
          
          // Recalculate pending syncs
          const finalPendentes = await offlineStorage.getRespostasPendentes()
          const finalQueue = await offlineStorage.getSyncQueue()
          
          const finalUniqueQueue = finalQueue.filter(q => {
            if (q.table === 'respostas_checklist' && q.data?.id) {
              return !finalPendentes.some(p => p.id === q.data.id)
            }
            return true
          })

          const finalTotal = (finalPendentes?.length || 0) + (finalUniqueQueue?.length || 0)

          set({ 
            lastSync: new Date().toISOString(),
            pendingSync: finalTotal,
          })

          if (finalTotal === 0) {
            notify({ message: 'Sincronização concluída', type: 'success' })
            notifyNative('Sincronização concluída', 'Todos os pendentes enviados')
          } else {
            notify({ message: `Sincronização parcial. ${finalTotal} pendentes.`, type: 'warning' })
            notifyNative('Sincronização parcial', `${finalTotal} itens ainda pendentes`)
          }
        } catch (error: any) {
          console.error('Sync error:', error)
          const msg = error?.message || String(error)
          if (msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('connection')) {
             notify({ message: 'Sem conexão com servidor', type: 'warning' })
             notifyNative('Sem conexão', 'Verifique sua internet')
          } else {
             notify({ message: 'Erro na sincronização: ' + msg.substring(0, 50), type: 'error' })
             notifyNative('Erro na sincronização', 'Tente novamente mais tarde')
          }
        } finally {
          set({ syncInProgress: false })
        }
      },

      syncRespostaById: async (id: string) => {
        try {
          const user = get().user
          if (user?.id?.startsWith('offline')) return false

          const pendentes = await offlineStorage.getRespostasPendentes()
          const resposta = pendentes.find((r:any)=> r.id === id)
          if (!resposta) return false
          let tipoPayload = 'preventiva'
          try {
            const checklist = await offlineStorage.getChecklistById(resposta.checklist_id)
            if (checklist && typeof checklist.tipo === 'string' && checklist.tipo.length) {
              tipoPayload = checklist.tipo
            }
          } catch {}
          let itemsResult: any[] = []
          try {
            const checklist = await offlineStorage.getChecklistById(resposta.checklist_id)
            const itens = (checklist?.itens || [])
            itemsResult = itens.map((it: any) => {
              const raw = String(it.descricao || '')
              const parts = raw.split(' • ')
              const section = parts.length > 1 ? parts[0] : 'Geral'
              const name = parts.length > 1 ? parts.slice(1).join(' • ') : raw
              const respItem = (resposta.respostas || []).find((r:any)=> r.item_id === it.id)
              const val = respItem?.valor
              const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
              let status: 'ok' | 'notok' | 'na' = 'na'
              if (it.tipo === 'booleano' || it.tipo === 'opcoes') {
                const n = normalize(val)
                if (n === 'ok' || n === 'aprovado' || n === 'true') status = 'ok'
                else if (n.includes('nao ok') || n.includes('não ok') || n === 'reprovado' || n === 'false') status = 'notok'
                else if (n.includes('nao aplica') || n.includes('não aplica') || n === 'na' || n === 'n/a') status = 'na'
              }
              const note = (respItem && respItem.observacao) ? String(respItem.observacao) : (typeof val === 'string' ? val : (val === true ? 'OK' : (val === false ? 'Não OK' : String(val ?? ''))))
              return { id: it.id, name, section, status, note }
            })
            if (resposta.observacoes) {
              itemsResult.push({ id: 'observacao', name: 'Observação', section: 'Geral', status: 'na', note: resposta.observacoes })
            }
            try {
              const fotos = await offlineStorage.getFotosByRespostaId(resposta.id)
              const urls = (fotos || []).map((f:any)=> f.url).filter(Boolean)
              if (urls.length) {
                itemsResult.push({ id: 'fotos', name: 'Fotos', section: 'Geral', status: 'na', note: '', photos: urls })
              }
            } catch {}
          } catch {}
          const ok_count = itemsResult.filter((x:any)=> x.status === 'ok').length
          const nao_ok_count = itemsResult.filter((x:any)=> x.status === 'notok').length
          const total = ok_count + nao_ok_count
          const nivel = total ? Math.round((ok_count / total) * 100) : 0
          const nomeRaw = (get().user?.nome || get().user?.email || 'Tecnico')
          const mecanicoNome = nomeRaw.includes('@') ? nomeRaw.split('@')[0] : nomeRaw
          const payload = {
            data: new Date(resposta.data_execucao).toISOString().slice(0, 10),
            tipo: tipoPayload,
            frota: resposta.equipamento_id,
            items: itemsResult,
            results: { ok: ok_count, notOk: nao_ok_count, percentage: nivel },
            user_id: (get().user?.id && !get().user.id.startsWith('offline')) ? get().user.id : resposta.usuario_id,
            observacao: resposta.observacoes ?? null,
            mecanico: mecanicoNome,
            local_id: resposta.id,
            created_at: new Date().toISOString(),
          }
          const { error } = await api
            .from('inspections')
            .upsert(payload, { onConflict: 'local_id' })
          if (!error) {
            await offlineStorage.saveResposta({ ...resposta, sincronizado: true }, true)
            const left = await offlineStorage.getRespostasPendentes()
            set({ pendingSync: left.length })
            try { await offlineStorage.upsertInspectionCache(payload) } catch {}
            return true
          }
          return false
        } catch {
          return false
        }
      },

      setOnlineStatus: (online: boolean) => {
        set({ isOnline: online })
        if (online) {
          // Try to sync when coming back online
          if (get().pendingSync > 0) {
            notify({ message: 'Conectado. Iniciando sincronização de pendentes.', type: 'info' })
            notifyNative('Conectado', 'Iniciando sincronização de pendentes')
          }
          get().syncData()
        }
      },

      // Initialize offline storage
      initializeOfflineStorage: async () => {
        try {
          await offlineStorage.init()
          console.log('Offline storage initialized')

          try {
            const pendentes = await offlineStorage.getRespostasPendentes().catch(() => [])
            const queue = await offlineStorage.getSyncQueue().catch(() => [])
            const uniqueQueue = (queue || []).filter((q: any) => {
              if (q.table === 'respostas_checklist' && q.data?.id) {
                return !(pendentes || []).some((p: any) => p.id === q.data.id)
              }
              return true
            })
            set({ pendingSync: (pendentes?.length || 0) + (uniqueQueue?.length || 0) })
          } catch {}
          
          // Request notification permissions
          try {
            const perm = await LocalNotifications.checkPermissions()
            if (perm.display !== 'granted') {
                await LocalNotifications.requestPermissions()
            }
          } catch (e) { console.warn('Notification permission error:', e) }
          
          // Listen for App state changes (Resume/Pause)
          try {
             App.addListener('appStateChange', async ({ isActive }) => {
               if (isActive) {
                 // App resumed
                 console.log('App resumed, checking connection...')
                 if (navigator.onLine) {
                   get().setOnlineStatus(true)
                   get().syncData()
                 }
               } else {
                 // App paused - try best effort sync
                 const state = get()
                 if (state.pendingSync > 0 && state.isOnline) {
                   console.log('App paused, attempting background sync...')
                   // Fire and forget
                   state.syncData()
                 }
               }
             })
          } catch (e) { console.error('App listener error', e) }

          // Listen for Network changes (Browser API)
          window.addEventListener('online', () => {
             console.log('Network online detected')
             get().setOnlineStatus(true)
             get().syncData()
          })
          
          window.addEventListener('offline', () => {
             get().setOnlineStatus(false)
          })

          // background sync timer
          try {
            setInterval(() => {
              const state = get()
              if (state.isOnline && state.pendingSync > 0 && !state.syncInProgress) {
                state.syncData()
              }
            }, 60000)
          } catch {}

          try {
            if (navigator.onLine) {
              get().setOnlineStatus(true)
            } else {
              get().setOnlineStatus(false)
            }
          } catch {}
        } catch (error) {
          console.error('Failed to initialize offline storage:', error)
        }
      },
    }),
    {
      name: 'checklist-mobile-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastSync: state.lastSync,
      }),
    }
  )
)

// Network status listeners
window.addEventListener('online', () => {
  useAppStore.getState().setOnlineStatus(true)
})

window.addEventListener('offline', () => {
  useAppStore.getState().setOnlineStatus(false)
})
