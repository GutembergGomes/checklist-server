import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  CheckSquare, 
  Package, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  Palette,
  BarChart3,
  FileText,
  Settings,
  User,
  Moon,
  Sun
} from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { TopNavigation } from '../components'

export default function DashboardPage() {
  const { 
    user, 
    checklists, 
    equipamentos,
    inspections,
    isOnline, 
    lastSync, 
    syncInProgress, 
    pendingSync,
    loadChecklists,
    loadEquipamentos,
    loadInspections,
    syncData 
  } = useAppStore()

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    loadChecklists()
    loadEquipamentos()
    loadInspections()
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const systemTheme = prefersDark ? 'dark' : 'light'
      setTheme('system')
      applyTheme(systemTheme)
    }
  }, [loadChecklists])

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Nunca sincronizado'
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Agora mesmo'
    if (diffMinutes < 60) return `${diffMinutes} min atrás`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const getEquipamentoLabel = (id: string) => {
    const eq = equipamentos.find((e) => e.id === id)
    return (eq?.descricao || eq?.codigo || id)
  }

  // Mock stats - in real app these would come from the store
  const stats = {
    totalInspecoes: (inspections || []).length,
    inspecoesHoje: (inspections || []).filter((i:any) => {
      const today = new Date().toDateString()
      const dt = new Date(i.created_at || i.data || Date.now()).toDateString()
      return dt === today
    }).length,
    equipamentosAtivos: (equipamentos || []).filter(e => e.ativo === true).length,
    nivelMedio: (() => {
      const arr = (inspections || [])
      const total = arr.length
      if (!total) return 0
      const avg = Math.round(arr.reduce((s:any,i:any)=> s + (i.results?.percentage || 0), 0) / total)
      return avg
    })()
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1585079542157-1cf538d927c0?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      {/* Header removed to evitar duplicidade com bottom navigation */}

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Like Web */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Inspeções</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInspecoes}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inspeções Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inspecoesHoje}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipamentos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.equipamentosAtivos}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm overflow-hidden shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nível Médio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.nivelMedio}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/cct"
                className="flex flex-col items-center p-4 rounded-lg bg-primary hover:bg-primary-dark text-white transition-all duration-200 interactive-scale"
              >
                <CheckSquare className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Novo Checklist CCT</span>
              </Link>
              
              <Link
                to="/equipamentos"
                className="flex flex-col items-center p-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 interactive-scale"
              >
                <Package className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Equipamentos</span>
              </Link>
            </div>
          </div>

          {/* Sync Status Card */}
          <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status de Sincronização</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Última sincronização</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatLastSync(lastSync)}
                </span>
              </div>
              
              {pendingSync > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pendentes</span>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                    {pendingSync} item{pendingSync !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Offline</span>
                    </>
                  )}
                </div>
              </div>
              
              <button
                onClick={syncData}
                disabled={syncInProgress || !isOnline}
                className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`} />
                <span>{syncInProgress ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Checklists */}
        <div className="bg-white/85 dark:bg-black/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Checklists Recentes</h3>
            <Link 
              to="/checklists" 
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              Ver todos →
            </Link>
          </div>
          
          {(inspections || []).length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum checklist encontrado</p>
              <Link 
                to="/cct" 
                className="inline-block mt-3 text-primary hover:text-primary-dark font-medium"
              >
                Criar primeiro checklist
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {(inspections || []).slice(0, 3).map((item:any, idx:number) => (
                <div key={item.local_id || idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.frota}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(item.created_at || item.data || Date.now().toString())}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (item.results?.percentage ?? 0) >= 70 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : (item.results?.percentage ?? 0) >= 40
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {(item.results?.percentage ?? 0) >= 70 ? 'Aprovado' : (item.results?.percentage ?? 0) >= 40 ? 'Atenção' : 'Crítico'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
