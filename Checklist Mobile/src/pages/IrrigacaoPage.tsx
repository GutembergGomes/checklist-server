import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { offlineStorage } from '../utils/offlineStorage'
import { useNavigate } from 'react-router-dom'
import { TopNavigation } from '../components'
import { 
  Droplets, 
  BarChart3, 
  History as HistoryIcon, 
  FileText, 
  Settings,
  Save, 
  RotateCcw, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  Filter,
  Download,
  Calendar,
  User,
  Truck,
  Zap,
  Settings as SettingsIcon
} from 'lucide-react'
import { useEffect } from 'react'

// Equipment Selection Component
function EquipmentSelection({ onSelectEquipment }: { onSelectEquipment: (type: string) => void }) {
  const equipmentTypes = [
    {
      id: 'motobombas',
      name: 'MotoBombas',
      description: 'Sistema de bombas de irrigação',
      icon: Zap,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'hidroroll',
      name: 'Hidro Roll',
      description: 'Sistema de irrigação por rolamento',
      icon: SettingsIcon,
      color: 'green',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'caminhoes',
      name: 'Caminhões',
      description: 'Checklist dos caminhões de irrigação',
      icon: Truck,
      color: 'blue',
      gradient: 'from-blue-600 to-blue-700'
    },
    {
      id: 'tanques',
      name: 'Tanques',
      description: 'Checklist dos tanques de irrigação',
      icon: Droplets,
      color: 'green',
      gradient: 'from-green-600 to-green-700'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Nova Inspeção
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Selecione o tipo de equipamento para iniciar a inspeção
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {equipmentTypes.map((equipment) => {
          const IconComponent = equipment.icon
          return (
            <div
              key={equipment.id}
              onClick={() => onSelectEquipment(equipment.id)}
              className={`bg-gradient-to-br ${equipment.gradient} p-5 rounded-xl text-white cursor-pointer card-hover transition-all duration-200 hover:scale-105 hover:shadow-lg h-[116px] flex items-center`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 bg-${equipment.color}-500/90 rounded-lg flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{equipment.name}</h3>
                  <p className="text-xs text-white/80">{equipment.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Inspection Form Component
function InspectionForm({ equipmentType, onBack }: { equipmentType: string, onBack: () => void }) {
  const { user, equipamentos } = useAppStore()
  const [customFrota, setCustomFrota] = useState('')
  const [formData, setFormData] = useState({
    frota: '',
    pressao: '',
    vazao: '',
    ph: '',
    condutividade: '',
    temperatura: '',
    nivelReservatorio: '',
    filtros: 'limpo',
    bombas: 'funcionando',
    valvulas: 'normais',
    observacoes: ''
  })

  const filteredEquipments = equipamentos.filter(e => {
    const t = (e.tipo || '').toLowerCase()
    const target = equipmentType.toLowerCase()
    if (t === target) return true
    if (target === 'caminhoes' && (t === 'caminhao' || t === 'truck')) return true
    return false
  })

  const [savedData, setSavedData] = useState<any>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const requiredFields = ['frota', 'pressao', 'vazao', 'ph', 'condutividade']
    const isValid = requiredFields.every(field => formData[field as keyof typeof formData].trim() !== '')
    
    if (!isValid) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (formData.frota === 'custom' && !customFrota.trim()) {
       alert('Por favor, digite a identificação da frota.')
       return
    }

    const pressao = parseFloat(formData.pressao)
    const vazao = parseFloat(formData.vazao)
    const ph = parseFloat(formData.ph)
    const condutividade = parseFloat(formData.condutividade)

    let nivelManutencao = 'Bom'
    let percentual = 85

    if (pressao < 2.0 || pressao > 6.0 || vazao < 10 || vazao > 50 || ph < 6.0 || ph > 8.0 || condutividade > 1000) {
      nivelManutencao = 'Crítico'
      percentual = 35
    } else if (pressao < 3.0 || pressao > 5.0 || vazao < 15 || vazao > 40 || ph < 6.5 || ph > 7.5 || condutividade > 800) {
      nivelManutencao = 'Atenção'
      percentual = 65
    }

    const dataToSave = {
      ...formData,
      frota: formData.frota === 'custom' ? customFrota : formData.frota,
      nivelManutencao,
      percentual,
      equipmentType,
      data: new Date().toISOString(),
      usuario: user?.nome || 'Técnico'
    }

    setSavedData(dataToSave)
    alert('Inspeção de irrigação salva com sucesso!')
  }

  const handleClear = () => {
    setFormData({
      frota: '',
      pressao: '',
      vazao: '',
      ph: '',
      condutividade: '',
      temperatura: '',
      nivelReservatorio: '',
      filtros: 'limpo',
      bombas: 'funcionando',
      valvulas: 'normais',
      observacoes: ''
    })
    setSavedData(null)
  }

  const equipmentName = (
    equipmentType === 'motobombas' ? 'MotoBombas'
    : equipmentType === 'hidroroll' ? 'Hidro Roll'
    : equipmentType === 'caminhoes' ? 'Caminhões'
    : equipmentType === 'tanques' ? 'Tanques'
    : 'Equipamento'
  )

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <TrendingUp className="w-4 h-4 mr-2 rotate-180" />
          Voltar à seleção
        </button>
      </div>

      {/* Header */}
      <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Checklist - {equipmentName}
          </h3>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-300">Equipamento em reforma?</label>
            <select title="Equipamento em reforma" aria-label="Equipamento em reforma" className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {savedData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nível de Manutenção</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{savedData.nivelManutencao}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Percentual</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{savedData.percentual}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pressão</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{savedData.pressao} bar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                title="Data da inspeção"
                placeholder="Selecione a data"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frota <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select 
                  title="Selecionar frota" 
                  aria-label="Selecionar frota" 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.frota}
                  onChange={(e) => handleInputChange('frota', e.target.value)}
                >
                  <option value="">Selecione uma frota</option>
                  {filteredEquipments.map(eq => (
                    <option key={eq.id} value={eq.codigo}>{eq.codigo} - {eq.descricao}</option>
                  ))}
                  <option value="custom">Outro (digitar)</option>
                </select>
                <button type="button" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Gerenciar
                </button>
              </div>
              {formData.frota === 'custom' && (
                 <input 
                   type="text" 
                   placeholder="Digite a identificação da frota"
                   className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                   value={customFrota}
                   onChange={(e) => setCustomFrota(e.target.value)}
                 />
               )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Líder <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nome do líder responsável"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pressão (bar) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.pressao}
                onChange={(e) => handleInputChange('pressao', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: 4.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vazão (L/min) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.vazao}
                onChange={(e) => handleInputChange('vazao', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: 25.0"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                pH <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={formData.ph}
                onChange={(e) => handleInputChange('ph', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: 7.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condutividade (μS/cm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={formData.condutividade}
                onChange={(e) => handleInputChange('condutividade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: 500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperatura (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperatura}
                onChange={(e) => handleInputChange('temperatura', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: 25.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nível do Reservatório (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.nivelReservatorio}
                onChange={(e) => handleInputChange('nivelReservatorio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: 75"
              />
            </div>
          </div>
        </div>

        {/* Additional Fields */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado dos Filtros
            </label>
            <select
              title="Estado dos filtros"
              aria-label="Estado dos filtros"
              value={formData.filtros}
              onChange={(e) => handleInputChange('filtros', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="limpo">Limpo</option>
              <option value="parcialmente_sujo">Parcialmente Sujo</option>
              <option value="sujo">Sujo</option>
              <option value="obstruido">Obstruído</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado das Bombas
            </label>
            <select
              title="Estado das bombas"
              aria-label="Estado das bombas"
              value={formData.bombas}
              onChange={(e) => handleInputChange('bombas', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="funcionando">Funcionando</option>
              <option value="com_ruido">Com Ruído</option>
              <option value="superaquecendo">Superaquecendo</option>
              <option value="defeituosa">Defeituosa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado das Válvulas
            </label>
            <select
              title="Estado das válvulas"
              aria-label="Estado das válvulas"
              value={formData.valvulas}
              onChange={(e) => handleInputChange('valvulas', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="normais">Normais</option>
              <option value="vazamento">Com Vazamento</option>
              <option value="obstruida">Obstruída</option>
              <option value="quebrada">Quebrada</option>
            </select>
          </div>
        </div>

        {/* Observations */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Observações adicionais..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleClear}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Limpar</span>
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Inspeção</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// History Component
function HistorySection() {
  const [dateRange, setDateRange] = useState('30')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const { inspections, loadInspections } = useAppStore() as any
  useEffect(() => { loadInspections() }, [loadInspections])
  const filtered = (inspections || [])
    .filter((i:any) => {
      if (equipmentFilter === 'motobombas') return String(i.tipo||'').toLowerCase().includes('motobomba')
      if (equipmentFilter === 'hidroroll') return String(i.tipo||'').toLowerCase().includes('hidro')
      return true
    })
    .filter((i:any) => {
      const days = Number(dateRange)
      const d = new Date(i.data)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      return d >= cutoff
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Inspeções</h2>
        <div className="flex flex-wrap gap-3">
          <select 
            title="Filtrar por equipamento"
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Todos Equipamentos</option>
            <option value="motobombas">MotoBombas</option>
            <option value="hidroroll">Hidro Roll</option>
          </select>
          <select 
            title="Filtrar por período"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filtrar</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Equipamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Frota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Líder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Percentual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((item:any, idx:number) => (
                <tr key={item.local_id || idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(item.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.tipo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.frota}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.mecanico}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (item.results?.percentage ?? 0) >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      (item.results?.percentage ?? 0) >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {(item.results?.percentage ?? 0) >= 70 ? 'Bom' : (item.results?.percentage ?? 0) >= 40 ? 'Atenção' : 'Crítico'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.results?.percentage ?? 0}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark">Ver Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Analytics Component
function Analytics() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics - Irrigação</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Inspeções</p>
              <p className="text-3xl font-bold">156</p>
            </div>
            <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
            <HistoryIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Tempo Médio</p>
              <p className="text-3xl font-bold">25min</p>
            </div>
            <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Críticos</p>
              <p className="text-3xl font-bold">8</p>
            </div>
            <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Produtividade</p>
              <p className="text-3xl font-bold">92%</p>
            </div>
            <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance por Mês</h3>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400">Gráfico de Performance</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Equipamentos</h3>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400">Gráfico de Equipamentos</span>
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Problemas Críticos</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            8 ativos
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">MotoBomba MB-005</p>
              <p className="text-sm text-red-600 dark:text-red-400">Pressão baixa - 1.2 bar</p>
            </div>
            <span className="text-xs text-red-600 dark:text-red-400">Hoje</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reports Component
function Reports() {
  const [reportType, setReportType] = useState('geral')
  const [reportPeriod, setReportPeriod] = useState('30')
  const [reportFormat, setReportFormat] = useState('pdf')

  const quickReports = [
    {
      id: 'summary',
      name: 'Resumo Executivo',
      description: 'Visão geral das operações',
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Análise de produtividade',
      icon: TrendingUp,
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'maintenance',
      name: 'Manutenções',
      description: 'Relatório de problemas',
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600'
    },
    {
      id: 'trends',
      name: 'Tendências',
      description: 'Análise temporal',
      icon: BarChart3,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'compliance',
      name: 'Conformidade',
      description: 'Relatório de compliance',
      icon: CheckCircle,
      gradient: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 'costs',
      name: 'Custos',
      description: 'Análise financeira',
      icon: FileSpreadsheet,
      gradient: 'from-indigo-500 to-indigo-600'
    }
  ]

  const handleGenerateReport = () => {
    alert(`Gerando relatório ${reportType} em formato ${reportFormat} para os últimos ${reportPeriod} dias`)
  }

  const handleQuickReport = (type: string) => {
    alert(`Gerando relatório rápido: ${type}`)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios - Irrigação</h2>
      
      {/* Report Generator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Gerador de Relatórios</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Relatório
            </label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="geral">Relatório Geral</option>
              <option value="equipamento">Por Equipamento</option>
              <option value="mecanico">Por Líder</option>
              <option value="periodo">Por Período</option>
              <option value="criticos">Problemas Críticos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período
            </label>
            <select 
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Formato
            </label>
            <select 
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleGenerateReport}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar Relatório</span>
          </button>
          <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Agendar Envio</span>
          </button>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickReports.map((report) => {
          const IconComponent = report.icon
          return (
            <div
              key={report.id}
              onClick={() => handleQuickReport(report.id)}
              className={`bg-gradient-to-br ${report.gradient} p-6 rounded-xl text-white cursor-pointer card-hover transform transition-all duration-200 hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{report.name}</h3>
                  <p className="text-white text-opacity-80 text-sm">{report.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Equipment Management Component
function EquipmentManagement() {
  const [equipmentType, setEquipmentType] = useState('motobombas')
  const [fleet, setFleet] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('ativo')

  const handleSaveEquipment = () => {
    if (!fleet.trim()) {
      alert('Por favor, informe a frota')
      return
    }
    alert(`Equipamento ${fleet} cadastrado com sucesso!`)
    setFleet('')
    setDescription('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cadastro de Equipamentos</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Novo Equipamento</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Equipamento
            </label>
            <select 
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="motobombas">MotoBombas</option>
              <option value="hidroroll">Hidro Roll</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frota
            </label>
            <input
              type="text"
              value={fleet}
              onChange={(e) => setFleet(e.target.value)}
              placeholder="Ex: MB-001"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do equipamento"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleSaveEquipment}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Salvar Equipamento</span>
          </button>
          <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
            Atualizar Lista
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Equipamentos Cadastrados</h3>
          <div className="flex items-center gap-3">
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1">
              <option value="all">Todos</option>
              <option value="motobombas">MotoBombas</option>
              <option value="hidroroll">Hidro Roll</option>
              <option value="caminhoes">Caminhões</option>
              <option value="tanques">Tanques</option>
            </select>
            <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhum equipamento cadastrado ainda
        </div>
      </div>
    </div>
  )
}

export default function IrrigacaoPage() {
  const { allowedSections } = useAppStore() as any
  const [activeTab, setActiveTab] = useState('inicio')
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const navigate = useNavigate()

  const tabs = [
    { id: 'inicio', name: 'Início', icon: Droplets },
    { id: 'historico', name: 'Histórico', icon: HistoryIcon },
    { id: 'equipamentos', name: 'Equipamentos', icon: Settings }
  ]

  const handleEquipmentSelect = async (type: string) => {
    const id = crypto.randomUUID()
    let titulo = 'Checklist • Irrigação'
    let tipo = `irrigacao_${type}`
    let itens: any[] = []

    if (type === 'motobombas') {
      titulo = 'Checklist Irrigação - MotoBombas'
      itens = [
        { id: `${id}-pressao`, descricao: 'Parâmetros • Pressão (bar)', tipo: 'numero', ordem: 1 },
        { id: `${id}-vazao`, descricao: 'Parâmetros • Vazão (L/min)', tipo: 'numero', ordem: 2 },
        { id: `${id}-ph`, descricao: 'Parâmetros • pH', tipo: 'numero', ordem: 3 },
        { id: `${id}-cond`, descricao: 'Parâmetros • Condutividade (μS/cm)', tipo: 'numero', ordem: 4 },
        { id: `${id}-temp`, descricao: 'Parâmetros • Temperatura (°C)', tipo: 'numero', ordem: 5 },
        { id: `${id}-nivel`, descricao: 'Parâmetros • Nível do Reservatório (%)', tipo: 'numero', ordem: 6 },
        { id: `${id}-filtros`, descricao: 'Componentes • Filtros', tipo: 'opcoes', ordem: 7, opcoes: ['OK', 'Não OK', 'Não Aplica'] },
        { id: `${id}-bombas`, descricao: 'Componentes • Bombas', tipo: 'opcoes', ordem: 8, opcoes: ['OK', 'Não OK', 'Não Aplica'] },
        { id: `${id}-valvulas`, descricao: 'Componentes • Válvulas', tipo: 'opcoes', ordem: 9, opcoes: ['OK', 'Não OK', 'Não Aplica'] },
        { id: `${id}-foto`, descricao: 'Geral • Foto', tipo: 'foto', ordem: 10 },
      ]
    } else if (type === 'hidroroll') {
      titulo = 'Checklist Irrigação - Hidro Roll'
      const ok = ['OK', 'Não OK', 'Não Aplica']
      const add = (sec: string, name: string, ordem: number) => ({ id: `${id}-hidro-${ordem}`, descricao: `${sec} • ${name}`, tipo: 'opcoes', ordem, opcoes: ok })
      let ordem = 1
      itens = [
        ...[
          'Verificar pinos e folga do cabeçalho',
          'Verificar rala de giro',
          'Verificar parafusos da rala',
          'Verificar suporte e pino do giro',
          'Verificar estrutura do chassi',
          'Verificar desgaste e trincas da cremalheira',
          'Verificar folga no pino de recuo',
          'Verificar folga das alavancas da marcha',
          'Verificar funcionamento do farol de sinalização',
          'Verificar instalação do by pass',
          'Verificar painel de instrumentos e operação',
          'Verificar giroflex',
          'Verificar faróis (sinalizações e iluminação)',
          'Revisar alternador e baterias',
          'Verificar carenagens',
          'Verificar rolamentos',
          'Verificar desgaste da chaveta do guia',
          'Verificar desgaste da rosca do guia',
          'Verificar regular, limpar e lubrificar corrente do guia',
          'Verificar cavalete de desarme',
          'Verificar limpeza da sapata da ancoragem',
          'Verificar trocar juntas e abraçadeiras',
          'Verificar aspersor',
          'Verificar caixa do painel',
          'Verificar funcionamento do painel',
          'Verificar proteção dos cabos do painel',
          'Verificar sensores',
          'Verificar suspiro de óleo do redutor',
          'Verificar vazamento no retentor do redutor',
          'Verificar folga no eixo do redutor',
          'Verificar sistema de freio do redutor',
          'Verificar redutor e corrente do guia',
          'Verificar fixação do moto redutor',
          'Verificar válvula do moto redutor',
          'Verificar partes móveis pintura e proteção',
          'Verificar pino de freio',
          'Verificar selo mecânico da turbina',
          'Verificar correia, esticador e polia da turbina',
          'Verificar vazamentos nas mangueiras',
          'Verificar sistema by pass',
          'Verificar regular e limpar rolo do guia da mangueira',
          'Verificar cubos do redutor',
          'Verificar parafusos do cubo',
          'Reapertar rodas',
          'Conferir parafusos e porcas',
          'Colocar tampa de válvula',
          'Calibrar pneus e medir sulco',
          'Inventariar pneus equipamento',
          'Desmontar, lavar peças, examinar, engraxar e montar (cubos de roda)',
        ].map(n => add('TIPO DE SERVIÇO', n, ordem++)),
      ]
    } else if (type === 'caminhoes') {
      titulo = 'Checklist de Liberação - Caminhão'
      const ok = ['OK', 'Não OK', 'Não Aplica']
      const add = (sec: string, name: string, ordem: number) => ({ id: `${id}-truck-${ordem}`, descricao: `${sec} • ${name}`, tipo: 'opcoes', ordem, opcoes: ok })
      let ordem = 1
      const itemsList = [
        // CABINE
        ...[
          'Bucha da suspensão',
          'Batente e dobradiça portas',
          'Borrachas das portas',
          'Palhetas do limpador para-brisa',
          'Maçanetas (internas/externas) e manivela dos vidros',
          'Bancos (motorista e passageiro)',
          'Conjunto de basculamento da cabine',
          'Reservatório e mangueira do limpador de para-brisa',
          'Estado da escada',
          'Estado dos retrovisores',
          'Paralama dianteiro',
        ].map(n => add('CABINE', n, ordem++)),
        // CHASSI
        ...[
          'Trincas no chassi e travessas',
          'Rampa e quinta roda',
          'Suportes de fixação (tq combustível, bateria, tq arla)',
          'Danos paralamas traseiros',
          'Danos e fixação do para barro',
          'Trincas e fixação da boca de lobo',
          'Parafuso de fixação do implemento',
          'Plataformas e suportes dos cones',
        ].map(n => add('CHASSI', n, ordem++)),
        // MOTOR
        ...[
          'Radiadores, reservatório de água e intercooler',
          'Tensores de correia, roletes e polias',
          'Mangueiras e abraçadeiras do sist. de arrefecimento',
          'Mangueiras e abraçadeiras do sist. de admissão e intercooler',
          'Regulagem de válvulas do motor e vazamentos (água/diesel/lub)',
          'Coxins do motor',
          'Protetores e fixação do silencioso',
          'Folga no eixo da turbina ou vazamentos',
          'Carcaça do filtro e tubulação de ar',
        ].map(n => add('MOTOR', n, ordem++)),
        // SISTEMA ELÉTRICO
        ...[
          'Sinalização traseira e dianteira',
          'Faróis e piscas',
          'Chicotes elétricos',
          'Luzes do painel',
          'Alternador, correia e tensor',
          'Ventilador, correia e tensor',
          'Funcionamento dos vidros',
          'Ar condicionado',
          'Ventilador e distribuição do ar',
          'Funcionamento do limpador de para-brisa',
          'Motor de partida',
        ].map(n => add('SISTEMA ELÉTRICO', n, ordem++)),
        // TRANSMISSÃO
        ...[
          'Embreagem (folga/funcionamento)',
          'Caixa de câmbio (vazamentos/ruídos)',
          'Cardans e cruzetas',
          'Acoplamentos e flanges',
          'Diferencial (fixação/vazamentos)',
          'Semieixos e juntas',
          'Suportes e coxins da transmissão',
        ].map(n => add('TRANSMISSÃO', n, ordem++)),
        // EIXO DIANTEIRO
        ...[
          'Rolamentos e cubos',
          'Manga de eixo',
          'Amortecedores',
          'Molas/feixes e fixações',
          'Barra estabilizadora',
          'Barra de direção e terminais',
          'Geometria/folgas de direção',
        ].map(n => add('EIXO DIANTEIRO', n, ordem++)),
        // EIXO TRASEIRO
        ...[
          'Molas/feixes e fixações',
          'Amortecedores',
          'Braços/estabilizadores',
          'Rolamentos e cubos',
          'Eixo/diferencial (ruídos/vazamentos)',
        ].map(n => add('EIXO TRASEIRO', n, ordem++)),
        // SISTEMA PNEUMÁTICO
        ...[
          'Reservatórios de ar',
          'Válvulas e conexões',
          'Mangueiras e flexíveis',
          'Câmaras de freio',
          'Tubulações do sistema',
          'Vazamentos/pressão',
        ].map(n => add('SISTEMA PNEUMÁTICO', n, ordem++)),
        // DIREÇÃO
        ...[
          'Bomba da direção',
          'Caixa de direção',
          'Mangueiras e vazamentos',
          'Folgas no sistema',
          'Alinhamento/funcionamento',
        ].map(n => add('DIREÇÃO', n, ordem++)),
      ]
      itens = itemsList
    } else if (type === 'tanques') {
      titulo = 'Checklist de Liberação - Tanques'
      const ok = ['OK', 'Não OK', 'Não Aplica']
      const add = (sec: string, name: string, ordem: number) => ({ id: `${id}-tank-${ordem}`, descricao: `${sec} • ${name}`, tipo: 'opcoes', ordem, opcoes: ok })
      let ordem = 1
      itens = [
        ...[
          'VERIFICAR MESA (ESTRUTURA, TRINCAS)',
          'VERIFICAR CHAPA DE FIXAÇÃO',
          'SOLDA NO CABEÇALHO - REPARAR SE NECESSÁRIO',
          'CORRIGIR TRINCAS',
          'PINTURA - REFAZER',
          'CATALOGAR PEÇAS',
          'DESMONTAR CUBOS DE RODA',
          'LAVAR E VERIFICAR ROLAMENTOS',
          'MONTAR CUBOS',
          'CORRIGIR TRINCAS E FUROS - REPARAR SE NECESSÁRIO',
          'CORRIGIR CORRIMÃO - REPARAR SE NECESSÁRIO',
        ].map(n => add('TIPO DE SERVIÇO', n, ordem++)),
      ]
    }

    await offlineStorage.saveChecklist({ id, equipamento_id: '', tipo, titulo, itens, created_locally: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
    navigate(`/checklist/${id}`)
  }

  const handleBackToSelection = () => {
    setSelectedEquipment(null)
  }

  const renderContent = () => {
    if (activeTab === 'inicio') {
      if (selectedEquipment) {
        return <InspectionForm equipmentType={selectedEquipment} onBack={handleBackToSelection} />
      } else {
        return <EquipmentSelection onSelectEquipment={handleEquipmentSelect} />
      }
    }

    switch (activeTab) {
      case 'historico':
        return <HistorySection />
      case 'analytics':
        return <Analytics />
      case 'relatorios':
        return <Reports />
      case 'equipamentos':
        return <EquipmentManagement />
      default:
        return <EquipmentSelection onSelectEquipment={handleEquipmentSelect} />
    }
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1509395176047-4b1bb7d0a3c7?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      {/* Header removido (duplicado com bottom navigation) */}
      {/* Access control: bloquear se usuário não tiver seção 'irrigacao' */}
      {Array.isArray(allowedSections) && allowedSections.length > 0 && !allowedSections.includes('irrigacao') && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            Acesso restrito: seu usuário não possui permissão para Irrigação.
          </div>
        </main>
      )}

      {/* Tab Navigation */}
      <div className="bg-white/90 dark:bg-black/70 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSelectedEquipment(null)
                  }}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  )
}
