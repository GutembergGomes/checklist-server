import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { offlineStorage } from '../utils/offlineStorage'
import { Checklist, ChecklistItem, RespostaChecklist, RespostaChecklistItem } from '../types/database'
import { formatPercent } from '../lib/utils'
import { Camera, CameraResultType } from '@capacitor/camera'

function ChecklistFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { saveChecklistResponse, user, equipamentos } = useAppStore()
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [assinatura, setAssinatura] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string | number | boolean>>({})
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [itens, setItens] = useState<ChecklistItem[]>([])
  const [syncStatus, setSyncStatus] = useState<'pendente' | 'sincronizado'>('pendente')
  const [frotaSelect, setFrotaSelect] = useState<string>('')
  const [frotaCustom, setFrotaCustom] = useState<string>('')
  const [reformaStatus, setReformaStatus] = useState<'nao' | 'sim'>('nao')
  const [photos, setPhotos] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const draftKey = checklist ? `draft_checklist_${checklist.id}` : ''

  const genId = () => (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2))

  useEffect(() => {
    ;(async () => {
      if (!id) return
      await offlineStorage.init()
      const c = await offlineStorage.getChecklistById(id)
      if (c) setChecklist(c)
      try {
        const prev = await offlineStorage.getRespostasByChecklistId(id)
        if (Array.isArray(prev) && prev.length) {
          const latest = prev.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          const map: Record<string, string | number | boolean> = {}
          const answers = Array.isArray(latest.respostas) ? latest.respostas : []
          answers.forEach((r:any) => { map[r.item_id] = r.valor })
          setRespostas(map)
          setObservacoes(latest.observacoes || '')
          setAssinatura(latest.assinatura || '')
          setSyncStatus(latest.sincronizado ? 'sincronizado' : 'pendente')
        }
      } catch (e) { void 0 }
    })()
  }, [id])

  const compressDataUrl = async (dataUrl: string, maxWidth = 1024, quality = 0.6): Promise<string> => {
    try {
      const img = new Image()
      img.src = dataUrl
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const out = canvas.toDataURL('image/jpeg', quality)
      return out || dataUrl
    } catch {
      return dataUrl
    }
  }

  useEffect(() => {
    if (!checklist || !draftKey) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const d = JSON.parse(raw)
        setRespostas(d.respostas || {})
        setObservacoes(d.observacoes || '')
        setAssinatura(d.assinatura || '')
        setPhotos(Array.isArray(d.photos) ? d.photos : [])
        if (d.frotaSelect) setFrotaSelect(d.frotaSelect)
        if (d.frotaCustom) setFrotaCustom(d.frotaCustom)
      }
    } catch (e) { void 0 }
  }, [checklist, draftKey])

  useEffect(() => {
    if (!checklist || !draftKey) return
    const payload = { respostas, observacoes, assinatura, photos, frotaSelect, frotaCustom }
    try { localStorage.setItem(draftKey, JSON.stringify(payload)) } catch (e) { void 0 }
  }, [respostas, observacoes, assinatura, photos, frotaSelect, frotaCustom, checklist, draftKey])

  useEffect(() => {
    setItens(checklist?.itens ?? [])
  }, [checklist])

  const displayName = useMemo(() => {
    const raw = (user?.nome || user?.email || '')
    return raw.includes('@') ? raw.split('@')[0] : raw
  }, [user?.nome, user?.email])

  useEffect(() => {
    if (!assinatura) {
      setAssinatura(displayName)
    }
  }, [displayName])

  const handleChange = (itemId: string, value: any) => {
    setRespostas(prev => ({ ...prev, [itemId]: value }))
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    if (!checklist) return
    const frotaFinal = frotaSelect === 'custom' ? frotaCustom : (frotaSelect || checklist.equipamento_id)
    if (!frotaFinal || String(frotaFinal).trim() === '') { alert('Informe a frota antes de salvar.'); setIsSaving(false); return }
    if (!assinatura || String(assinatura).trim() === '') { alert('Informe a assinatura antes de salvar.'); setIsSaving(false); return }
    const respostasArray: RespostaChecklistItem[] = itens.map(it => ({
      item_id: it.id,
      valor: respostas[it.id] ?? '',
      observacao: itemNotes[it.id] || undefined,
    }))
    const resposta: RespostaChecklist = {
      id: genId(),
      checklist_id: checklist.id,
      equipamento_id: frotaFinal,
      usuario_id: user?.id || '',
      respostas: respostasArray,
      observacoes,
      assinatura,
      data_execucao: new Date().toISOString(),
      sincronizado: false,
      created_at: new Date().toISOString(),
    }
    try {
      for (const p of photos) {
        await offlineStorage.saveFoto({ id: genId(), resposta_id: resposta.id, url: p, created_at: new Date().toISOString() } as any)
      }
    } catch {}
    try {
      await saveChecklistResponse(resposta)
      navigate('/dashboard')
    } catch (e) {
      alert('Falha ao salvar checklist. Tente novamente.')
      setIsSaving(false)
      return
    }
    try {
      const latest = await offlineStorage.getLatestRespostaByChecklistId(checklist.id)
      if (latest) setSyncStatus(latest.sincronizado ? 'sincronizado' : 'pendente')
    } catch {}
  }


  const percentComplete = useMemo(() => {
    const total = itens.length
    const answered = Object.values(respostas).filter(v => v !== undefined && v !== '').length
    return total > 0 ? (answered / total) * 100 : 0
  }, [itens, respostas])

  const metrics = useMemo(() => {
    const normalize = (s: any) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
    const statuses = itens.map(it => {
      const val = respostas[it.id]
      if (it.tipo === 'numero') return null
      const n = normalize(val)
      if (n === 'ok' || n === 'aprovado' || n === 'true') return 'ok'
      if (n.includes('nao ok') || n.includes('não ok') || n === 'reprovado' || n === 'false') return 'nao_ok'
      if (n.includes('nao aplica') || n.includes('não aplica') || n === 'na' || n === 'n/a') return 'nao_aplica'
      return null
    })
    const ok = statuses.filter(s => s === 'ok').length
    const naoOk = statuses.filter(s => s === 'nao_ok').length
    const totalConsidered = statuses.filter(s => s !== 'nao_aplica').length
    const percent = totalConsidered ? Math.round((ok / totalConsidered) * 100) : 0
    let nivel = 'Bom'
    if (percent < 40) nivel = 'Crítico'
    else if (percent < 70) nivel = 'Atenção'
    return { ok, naoOk, percent, nivel }
  }, [itens, respostas])

  const normalizeType = (t: string) => {
    const map: Record<string,string> = { caminhao: 'truck', caminhão: 'truck' }
    const k = String(t || '').toLowerCase()
    return map[k] || k
  }
  const filteredEquipamentos = useMemo(() => {
    const t = normalizeType(checklist?.tipo || '')
    const list = equipamentos.filter(eq => String(eq.tipo || '').toLowerCase() === t)
    return list.length ? list : equipamentos
  }, [equipamentos, checklist])

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1575215867842-3661c418b492?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">Voltar</button>
        </div>

        <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Checklist</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">Equipamento em reforma?</label>
              <select value={reformaStatus} onChange={e=>setReformaStatus(e.target.value as any)} title="Equipamento em reforma" className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data</label>
                <input type="date" defaultValue={new Date().toISOString().slice(0,10)} title="Data da inspeção" placeholder="Selecione a data" className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frota</label>
                <div className="flex gap-2">
                  <select value={frotaSelect} onChange={e=>setFrotaSelect(e.target.value)} title="Seleção de frota" className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Selecione uma frota</option>
                    <option value="custom">Outro (digitar)</option>
                    {filteredEquipamentos.map(eq => (
                      <option key={eq.id} value={eq.codigo || eq.id}>{eq.codigo || eq.id}</option>
                    ))}
                  </select>
                  <Link to="/equipamentos" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Gerenciar</Link>
                </div>
                {frotaSelect === 'custom' && (
                  <input type="text" value={frotaCustom} onChange={e=>setFrotaCustom(e.target.value)} placeholder="Digite a identificação da frota" className="mt-2 w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Líder</label>
                <input type="text" defaultValue={displayName} placeholder="Nome do líder responsável" className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
            </div>

            <div className={`p-2 mb-4 rounded-md text-sm ${syncStatus==='sincronizado' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>Status de sincronização: {syncStatus==='sincronizado' ? 'Sincronizado' : 'Pendente'}</div>

            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Itens de Verificação</h4>
              <div id="checklistItems" className="space-y-3">
                {itens.map(it => (
                  <div key={it.id} className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium mb-2 text-gray-900 dark:text-white">{it.descricao}</div>
                    {it.tipo === 'texto' && (
                      <input aria-label={it.descricao} title={it.descricao} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" onChange={e=>handleChange(it.id, e.target.value)} />
                    )}
                    {it.tipo === 'numero' && (
                      <input type="number" aria-label={it.descricao} title={it.descricao} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" onChange={e=>handleChange(it.id, Number(e.target.value))} />
                    )}
                    {(it.tipo === 'booleano' || it.tipo === 'opcoes') && (
                      <>
                        <div className="flex items-center space-x-4">
                          {(it.opcoes && it.opcoes.length ? it.opcoes : ['OK','Não OK','Não Aplica']).map(opt => (
                            <label key={opt} className="text-sm flex items-center space-x-1 text-gray-800 dark:text-gray-200">
                              <input type="radio" name={`bool-${it.id}`} checked={respostas[it.id] === opt} onChange={()=>handleChange(it.id, opt)} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Motivo/Observação</label>
                          <textarea
                            rows={2}
                            placeholder="Descreva o motivo quando NÃO OK"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={itemNotes[it.id] || ''}
                            onChange={e=>setItemNotes(prev=>({ ...prev, [it.id]: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                    {it.tipo === 'foto' && (
                      <div className="space-y-2">
                        {typeof respostas[it.id] === 'string' && (respostas[it.id] as any).startsWith('data:') && (
                          <img src={String(respostas[it.id])} alt="Foto" className="w-28 h-20 object-cover rounded-md border border-gray-200 dark:border-gray-700" />
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const pic = await Camera.getPhoto({ resultType: CameraResultType.DataUrl, quality: 60 })
                              if (pic?.dataUrl) {
                                const compressed = await compressDataUrl(pic.dataUrl!, 1024, 0.6)
                                setRespostas(prev => ({ ...prev, [it.id]: compressed }))
                              }
                            } catch (e) { void 0 }
                          }}
                          className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm"
                        >
                          Tirar Foto
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resultado da Inspeção</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center"><div className="text-2xl font-bold text-green-600 dark:text-green-400" id="itensOK">{metrics.ok}</div><div className="text-sm text-gray-500 dark:text-gray-400">Itens OK</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-red-600 dark:text-red-400" id="itensNaoOK">{metrics.naoOk}</div><div className="text-sm text-gray-500 dark:text-gray-400">Itens NÃO OK</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-primary" id="percentual">{metrics.percent}%</div><div className="text-sm text-gray-500 dark:text-gray-400">Percentual</div></div>
                <div className="text-center"><div className="text-sm font-medium text-gray-900 dark:text-white" id="nivelManutencao">Nível de Manutenção: {metrics.nivel}</div></div>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
              <div className="text-sm font-medium mb-2 text-gray-900 dark:text-white">Observações</div>
              <textarea aria-label="Observações" title="Observações" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} value={observacoes} onChange={e=>setObservacoes(e.target.value)} />
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
              <div className="text-sm font-medium mb-2 text-gray-900 dark:text-white">Assinatura</div>
              <input aria-label="Assinatura" title="Assinatura" className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={assinatura} onChange={e=>setAssinatura(e.target.value)} />
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
              <div className="text-sm font-medium mb-2 text-gray-900 dark:text-white">Fotos</div>
              <div className="flex flex-wrap gap-3 mb-3">
                {photos.map((src, idx) => (
                  <img key={idx} src={src} alt={`Foto ${idx+1}`} className="w-24 h-18 object-cover rounded-md border border-gray-200 dark:border-gray-700" />
                ))}
              </div>
              <button
                onClick={async () => {
                  try {
                    const pic = await Camera.getPhoto({ resultType: CameraResultType.DataUrl, quality: 60 })
                    if (pic?.dataUrl) {
                      const compressed = await compressDataUrl(pic.dataUrl!, 1024, 0.6)
                      setPhotos(prev => [...prev, compressed])
                    }
                    } catch (e) { void 0 }
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Tirar Foto
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={()=>{ setRespostas({}); setObservacoes(''); setAssinatura(''); }} className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200">Limpar</button>
            <button disabled={isSaving} onClick={handleSave} className={`px-6 py-3 bg-primary text-white rounded-md transition-colors duration-200 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}>Salvar Inspeção</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChecklistFormPage
