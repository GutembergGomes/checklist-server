import { Link, useLocation } from 'react-router-dom'
import { Home, CheckSquare, Package, Settings, QrCode } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export default function BottomNavigation() {
  const location = useLocation()
  const { pendingSync } = useAppStore()

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/checklists', icon: CheckSquare, label: 'Checklists' },
    { path: '/scanner', icon: QrCode, label: 'Scanner' },
    { path: '/equipamentos', icon: Package, label: 'Equipamentos' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center py-2 px-3 rounded-lg transition-colors
                ${isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }
              `}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.path === '/checklists' && pendingSync > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingSync}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}