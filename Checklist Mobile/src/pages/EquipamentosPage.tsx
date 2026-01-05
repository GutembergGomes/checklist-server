import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'

function EquipamentosPage() {
  const { equipamentos, loadEquipamentos } = useAppStore()
  const [busca, setBusca] = useState('')

  useEffect(() => {
    loadEquipamentos()
  }, [loadEquipamentos])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return equipamentos
    return equipamentos.filter(e =>
      (e.codigo || '').toLowerCase().includes(q) ||
      (e.descricao || '').toLowerCase().includes(q) ||
      (e.tipo || '').toLowerCase().includes(q)
    )
  }, [busca, equipamentos])

  return (
    <div className="min-h-screen bg-primary-gradient text-white p-4">
      <div className="glassmorphism rounded-xl p-4 mb-3">
        <h1 className="text-lg font-semibold">Equipamentos</h1>
        <div className="mt-3">
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por frota, descrição ou tipo"
            className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/30 placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60" />
        </div>
      </div>
      <div className="space-y-2">
        {filtrados.length === 0 && (
          <div className="text-sm text-white/80">Nenhum equipamento encontrado</div>
        )}
        {filtrados.map((e) => (
          <div key={e.id} className="p-3 glassmorphism rounded-md border border-white/30">
            <div className="font-medium">{e.codigo}</div>
            <div className="text-sm text-white/80">{e.descricao || 'Sem descrição'}</div>
            <div className="text-xs text-white/70 mt-1">{e.tipo} • {e.ativo ? 'Ativo' : 'Inativo'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EquipamentosPage
