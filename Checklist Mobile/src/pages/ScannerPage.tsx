import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { createApiClient } from '../utils/apiClient'
import { offlineStorage } from '../utils/offlineStorage'
import { Checklist, ChecklistItem, Equipamento } from '../types/database'
import { defaultMotivos, getDefaultItems } from '../utils/checklistTemplates'
import { normalizeItems } from '../utils/itemNormalize'
import { buildLegacyItems, legacyTemplates } from '../utils/legacyTemplates'

const supabase = createApiClient()

function ScannerPage() {
  const navigate = useNavigate()
  const { equipamentos, loadEquipamentos, loadChecklists } = useAppStore()
  const [motivos, setMotivos] = useState<string[]>(defaultMotivos)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Equipamento | null>(null)
  const [motivo, setMotivo] = useState<string>('preventiva')
  const [carregando, setCarregando] = useState(false)
  const [modelo, setModelo] = useState<keyof typeof legacyTemplates | ''>('')

  useEffect(() => {
    loadEquipamentos()
    ;(async () => {
      try {
        const tipos = new Set<string>()
        const { data: insp } = await supabase.from('inspections').select('tipo')
        ;(insp || []).forEach((r: any) => r?.tipo && tipos.add(String(r.tipo)))
        const { data: irr } = await supabase.from('irrig_inspections').select('tipo')
        ;(irr || []).forEach((r: any) => r?.tipo && tipos.add(String(r.tipo)))
        setMotivos(defaultMotivos)
      } catch {}
    })()
  }, [loadEquipamentos])

  const detectModeloFromEquipamento = (e: Equipamento): keyof typeof legacyTemplates | '' => {
    const t = (e.tipo || '').toLowerCase()
    const d = (e.descricao || '').toLowerCase()
    const s = `${t} ${d}`
    if (s.includes('camin') || s.includes('truck')) return 'caminhao'
    if (s.includes('trator')) return 'trator'
    if (s.includes('colhe') || s.includes('harvest')) return 'colhedora'
    if (s.includes('plant') || s.includes('cana')) return 'plantadora'
    if (s.includes('distrib')) return 'distribuidora'
    if (s.includes('tort')) return 'tortao'
    if (s.includes('cobri')) return 'cobridores'
    if (s.includes('rebo') || s.includes('semi')) return 'trailer'
    if (s.includes('transb')) return 'transbordo'
    if (s.includes('moto') || s.includes('bomba')) return 'motobombas'
    if (s.includes('hidro') || s.includes('roll')) return 'hidroroll'
    return ''
  }

  useEffect(() => {
    if (selecionado) {
      const m = detectModeloFromEquipamento(selecionado)
      if (m) setModelo(m)
      const defaultMot = (
        ['plantadora','distribuidora','tortao','cobridores','transbordo','motobombas','hidroroll'].includes(m)
      ) ? 'reforma/entressafra' : 'preventiva'
      setMotivo(defaultMot)
      setMotivos(defaultMot === 'reforma/entressafra' ? ['reforma/entressafra'] : defaultMotivos)
    }
  }, [selecionado])

  useEffect(() => {
    if (!modelo) return
    const isOficina = ['plantadora','distribuidora','tortao','cobridores','transbordo','motobombas','hidroroll'].includes(modelo)
    setMotivos(isOficina ? ['reforma/entressafra'] : defaultMotivos)
    setMotivo(isOficina ? 'reforma/entressafra' : 'preventiva')
  }, [modelo])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return equipamentos
    return equipamentos.filter(e =>
      (e.codigo || '').toLowerCase().includes(q) ||
      (e.descricao || '').toLowerCase().includes(q) ||
      (e.tipo || '').toLowerCase().includes(q)
    )
  }, [busca, equipamentos])

  const criarChecklist = async () => {
    if (!selecionado) return
    setCarregando(true)
    try {
      let items: ChecklistItem[] = []
      if (modelo) {
        items = buildLegacyItems(modelo)
      } else if (selecionado) {
        const tipo = (selecionado.tipo || '').toLowerCase()
        if (tipo.includes('camin')) items = buildLegacyItems('caminhao')
        else if (tipo.includes('trator')) items = buildLegacyItems('trator')
        else if (tipo.includes('colhe')) items = buildLegacyItems('colhedora')
        else if (tipo.includes('plant') || tipo.includes('cana')) items = buildLegacyItems('plantadora')
        else if (tipo.includes('distrib')) items = buildLegacyItems('distribuidora')
        else if (tipo.includes('tort')) items = buildLegacyItems('tortao')
        else if (tipo.includes('cobri')) items = buildLegacyItems('cobridores')
        else if (tipo.includes('rebo') || tipo.includes('semi')) items = buildLegacyItems('trailer')
        else if (tipo.includes('transb')) items = buildLegacyItems('transbordo')
      }
      if (!items || items.length === 0) {
        items = getDefaultItems(motivo)
      }
      try {
        const { data: tmpl } = await supabase
          .from('inspections')
          .select('items')
          .eq('tipo', motivo)
          .eq('frota', selecionado.codigo)
          .order('created_at', { ascending: false })
          .limit(1)
        const cand = Array.isArray(tmpl) && tmpl[0]?.items
        if (cand) {
          const norm = normalizeItems(cand)
          if (norm.length) items = norm
        }
      } catch {}
      if (!items || items.length === 0) {
        try {
          const { data: ctrl } = await supabase
            .from('controle_3p')
            .select('header,rows')
            .eq('local_id', selecionado.codigo)
            .order('created_at', { ascending: false })
            .limit(1)
          const raw = Array.isArray(ctrl) ? ctrl[0] : null
          if (raw) {
            const norm = normalizeItems(raw)
            if (norm.length) items = norm
          }
        } catch {}
      }
      if (!items || items.length === 0) {
        try {
          const { data: cal } = await supabase
            .from('calibragem')
            .select('header,rows,pos,sulco,calibragem')
            .eq('local_id', selecionado.codigo)
            .order('created_at', { ascending: false })
            .limit(1)
          const raw = Array.isArray(cal) ? cal[0] : null
          if (raw) {
            const norm = normalizeItems(raw)
            if (norm.length) items = norm
          }
        } catch {}
      }

      const checklist: Checklist = {
        id: crypto.randomUUID(),
        equipamento_id: selecionado.codigo,
        tipo: (['irrigacao','cct','coque','geral'].includes(selecionado.tipo)) ? selecionado.tipo as any : 'geral',
        titulo: `${motivo} • ${selecionado.codigo}`,
        itens: items,
        data_prevista: new Date().toISOString(),
        status: 'pendente',
        criado_por: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_locally: true,
      }
      await offlineStorage.saveChecklist(checklist)
      try { await loadChecklists() } catch {}
      navigate(`/checklist/${checklist.id}`)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div
      className="min-h-screen text-white bg-cover bg-center bg-no-repeat relative p-4"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1495012379376-194a81d0580f?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative glassmorphism rounded-xl p-4">
        <h1 className="text-lg font-semibold mb-3">Novo Checklist</h1>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/80">Buscar equipamento</label>
            <input value={busca} onChange={(e)=>setBusca(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/30 placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60" placeholder="Código, descrição ou tipo" />
          </div>
          
        <div>
          <label className="text-sm text-white/80">Modelo (como no sistema original)</label>
          <select value={modelo} onChange={(e)=>setModelo(e.target.value as any)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/60">
            <option value="">Detectar automaticamente</option>
            <option value="caminhao">Caminhão</option>
            <option value="trator">Trator</option>
            <option value="colhedora">Colhedora</option>
            <option value="plantadora">Plantadora de Cana</option>
            <option value="cobridores">Cobridores</option>
            <option value="trailer">Reboque/Semi-reboque</option>
            <option value="motobombas">Motobombas</option>
            <option value="hidroroll">Hidro Roll</option>
          </select>
        </div>
        <div className="max-h-56 overflow-auto rounded-md glassmorphism border border-white/30">
          {filtrados.map(e => (
            <button key={e.id} onClick={()=>setSelecionado(e)}
              className={`w-full text-left px-3 py-2 border-b border-white/20 ${selecionado?.id===e.id?'bg-white/10':''}`}>
              <div className="font-medium">{e.codigo}</div>
              <div className="text-xs text-white/80">{e.tipo} • {e.descricao || 'Sem descrição'}</div>
            </button>
          ))}
          {filtrados.length===0 && (
            <div className="p-3 text-sm text-white/80">Nenhum equipamento encontrado</div>
          )}
        </div>
        <div>
          <label className="text-sm text-white/80">Motivo</label>
          <select value={motivo} onChange={(e)=>setMotivo(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/60">
            {motivos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <button disabled={!selecionado||carregando} onClick={criarChecklist}
          className="w-full bg-white/20 text-white py-2 rounded-md border border-white/30 disabled:opacity-50 hover:bg-white/30 transition-all-modern">
          {carregando? 'Criando...' : 'Criar Checklist'}
        </button>
        </div>
      </div>
    </div>
  )
}

export default ScannerPage
