import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { Controle3pRecord, Controle3pRow, CalibragemHeader } from '../types/database'

const makeRows = (): Controle3pRow[] => Array.from({ length: 16 }).map((_, i) => ({ seq: i+1, posicao: '', fogo: '', medida: '', fabricante: '', modelo: '', indice: '', dot: '', sulco1: '', sulco2: '', sulco3: '', pressao: '' }))

export default function Controle3PPage() {
  const { equipamentos, loadEquipamentos, saveControle3p } = useAppStore() as any
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
  const [rows, setRows] = useState<Controle3pRow[]>(makeRows())

  useEffect(() => { loadEquipamentos() }, [loadEquipamentos])
  const frotaOptions = useMemo(() => (equipamentos || []).map((e:any)=> e.codigo), [equipamentos])

  const salvar = async () => {
    const header: CalibragemHeader = { frota, equipamento: equipamentoTipo, hodo, os_item: osItem, matricula, nome, data_ini: dataIni, hora_ini: horaIni, data_fim: dataFim, hora_fim: horaFim }
    const rec: Controle3pRecord = { local_id: (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`), created_at: new Date().toISOString(), user_id: String((useAppStore.getState().user?.id) || 'local'), header, rows }
    await saveControle3p(rec)
    alert('Ficha Controle 3P salva!')
  }

  const updateRow = (i:number, field: keyof Controle3pRow, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1511914264640-2d7e0131c8ea?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Ficha de Controle 3P</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Frota</label>
          <input list="frotas" value={frota} onChange={e=>setFrota(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <datalist id="frotas">{frotaOptions.map((f:string)=>(<option key={f} value={f} />))}</datalist>
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Equipamento</label>
          <select value={equipamentoTipo} onChange={e=>setEquipamentoTipo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"><option>Caminhão</option><option>Transbordo</option></select>
        </div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Hodômetro/Horímetro</label><input value={hodo} onChange={e=>setHodo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">OS</label><input value={osItem} onChange={e=>setOsItem(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Matrícula</label><input value={matricula} onChange={e=>setMatricula(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Nome</label><input value={nome} onChange={e=>setNome(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Data Inicial</label><input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Hora Inicial</label><input type="time" value={horaIni} onChange={e=>setHoraIni(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Data Final</label><input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        <div><label className="text-sm text-gray-700 dark:text-gray-300">Hora Final</label><input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-900 dark:text-white">
                {['Posição','Nº Fogo','Medida','Fabricante','Modelo','Índice de Carga','DOT','Sulco 1','Sulco 2','Sulco 3','Pressão Encontrada'].map(h => (<th key={h} className="px-2 py-2">{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
              <tr key={i} className="bg-white/85 dark:bg-black/70 backdrop-blur-sm">
                <td className="px-2 py-1"><input value={r.posicao||''} onChange={e=>updateRow(i,'posicao',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-36 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.fogo||''} onChange={e=>updateRow(i,'fogo',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-28 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.medida||''} onChange={e=>updateRow(i,'medida',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-28 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.fabricante||''} onChange={e=>updateRow(i,'fabricante',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.modelo||''} onChange={e=>updateRow(i,'modelo',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.indice||''} onChange={e=>updateRow(i,'indice',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.dot||''} onChange={e=>updateRow(i,'dot',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-28 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.sulco1||''} onChange={e=>updateRow(i,'sulco1',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.sulco2||''} onChange={e=>updateRow(i,'sulco2',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.sulco3||''} onChange={e=>updateRow(i,'sulco3',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
                <td className="px-2 py-1"><input value={r.pressao||''} onChange={e=>updateRow(i,'pressao',e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={salvar} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">Salvar</button>
        </div>
      </div>
    </div>
  )
}
