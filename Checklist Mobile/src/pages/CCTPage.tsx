import { useMemo, useState, useEffect } from 'react'
import { Truck, Save, RotateCcw, BarChart3, AlertTriangle, CheckCircle, Thermometer, Tractor, Factory, Package, Layers, Wrench, Loader, Cog } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { TopNavigation, EnhancedCard } from '../components'
import { offlineStorage } from '../utils/offlineStorage'
import { buildLegacyItems, legacyTemplates } from '../utils/legacyTemplates'
import { useNavigate } from 'react-router-dom'

export default function CCTPage() {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<'inicio'|'historico'|'equipamentos'>('inicio')
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    temperatura: '',
    umidade: '',
    pressao: '',
    coqueQuente: '',
    coqueFrio: '',
    qualidade: 'boa',
    observacoes: ''
  })

  const [savedData, setSavedData] = useState<any>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const metrics = useMemo(() => {
    const t = parseFloat(formData.temperatura || '0')
    const u = parseFloat(formData.umidade || '0')
    const p = parseFloat(formData.pressao || '0')
    const within = [t>=1050 && t<=1150, u<=10, p>=0.8 && p<=1.5]
    const itensOK = within.filter(Boolean).length
    const itensNaoOK = within.length - itensOK
    const percentual = Math.round((itensOK/within.length)*100)
    let nivelManutencao = 'Bom'
    if (percentual < 40) nivelManutencao = 'Crítico'
    else if (percentual < 70) nivelManutencao = 'Atenção'
    return { itensOK, itensNaoOK, percentual, nivelManutencao }
  }, [formData])

  const handleSave = () => {
    // Validate required fields
    const requiredFields = ['temperatura', 'umidade', 'pressao']
    const isValid = requiredFields.every(field => formData[field as keyof typeof formData].trim() !== '')
    
    if (!isValid) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    // Calculate maintenance level based on values
    const temperatura = parseFloat(formData.temperatura)
    const umidade = parseFloat(formData.umidade)
    const pressao = parseFloat(formData.pressao)

    let nivelManutencao = 'Bom'
    let percentual = 85

    if (temperatura > 1200 || temperatura < 1000 || umidade > 15 || pressao < 0.5 || pressao > 2.0) {
      nivelManutencao = 'Crítico'
      percentual = 35
    } else if (temperatura > 1150 || temperatura < 1050 || umidade > 10 || pressao < 0.8 || pressao > 1.5) {
      nivelManutencao = 'Atenção'
      percentual = 65
    }

    const dataToSave = {
      ...formData,
      nivelManutencao,
      percentual,
      data: new Date().toISOString(),
      usuario: user?.nome || 'Técnico'
    }

    setSavedData(dataToSave)
    
    // Show success message
    alert('Inspeção de CCT salva com sucesso!')
  }

  const handleClear = () => {
    setFormData({
      temperatura: '',
      umidade: '',
      pressao: '',
      coqueQuente: '',
      coqueFrio: '',
      qualidade: 'boa',
      observacoes: ''
    })
    setSavedData(null)
  }

  const equipmentCards = [
    { id:'caminhao', title:'Caminhão', desc:'Checklist completo para liberação de caminhões', icon: Truck },
    { id:'trator', title:'Trator', desc:'Checklist para liberação de tratores agrícolas', icon: Tractor },
    { id:'colhedora', title:'Colhedora', desc:'Checklist para colhedoras de cana', icon: Factory },
    { id:'plantadora', title:'Plantadora de Cana', desc:'Checklist de reforma/entressafra', icon: Cog },
    { id:'distribuidora', title:'Distribuidora de Cana', desc:'Checklist de reforma/entressafra', icon: Package },
    { id:'cobridores', title:'Cobridores', desc:'Checklist de reforma/entressafra', icon: Layers },
    { id:'reboque', title:'Reboque', desc:'Checklist para reboques e semi-reboques', icon: Wrench },
    { id:'transbordo', title:'Transbordo', desc:'Checklist de manutenção de transbordos', icon: Loader },
    { id:'tortao', title:'Tortão', desc:'Checklist conforme PDF, por seção', icon: Cog },
  ]

  const mapTipo = (id: string) => ({ caminhao: 'truck' }[id] || id)

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1537151625747-768eb6cf92b7?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      {/* Header removido (duplicado com bottom navigation) */}
      {/* Access control: bloquear se usuário não tiver seção 'cct' */}
      {(() => {
        const { allowedSections } = useAppStore() as any
        if (Array.isArray(allowedSections) && allowedSections.length && !allowedSections.includes('cct')) {
          return (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                Acesso restrito: seu usuário não possui permissão para CCT.
              </div>
            </main>
          )
        }
        return null
      })()}

      <div className="bg-white/90 dark:bg-black/70 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {(['inicio','historico','equipamentos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedEquipment(null) }}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab===tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab==='inicio'?'Início':tab.charAt(0).toUpperCase()+tab.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab==='inicio' && (
          !selectedEquipment ? (
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Nova Inspeção</h2>
                <p className="text-gray-600 dark:text-gray-400">Selecione o tipo de equipamento para iniciar a inspeção</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipmentCards.map(c => (
                  <EnhancedCard key={c.id} title={c.title} description={c.desc} icon={c.icon as any} onClick={async () => {
                    try {
                      const id = crypto.randomUUID()
                      const itens = buildLegacyItems(c.id as any)
                      const tpl = (legacyTemplates as any)[c.id]
                      const checklist = {
                        id,
                        equipamento_id: c.id,
                        tipo: mapTipo(c.id),
                        titulo: (tpl?.title || `Checklist - ${c.title}`),
                        itens,
                        data_prevista: new Date().toISOString(),
                        status: 'em_andamento',
                        criado_por: (useAppStore.getState().user?.id || ''),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        created_locally: true,
                      }
                      await offlineStorage.saveChecklist(checklist as any)
                      navigate(`/checklist/${id}`)
                    } catch (e) {
                      console.error('Falha ao iniciar checklist:', e)
                      setSelectedEquipment(c.id)
                    }
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mb-6">
                <button onClick={() => setSelectedEquipment(null)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <Truck className="w-4 h-4 mr-2" /> Voltar à seleção
                </button>
              </div>
              <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Checklist - {selectedEquipment}</h3>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Equipamento em reforma?</label>
                    <select title="Equipamento em reforma" className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="p-6 flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-4"><CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nível de Manutenção</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.nivelManutencao}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="p-6 flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4"><BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Percentual</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.percentual}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="p-6 flex items-center">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-4"><Thermometer className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Temperatura</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formData.temperatura || '-'}°C</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temperatura (°C) <span className="text-red-500">*</span></label>
                      <input type="number" step="1" value={formData.temperatura} onChange={(e)=>handleInputChange('temperatura', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Ex: 1100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Umidade (%) <span className="text-red-500">*</span></label>
                      <input type="number" step="0.1" min="0" max="100" value={formData.umidade} onChange={(e)=>handleInputChange('umidade', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Ex: 8.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pressão (bar) <span className="text-red-500">*</span></label>
                      <input type="number" step="0.1" value={formData.pressao} onChange={(e)=>handleInputChange('pressao', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Ex: 1.2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coque Quente (ton)</label>
                      <input type="number" step="0.1" value={formData.coqueQuente} onChange={(e)=>handleInputChange('coqueQuente', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Ex: 150.5" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coque Frio (ton)</label>
                      <input type="number" step="0.1" value={formData.coqueFrio} onChange={(e)=>handleInputChange('coqueFrio', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Ex: 145.2" />
                    </div>
                    <div>
                      <label htmlFor="qualidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qualidade do Coque</label>
                      <select id="qualidade" title="Qualidade do coque" value={formData.qualidade} onChange={(e)=>handleInputChange('qualidade', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="excelente">Excelente</option>
                        <option value="boa">Boa</option>
                        <option value="regular">Regular</option>
                        <option value="ruim">Ruim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observações</label>
                      <textarea value={formData.observacoes} onChange={(e)=>handleInputChange('observacoes', e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Observações sobre o processo de coqueificação..." />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resultado da Inspeção</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center"><div className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.itensOK}</div><div className="text-sm text-gray-500 dark:text-gray-400">Itens OK</div></div>
                    <div className="text-center"><div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.itensNaoOK}</div><div className="text-sm text-gray-500 dark:text-gray-400">Itens NÃO OK</div></div>
                    <div className="text-center"><div className="text-2xl font-bold text-primary">{metrics.percentual}%</div><div className="text-sm text-gray-500 dark:text-gray-400">Percentual</div></div>
                    <div className="text-center"><div className="text-sm font-medium text-gray-900 dark:text-white">Nível de Manutenção: {metrics.nivelManutencao}</div></div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button onClick={handleClear} className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center space-x-2"><RotateCcw className="w-4 h-4" /><span>Limpar</span></button>
                  <button onClick={handleSave} className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 flex items-center justify-center space-x-2"><Save className="w-4 h-4" /><span>Salvar Inspeção</span></button>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab==='historico' && (
          <CCTHistory />
        )}


        {activeTab==='equipamentos' && (
          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Equipamentos • CCT</h3>
            <p className="text-gray-600 dark:text-gray-400">Cadastro e gestão de equipamentos do CCT.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function CCTHistory() {
  const { inspections, loadInspections } = useAppStore() as any
  const [typeFilter, setTypeFilter] = useState('all')
  useEffect(() => { loadInspections() }, [loadInspections])
  const filtered = (inspections||[]).filter((i:any)=> {
    if (typeFilter==='all') return true
    return String(i.tipo||'').toLowerCase().includes(typeFilter)
  })
  return (
    <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico • CCT</h3>
        <select aria-label="Filtrar por tipo de equipamento" title="Filtrar por tipo de equipamento" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1">
          <option value="all">Todos</option>
          <option value="truck">Caminhão</option>
          <option value="trator">Trator</option>
          <option value="colhedora">Colhedora</option>
          <option value="plantadora">Plantadora</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Equipamento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Frota</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Líder</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">% OK</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((item:any, idx:number)=> (
              <tr key={item.local_id||idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.tipo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.frota}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.mecanico}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.results?.percentage ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
