import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Droplets, Truck, CheckSquare, Package } from 'lucide-react'

interface NavItem {
  path: string
  icon: React.ElementType
  label: string
}

interface TopNavigationProps {
  title?: string
  showLogo?: boolean
}

const TopNavigation: React.FC<TopNavigationProps> = ({ title = 'Checklist Mobile', showLogo = true }) => {
  const location = useLocation()

  const navItems: NavItem[] = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/irrigacao', icon: Droplets, label: 'Irrigação' },
    { path: '/cct', icon: Truck, label: 'CCT' },
    { path: '/checklists', icon: CheckSquare, label: 'Checklists' },
    { path: '/equipamentos', icon: Package, label: 'Equipamentos' },
  ]

  return (
    <header className="glass-morphism backdrop-blur-xs shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            {showLogo && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
            <div className={showLogo ? "ml-3" : ""}>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-1 py-4 text-sm font-medium whitespace-nowrap
                    ${isActive 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default TopNavigation