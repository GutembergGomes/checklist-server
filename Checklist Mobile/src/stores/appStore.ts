import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../utils/supabase/client'
import { offlineStorage } from '../utils/offlineStorage'
import { Checklist, RespostaChecklist, Equipamento, Usuario } from '../types/database'

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

  // Inventory actions
  saveCalibragem: (payload: any) => Promise<void>
  saveControle3p: (payload: any) => Promise<void>
  loadHistoricoPneus: (filters?: { tipo?: string; frota?: string; data_ini?: string; data_fim?: string }) => Promise<{ calibragem: any[]; c3p: any[] }>
  
  // Sync actions
  syncData: () => Promise<void>
  setOnlineStatus: (online: boolean) => void
  
  // Initialize offline storage
  initializeOfflineStorage: () => Promise<void>
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

      // Auth actions
      resetPasswordForEmail: async (email: string) => {
        try {
           const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          if (data.user) {
            const mapped: Usuario = {
              id: data.user.id,
              email: data.user.email || '',
              nome: (data.user.user_metadata && (data.user.user_metadata.name || data.user.user_metadata.full_name)) || (data.user.email || 'Usuário'),
              role: 'tecnico',
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
          console.error('Login error:', error)
          set({ isLoading: false })
          return false
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut()
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
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            const mapped: Usuario = {
              id: session.user.id,
              email: session.user.email || '',
              nome: (session.user.user_metadata && (session.user.user_metadata.name || session.user.user_metadata.full_name)) || (session.user.email || 'Usuário'),
              role: 'tecnico',
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            set({
              user: mapped,
              isAuthenticated: true,
            })
            await get().loadEquipamentos()
            await get().loadChecklists()
            await get().loadInspections()
            await get().loadAccessControls()
          }
        } catch (error) {
          console.error('Auth check error:', error)
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
        try {
          try {
            const cached = await offlineStorage.getInspectionsCache()
            if (Array.isArray(cached) && cached.length) {
              set({ inspections: cached })
            }
          } catch {}
          const q = await supabase
            .from('inspections')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300)
          if (q.error) throw q.error
          const fresh = Array.isArray(q.data) ? q.data : []
          try {
            const cached = await offlineStorage.getInspectionsCache()
            const mergedMap = new Map<string, any>()
            const put = (arr:any[]) => arr.forEach((i:any)=> {
              const key = i.local_id || i.id
              if (!key) return
              mergedMap.set(String(key), i)
            })
            put(Array.isArray(cached) ? cached : [])
            put(fresh)
            const merged = Array.from(mergedMap.values()).sort((a:any,b:any)=> new Date(b.created_at || b.data || 0).getTime() - new Date(a.created_at || a.data || 0).getTime())
            set({ inspections: merged })
            await offlineStorage.replaceInspectionsCache(merged)
          } catch {
            set({ inspections: fresh })
            try { await offlineStorage.replaceInspectionsCache(fresh) } catch {}
          }
        } catch (error) {
          console.error('Load inspections error:', error)
          try {
            const cached = await offlineStorage.getInspectionsCache()
            set({ inspections: Array.isArray(cached) ? cached : [] })
          } catch {
            set({ inspections: [] })
          }
        }
      },

      loadAccessControls: async () => {
        try {
          const email = get().user?.email
          if (!email) { set({ allowedSections: [] }); return }
          const { data, error } = await supabase
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
          // Tenta tabela original do site: 'equipments'
          const { data: eq1, error: err1 } = await supabase
            .from('equipments')
            .select('*')
            .order('frota', { ascending: true })

          if (!err1 && Array.isArray(eq1)) {
            const mapped: Equipamento[] = (eq1 as any[]).map((row) => ({
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

          const { data: eqAlt, error: errAlt } = await supabase
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
            set({ equipamentos: mapped })
            await offlineStorage.replaceEquipamentos(mapped)
            return
          }

          // Fallback offline
          const equipamentos = await offlineStorage.getEquipamentos()
          set({ equipamentos })
        } catch (error) {
          console.error('Load equipamentos error:', error)
          // Retry simples para erros de fetch abortado
          const msg = String((error as any)?.message || error)
          if (msg.includes('Failed to fetch') || msg.includes('net::ERR_ABORTED')) {
            try {
              await new Promise((r) => setTimeout(r, 600))
              await offlineStorage.init()
              const { data: eq2, error: err2 } = await supabase
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
              const { data: eq3, error: err3 } = await supabase
                .from('irrig_equipments')
                .select('*')
                .order('frota', { ascending: true })
              if (!err3 && Array.isArray(eq3)) {
                const mapped: Equipamento[] = (eq3 as any[]).map((row) => ({
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
            const checklist = await offlineStorage.getChecklistById(response.checklist_id)
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
              const { data, error } = await supabase
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
            const checklist = await offlineStorage.getChecklistById(response.checklist_id)
            const fotoItems = (checklist?.itens || []).filter((it:any)=> it.tipo === 'foto')
            const timestamp = Date.now()
            for (const it of fotoItems) {
              const val = (response.respostas || []).find((r:any)=> r.item_id === it.id)?.valor
              if (typeof val === 'string' && val.startsWith('data:')) {
                const blob = toBlob(val)
                const path = `photos/${response.id}/${it.id}-${timestamp}.jpg`
                const up = await supabase.storage.from('app').upload(path, blob, { upsert: true })
                if (!up.error) {
                  const publicUrl = `${supabase.storage.from('app').getPublicUrl(path).data.publicUrl}`
                  // persist foto separadamente
                  await offlineStorage.saveFoto({ id: `${response.id}-${it.id}-${timestamp}`, resposta_id: response.id, url: publicUrl, created_at: new Date().toISOString() } as any)
                  // também atualiza valor no array
                  const target = (response.respostas || []).find((r:any)=> r.item_id === it.id)
                  if (target) target.valor = publicUrl
                }
              }
            }
          } catch (e) {
            console.error('Upload de fotos falhou:', e)
          }

          // Save to offline storage
          await offlineStorage.saveResposta(response)
          
          // Update pending sync count
          const pendentes = await offlineStorage.getRespostasPendentes()
          set({ pendingSync: pendentes.length })

          // Try to sync immediately if online
          const tryImmediateSync = async () => {
            try {
              // Build items in web schema { id, name, section, status, note }
              let itemsResult: any[] = []
              try {
                const checklist = await offlineStorage.getChecklistById(response.checklist_id)
                const itens = (checklist?.itens || [])
                itemsResult = itens.map((it: any) => {
                  const raw = String(it.descricao || '')
                  const parts = raw.split(' • ')
                  const section = parts.length > 1 ? parts[0] : 'Geral'
                  const name = parts.length > 1 ? parts.slice(1).join(' • ') : raw
                  const val = (response.respostas || []).find((r:any)=> r.item_id === it.id)?.valor
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
                if (response.observacoes) {
                  itemsResult.push({ id: 'observacao', name: 'Observação', section: 'Geral', status: 'na', note: response.observacoes })
                }
                try {
                  const fotos = await offlineStorage.getFotosByRespostaId(response.id)
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
                data: new Date(response.data_execucao).toISOString().slice(0, 10),
                tipo: tipoPayload,
                frota: response.equipamento_id,
                items: itemsResult,
                results: { ok: ok_count, notOk: nao_ok_count, percentage: nivel },
                nivel,
                percent: nivel,
                percentage: `${nivel}%`,
                user_id: response.usuario_id,
                observacao: response.observacoes ?? null,
                mecanico: mecanicoNome,
                local_id: response.id,
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
              const upsertCall = () => supabase.from('inspections').upsert(payload, { onConflict: 'local_id' })
              const { error } = await retry(upsertCall)
              if (!error) {
                await offlineStorage.saveResposta({ ...response, sincronizado: true })
                const left = await offlineStorage.getRespostasPendentes()
                set({ pendingSync: left.length })
                try { await offlineStorage.upsertInspectionCache(payload) } catch {}
              } else {
                console.error('Immediate sync error:', error)
              }
            } catch (e) {
              console.error('Immediate sync network error:', e)
            }
          }

          await tryImmediateSync()
          // Only schedule sync when offline; online immediate upsert above handles sync
          if (!get().isOnline) {
            await get().syncData()
          }
        } catch (error) {
          console.error('Save checklist response error:', error)
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

      saveCalibragem: async (record: any) => {
        try {
          const { error } = await supabase.from('calibragem').upsert([record], { onConflict: 'local_id' })
          if (error) throw error
        } catch (e) {
          try { await offlineStorage.enqueue('calibragem', { ...record, offline: true }) } catch {}
        }
      },

      saveControle3p: async (record: any) => {
        try {
          const { error } = await supabase.from('controle_3p').upsert([record], { onConflict: 'local_id' })
          if (error) throw error
        } catch (e) {
          try { await offlineStorage.enqueue('controle_3p', { ...record, offline: true }) } catch {}
        }
      },

      loadHistoricoPneus: async (filters) => {
        try {
          let queryCal: any = supabase.from('calibragem').select('*').order('created_at', { ascending: false }).limit(100)
          let queryC3p: any = supabase.from('controle_3p').select('*').order('created_at', { ascending: false }).limit(100)
          if (filters?.frota) {
            queryCal = queryCal.contains('header', { frota: filters.frota })
            queryC3p = queryC3p.contains('header', { frota: filters.frota })
          }
          const [cal, c3p] = await Promise.all([queryCal, queryC3p])
          return { calibragem: Array.isArray(cal.data) ? cal.data : [], c3p: Array.isArray(c3p.data) ? c3p.data : [] }
        } catch (e) {
          return { calibragem: [], c3p: [] }
        }
      },

      // Sync actions
      syncData: async () => {
        if (get().syncInProgress || !get().isOnline) return

        set({ syncInProgress: true })
        
        try {
          const pendentes = await offlineStorage.getRespostasPendentes()
          const queue = await offlineStorage.getSyncQueue()
          
          if (pendentes.length > 0) {
            // Sync responses to legacy 'inspections'
            for (const resposta of pendentes) {
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
                nivel,
                percent: nivel,
                percentage: `${nivel}%`,
                user_id: resposta.usuario_id,
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
              const upsertCall = () => supabase.from('inspections').upsert(payload, { onConflict: 'local_id' })
              const { error } = await retry(upsertCall)

              if (!error) {
                // Mark as synced in offline storage
                await offlineStorage.saveResposta({
                  ...resposta,
                  sincronizado: true,
                })
                try { await offlineStorage.upsertInspectionCache(payload) } catch {}
                const left = await offlineStorage.getRespostasPendentes()
                set({ pendingSync: left.length })
              }
            }
          }

          // Process generic queue (calibragem, controle_3p)
          if (Array.isArray(queue) && queue.length) {
            const remaining: any[] = []
            for (const item of queue) {
              try {
                if (item.table === 'calibragem') {
                  const { error } = await supabase.from('calibragem').upsert([item.data], { onConflict: 'local_id' })
                  if (error) throw error
                } else if (item.table === 'controle_3p') {
                  const { error } = await supabase.from('controle_3p').upsert([item.data], { onConflict: 'local_id' })
                  if (error) throw error
                } else {
                  remaining.push(item)
                }
              } catch (e) {
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
          
          set({ 
            lastSync: new Date().toISOString(),
            pendingSync: 0,
          })
        } catch (error) {
          console.error('Sync error:', error)
        } finally {
          set({ syncInProgress: false })
        }
      },

      syncRespostaById: async (id: string) => {
        try {
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
            nivel,
            percent: nivel,
            percentage: `${nivel}%`,
            user_id: resposta.usuario_id,
            observacao: resposta.observacoes ?? null,
            mecanico: mecanicoNome,
            local_id: resposta.id,
            created_at: new Date().toISOString(),
          }
          const { error } = await supabase
            .from('inspections')
            .upsert(payload, { onConflict: 'local_id' })
          if (!error) {
            await offlineStorage.saveResposta({ ...resposta, sincronizado: true })
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
          get().syncData()
        }
      },

      // Initialize offline storage
      initializeOfflineStorage: async () => {
        try {
          await offlineStorage.init()
          console.log('Offline storage initialized')
          // background sync timer
          try {
            setInterval(() => {
              const state = get()
              if (state.isOnline && state.pendingSync > 0 && !state.syncInProgress) {
                state.syncData()
              }
            }, 60000)
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
