import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'

export default function HistoricoPneusPage() {
  const { loadHistoricoPneus } = useAppStore() as any
  const [frota, setFrota] = useState('')
  const [tipo, setTipo] = useState<'all'|'calibragem'|'controle3p'>('all')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { (async()=>{ const r = await loadHistoricoPneus({ frota }); const merged = [...r.calibragem.map(x=>({ tipo:'calibragem', ...x })), ...r.c3p.map(x=>({ tipo:'controle3p', ...x }))]; setItems(merged) })() }, [frota])
  const filtered = items.filter(i => tipo==='all' || i.tipo===tipo)
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1580387935805-81801da8f864?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Histórico de Pneus</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-sm text-gray-700 dark:text-white">Frota</label>
          <input value={frota} onChange={e=>setFrota(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-white">Tipo</label>
          <select value={tipo} onChange={e=>setTipo(e.target.value as any)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="all">Todos</option>
            <option value="calibragem">Calibragem</option>
            <option value="controle3p">Controle 3P</option>
          </select>
        </div>
        </div>
        <div className="space-y-3">
          {filtered.map((it:any, idx:number) => (
          <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white/85 dark:bg-black/70 backdrop-blur-sm">
            <div className="text-sm text-white">{it.tipo.toUpperCase()} • Frota {it.header?.frota} • {new Date(it.created_at).toLocaleString()}</div>
          </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400">Nenhum registro</div>
          )}
        </div>
      </div>
    </div>
  )
}
