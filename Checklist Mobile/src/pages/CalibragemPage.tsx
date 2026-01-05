import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { CalibragemMap, CalibragemRecord, CalibragemHeader, PosMap, SulcoMap } from '../types/database'

const posicoes = ['1de','1di','2de','2di','3de','3di','4de','4di','4ee','4ei']

export default function CalibragemPage() {
  const { equipamentos, loadEquipamentos, saveCalibragem } = useAppStore() as any
  const [frota, setFrota] = useState('')
  const [equipamentoTipo, setEquipamentoTipo] = useState('Caminhão')
  const [hodo, setHodo] = useState('')
  const [osItem, setOsItem] = useState('')
  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')
  const [dataIni, setDataIni] = useState(() => new Date().toISOString().slice(0,10))
  const [horaIni, setHoraIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [pos, setPos] = useState<PosMap>(() => Object.fromEntries(posicoes.map(k => [k, ''])))
  const [sulco, setSulco] = useState<SulcoMap>(() => Object.fromEntries(posicoes.map(k => [k, { a: '', b: '' }])) as any)
  const [calibragem, setCalibragem] = useState<CalibragemMap>(() => Object.fromEntries(posicoes.map(k => [k, { encon: '', colo: '' }])))

  useEffect(() => { loadEquipamentos() }, [loadEquipamentos])

  const frotaOptions = useMemo(() => (equipamentos || []).map((e:any)=> e.codigo), [equipamentos])

  const salvar = async () => {
    const header: CalibragemHeader = {
      frota,
      equipamento: equipamentoTipo,
      hodo,
      os_item: osItem,
      matricula,
      nome,
      data_ini: dataIni,
      hora_ini: horaIni,
      data_fim: dataFim,
      hora_fim: horaFim,
    }
    const rec: CalibragemRecord = {
      local_id: (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
      created_at: new Date().toISOString(),
      user_id: String((useAppStore.getState().user?.id) || 'local'),
      header,
      pos,
      sulco,
      calibragem,
      observacoes,
    }
    await saveCalibragem(rec)
    alert('Calibragem salva!')
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative text-gray-900 dark:text-white"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585087063180-9d1db4a535dd?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold mb-4">Calibragem</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Frota</label>
          <input list="frotas" value={frota} onChange={e=>setFrota(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" />
          <datalist id="frotas">
            {frotaOptions.map((f:string)=>(<option key={f} value={f} />))}
          </datalist>
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Equipamento</label>
          <select value={equipamentoTipo} onChange={e=>setEquipamentoTipo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option>Caminhão</option>
            <option>Transbordo</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Hodômetro/Horímetro</label>
          <input value={hodo} onChange={e=>setHodo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">OS</label>
          <input value={osItem} onChange={e=>setOsItem(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Matrícula</label>
          <input value={matricula} onChange={e=>setMatricula(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Nome</label>
          <input value={nome} onChange={e=>setNome(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Data Inicial</label>
          <input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Hora Inicial</label>
          <input type="time" value={horaIni} onChange={e=>setHoraIni(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Data Final</label>
          <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Hora Final</label>
          <input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-2">Posições e Sulco</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posicoes.map((k) => (
            <div key={k} className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white/85 dark:bg-black/70 backdrop-blur-sm">
              <div className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">{k.toUpperCase()}</div>
              <label className="text-xs text-gray-700 dark:text-gray-300">Posição</label>
              <input value={pos[k]||''} onChange={e=>setPos(prev=>({ ...prev, [k]: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300">Sulco 1</label>
                  <input value={sulco[k]?.a||''} onChange={e=>setSulco(prev=>({ ...prev, [k]: { a: e.target.value, b: prev[k]?.b||'' } }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300">Sulco 2</label>
                  <input value={sulco[k]?.b||''} onChange={e=>setSulco(prev=>({ ...prev, [k]: { a: prev[k]?.a||'', b: e.target.value } }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300">Pressão encontrada</label>
                  <input value={calibragem[k]?.encon||''} onChange={e=>setCalibragem(prev=>({ ...prev, [k]: { encon: e.target.value, colo: prev[k]?.colo||'' } }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300">Pressão colocada</label>
                  <input value={calibragem[k]?.colo||''} onChange={e=>setCalibragem(prev=>({ ...prev, [k]: { encon: prev[k]?.encon||'', colo: e.target.value } }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm text-gray-700 dark:text-gray-300">Observações</label>
        <textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={salvar} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">Salvar</button>
      </div>
      </div>
    </div>
  )
}
