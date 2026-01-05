import { useNavigate } from 'react-router-dom'
import { Gauge, ListChecks, FileSpreadsheet, History } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export default function InventarioPage() {
  const navigate = useNavigate()
  const { allowedSections } = useAppStore() as any
  const cards = [
    { id: 'calibragem', title: 'Calibragem', desc: 'Lançar pressão e posições', icon: ListChecks, path: '/inventario/calibragem' },
    { id: 'controle3p', title: 'Ficha de Controle 3P', desc: 'Sulco, DOT e pressão', icon: FileSpreadsheet, path: '/inventario/controle3p' },
    { id: 'historico', title: 'Histórico de Pneus', desc: 'Calibragens e Fichas 3P', icon: History, path: '/inventario/historico' },
  ]
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative max-w-md mx-auto px-4 py-6">
        <div className="glassmorphism rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inventário de Pneus</h2>
              <p className="text-xs text-gray-800 dark:text-white">Selecione a ficha desejada</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {cards.map(c => {
            const Icon = c.icon
            return (
              <div key={c.id} onClick={() => navigate(c.path)} className="bg-white/80 dark:bg-black/70 backdrop-blur-sm p-5 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-primary transition-all duration-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                    <p className="text-sm text-gray-700 dark:text-white">{c.desc}</p>
                </div>
              </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
