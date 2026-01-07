import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useMemo, useState, useEffect } from 'react'
import { offlineStorage } from '../utils/offlineStorage'

export default function InspectionDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { inspections } = useAppStore()
  const [items, setItems] = useState<any[]>([])

  const inspection = useMemo(() => {
    if (location.state?.inspection) return location.state.inspection
    return inspections.find((i: any) => String(i.local_id || i.id) === String(id))
  }, [id, inspections, location.state])

  useEffect(() => {
    const loadItems = async () => {
      if (!inspection) return

      // Se os itens já estiverem formatados
      if (Array.isArray(inspection.items) && inspection.items.length > 0) {
        setItems(inspection.items)
        return
      }

      // Tenta reconstruir a partir das respostas cruas e do checklist
      if (inspection.checklist_id) {
        try {
          const checklist = await offlineStorage.getChecklistById(inspection.checklist_id)
          if (checklist && checklist.itens) {
            const respostas = inspection.respostas || inspection.answers || []
            const answersMap = new Map()

            if (Array.isArray(respostas)) {
              respostas.forEach((r: any) => {
                // Tenta mapear pelo ID do item ou índice
                if (r.item_id) answersMap.set(r.item_id, r)
              })
            }

            const loadedItems = await Promise.all(checklist.itens.map(async (item: any) => {
              const ans = answersMap.get(item.id)
              let status = 'na'
              let note = ''
              let photos: string[] = []

              if (ans) {
                const val = String(ans.valor || ans.value || ans.status || '').toLowerCase()
                if (val === 'ok' || val === 'conforme' || val === 'true' || val === 'sim') status = 'ok'
                else if (val.includes('nao') || val === 'false' || val === 'ruim') status = 'notok'
                else status = 'na'

                note = ans.observacao || ans.obs || ans.note || ''
                photos = ans.fotos || ans.photos || []

                // Se não tem fotos no objeto, tenta buscar do banco local
                if (photos.length === 0 && ans.id) {
                  try {
                    const dbPhotos = await offlineStorage.getFotosByRespostaId(ans.id)
                    if (dbPhotos && dbPhotos.length > 0) {
                      photos = dbPhotos.map(p => p.url)
                    }
                  } catch {}
                }
              }

              return {
                ...item,
                status,
                note,
                photos
              }
            }))

            setItems(loadedItems)
          }
        } catch (e) {
          console.error('Erro ao carregar itens do checklist:', e)
        }
      }
    }

    loadItems()
  }, [inspection])

  const groupedItems = useMemo(() => {
    if (!items || !items.length) return {}
    const groups: Record<string, any[]> = {}
    items.forEach((item: any) => {
      const section = item.section || 'Geral'
      if (!groups[section]) groups[section] = []
      groups[section].push(item)
    })
    return groups
  }, [items])

  if (!inspection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Inspeção não encontrada</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-md">Voltar</button>
        </div>
      </div>
    )
  }

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d }
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1575215867842-3661c418b492?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </button>
          <div className="text-white font-medium">
            Detalhes da Inspeção
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Frota</label>
              <div className="text-lg font-bold">{inspection.frota}</div>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Data</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{formatDate(inspection.created_at || inspection.data)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Responsável</label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>{inspection.mecanico || inspection.user_id || 'Técnico'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Status</label>
              <div className="flex items-center gap-2">
                <div className={`text-lg font-bold ${inspection.results?.percentage >= 70 ? 'text-green-500' : (inspection.results?.percentage >= 40 ? 'text-yellow-500' : 'text-red-500')}`}>
                  {inspection.results?.percentage ?? 0}%
                </div>
                <span className="text-xs text-gray-500">Aprovação</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([section, sectionItems]) => (
            <div key={section} className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg">{section}</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {sectionItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">{item.name}</div>
                        {item.note && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1">
                            {item.note}
                          </div>
                        )}
                        {item.photos && item.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.photos.map((url: string, pIdx: number) => (
                              <img key={pIdx} src={url} alt="Evidência" className="w-20 h-20 object-cover rounded border border-gray-200 dark:border-gray-700" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {item.status === 'ok' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" /> OK</span>}
                        {item.status === 'notok' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" /> Não OK</span>}
                        {item.status === 'na' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"><AlertTriangle className="w-3 h-3 mr-1" /> N/A</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Observações Gerais */}
        {inspection.observacao && (
           <div className="mt-6 bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
             <div className="px-6 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg">Observações Gerais</h3>
             </div>
             <div className="p-6">
               <p className="text-gray-700 dark:text-gray-300">{inspection.observacao}</p>
             </div>
           </div>
        )}
      </div>
    </div>
  )
}