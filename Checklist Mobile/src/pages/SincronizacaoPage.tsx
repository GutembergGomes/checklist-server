import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { offlineStorage } from '../utils/offlineStorage'

function SincronizacaoPage() {
  const { pendingSync, syncInProgress, syncData, lastSync, isOnline, syncRespostaById } = useAppStore() as any
  const [pendentes, setPendentes] = useState<any[]>([])
  const [statuses, setStatuses] = useState<Record<string, 'ok'|'erro'|'aguardando'>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const list = await offlineStorage.getRespostasPendentes()
        setPendentes(list)
        const init: Record<string,'ok'|'erro'|'aguardando'> = {}
        list.forEach(i => { init[i.id] = 'aguardando' })
        setStatuses(init)
      } catch {
        setPendentes([])
      }
    }
    load()
  }, [pendingSync])

  const retryOne = async (id: string) => {
    setLoadingMap(prev => ({ ...prev, [id]: true }))
    const ok = await syncRespostaById(id)
    setLoadingMap(prev => ({ ...prev, [id]: false }))
    setStatuses(prev => ({ ...prev, [id]: ok ? 'ok' : 'erro' }))
    try { const list = await offlineStorage.getRespostasPendentes(); setPendentes(list) } catch {}
  }

  return (
    <div className="min-h-screen bg-primary-gradient text-white p-4">
      <div className="glassmorphism rounded-xl p-4">
        <h1 className="text-lg font-semibold mb-4">Sincronização</h1>
        <div className="space-y-2 text-sm">
          <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
          <div>Pendentes: {pendingSync}</div>
          <div>Última sincronização: {lastSync ? new Date(lastSync).toLocaleString() : '—'}</div>
        </div>
        <button disabled={syncInProgress} onClick={syncData} className="mt-4 px-4 py-2 bg-white/20 text-white rounded-md border border-white/30 hover:bg-white/30 transition-all-modern">
          {syncInProgress ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-2">Pendentes</h2>
          {pendentes.length === 0 ? (
            <div className="text-sm text-white/80">Nenhum item pendente</div>
          ) : (
            <div className="space-y-2">
              {pendentes.map((p:any) => (
                <div key={p.id} className="flex items-center justify-between bg-white/10 border border-white/20 rounded-md px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{p.equipamento_id}</div>
                    <div className="text-white/80">{new Date(p.data_execucao || p.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${statuses[p.id] === 'ok' ? 'bg-green-500/70' : statuses[p.id] === 'erro' ? 'bg-red-500/70' : 'bg-yellow-500/60'}`}>{statuses[p.id] === 'ok' ? 'Sincronizado' : statuses[p.id] === 'erro' ? 'Erro' : 'Aguardando'}</span>
                    <button disabled={loadingMap[p.id] || syncInProgress} onClick={()=>retryOne(p.id)} className="px-3 py-1 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-sm">
                      {loadingMap[p.id] ? '...' : 'Tentar novamente'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SincronizacaoPage
