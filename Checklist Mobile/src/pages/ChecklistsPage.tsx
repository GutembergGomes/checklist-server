import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Search, Calendar, Trash, Edit, RefreshCw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { offlineStorage } from '../utils/offlineStorage'
import { formatPercent } from '../lib/utils'

export default function ChecklistsPage() {
  const { inspections, loadInspections, user, deleteInspection } = useAppStore() as any
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statuses, setStatuses] = useState<Record<string, 'pendente'|'sincronizado'>>({})
  const [progresses, setProgresses] = useState<Record<string, number>>({})
  const [page, setPage] = useState(1)
  const pageSize = 30
  const [pendentesLocal, setPendentesLocal] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadInspections()
    setIsRefreshing(false)
  }

  useEffect(() => {
    loadInspections()
  }, [loadInspections])

  useEffect(() => {
    const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
    const loadPendentes = async () => {
      try {
        const pend = await offlineStorage.getRespostasPendentes()
        const mapped: any[] = []
        for (const r of pend) {
          try {
            const checklist = await offlineStorage.getChecklistById(r.checklist_id)
            const itens = (checklist?.itens || [])
            const itemsResult = itens.map((it: any) => {
              const raw = String(it.descricao || '')
              const parts = raw.split(' • ')
              const section = parts.length > 1 ? parts[0] : 'Geral'
              const name = parts.length > 1 ? parts.slice(1).join(' • ') : raw
              const val = (r.respostas || []).find((x:any)=> x.item_id === it.id)?.valor
              const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
              let status: 'ok' | 'notok' | 'na' = 'na'
              if (it.tipo === 'booleano' || it.tipo === 'opcoes') {
                 const n = normalize(val)
                 if (n === 'ok' || n === 'aprovado' || n === 'true' || n === 'sim' || n === 'conforme') status = 'ok'
                 else if (n.includes('nao ok') || n.includes('não ok') || n === 'reprovado' || n === 'false') status = 'notok'
                 else if (n.includes('nao aplica') || n.includes('não aplica') || n === 'na' || n === 'n/a') status = 'na'
              }
              const note = typeof val === 'string' ? val : (val === true ? 'OK' : (val === false ? 'Não OK' : String(val ?? '')))
              return { id: it.id, name, section, status, note, photos: undefined as string[] | undefined }
            })
            if (r.observacoes) {
                itemsResult.push({ id: 'observacao', name: 'Observação', section: 'Geral', status: 'na', note: r.observacoes, photos: undefined })
             }
            try {
               const fotos = await offlineStorage.getFotosByRespostaId(r.id)
               const urls = (fotos || []).map((f:any)=> f.url).filter(Boolean)
               if (urls.length) {
                 itemsResult.push({ id: 'fotos', name: 'Fotos', section: 'Geral', status: 'na', note: '', photos: urls })
               }
            } catch {}

            const statuses = itemsResult.map((it:any) => it.status)
            const ok = statuses.filter((s:any) => s === 'ok').length
            const naoOk = statuses.filter((s:any) => s === 'notok').length
            const totalConsidered = statuses.filter((s:any) => s !== 'na').length
            const percent = totalConsidered ? Math.round((ok / totalConsidered) * 100) : 0
            mapped.push({
              id: r.id,
              local_id: r.id,
              checklist_id: r.checklist_id,
              frota: r.equipamento_id,
              tipo: checklist?.tipo || 'preventiva',
              created_at: r.created_at || r.data_execucao || new Date().toISOString(),
              results: { percentage: percent },
              pending: true,
              items: itemsResult,
              observacao: r.observacoes
            })
          } catch {
            mapped.push({
              id: r.id,
              local_id: r.id,
              checklist_id: r.checklist_id,
              frota: r.equipamento_id,
              tipo: 'preventiva',
              created_at: r.created_at || r.data_execucao || new Date().toISOString(),
              results: { percentage: 0 },
              pending: true,
            })
          }
        }
        setPendentesLocal(mapped)
      } catch {
        setPendentesLocal([])
      }
    }
    loadPendentes()
  }, [])

  useEffect(() => {
    // compute statuses/progress from inspections
    const map: Record<string, 'pendente'|'sincronizado'> = {};
    const prog: Record<string, number> = {};
    const combined = [...pendentesLocal, ...(inspections || [])]
    combined.forEach((i:any) => {
      const id = i.local_id || i.id
      map[id] = i.pending ? 'pendente' : 'sincronizado'
      prog[id] = i.results?.percentage ?? 0
    })
    setStatuses(map)
    setProgresses(prog)
  }, [inspections, pendentesLocal])

  const filteredInspections = ([...pendentesLocal, ...(inspections || []).filter((i:any) => !i.pending)])
    .filter((i:any) => {
      const matchesSearch = String(i.frota||'').toLowerCase().includes(searchTerm.toLowerCase()) || String(i.tipo||'').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || String(i.tipo||'').toLowerCase() === typeFilter
      return matchesSearch && matchesType
    })
    .slice(0, page * pageSize)

  

  const { deleteInspection } = useAppStore()
  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este checklist?')) {
        try { await deleteInspection(id) } catch {}
    }
  }

  const handleEdit = (id: string) => {
     // TODO: Implementar navegação para edição ou modal
     // Por enquanto, apenas avisa que será implementado
     alert('Funcionalidade de edição em desenvolvimento. Em breve você poderá editar os dados.')
  }
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  return (
    <div
      className="min-h-screen text-white bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1556906781-9c08de00915e?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      {/* Header */}
      <div className="relative glassmorphism rounded-b-xl px-4 py-4">
        <h1 className="text-xl font-bold">Checklists</h1>
        <p className="text-sm text-white/80">Gerencie seus checklists de manutenção</p>
      </div>

      {/* Filters */}
      <div className="relative glassmorphism px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar checklists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium mb-1">Tipo</label>
            <select
              id="typeFilter"
              title="Filtrar por tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg.white/10 border border white/30 text.white focus:outline-none focus:ring-2 focus:ring.white/60 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="preventiva">Preventiva</option>
              <option value="reforma/entressafra">Reforma/Entressafra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Checklist List */}
      <div className="relative px-4 py-4 space-y-3">
        {filteredInspections.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="w-12 h-12 text-white/60 mx-auto mb-4" />
            <p className="text-white/80">
              {searchTerm || typeFilter !== 'all'
                ? 'Nenhum checklist encontrado com os filtros aplicados'
                : 'Nenhum checklist disponível'
              }
            </p>
          </div>
        ) : (
          <>
          {filteredInspections.map((item:any) => (
            <Link
              key={item.local_id || item.id}
              to={`/inspection/${item.local_id || item.id}`}
              state={{ inspection: item }}
              className="block glassmorphism rounded-lg border border white/30 p-4 hover:bg-white/15 transition-all-modern"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{item.frota}</h3>
                  <p className="text-sm text white/80 capitalize">{item.tipo}</p>
                </div>
                {user?.role === 'admin' && (
                <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        handleEdit(item.local_id || item.id) 
                      }}
                      className="px-2 py-1 rounded-md bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-200"
                      aria-label="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        handleDelete(item.local_id || item.id) 
                      }}
                      className="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-200"
                      aria-label="Excluir"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>
                    {formatDate(item.created_at || item.data || new Date().toISOString())}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${statuses[item.local_id || item.id] === 'pendente' ? 'bg-yellow-500/60 text-white' : 'bg-white/30 text-white'}`}>
                    {statuses[item.local_id || item.id] === 'pendente' ? 'Pendente' : 'Sincronizado'}
                  </span>
                  <span className="text-xs">{formatPercent(progresses[item.local_id || item.id] ?? (item.results?.percentage ?? 0))}</span>
                </div>
              </div>
            
            </Link>
          ))}
          {((inspections || []).length > filteredInspections.length) && (
            <div className="flex justify-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-md bg-white/10 border border-white/30 hover:bg-white/20"
              >
                Carregar mais
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
