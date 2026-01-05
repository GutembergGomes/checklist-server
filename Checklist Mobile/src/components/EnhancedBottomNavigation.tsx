import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Package, Settings, QrCode, Droplets, Gauge, MoreHorizontal, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import AnimatedBadge from './AnimatedBadge';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  showBadge?: boolean;
}

const EnhancedBottomNavigation: React.FC = () => {
  const location = useLocation();
  const { pendingSync, allowedSections } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu when location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const allNavItems: NavItem[] = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/irrigacao', icon: Droplets, label: 'Irrigação' },
    { path: '/cct', icon: Package, label: 'CCT' },
    { path: '/inventario', icon: Gauge, label: 'Inventário' },
    { path: '/checklists', icon: CheckSquare, label: 'Checklists', showBadge: true },
    { path: '/equipamentos', icon: Package, label: 'Equipamentos' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const sectionFromPath = (p: string) => {
    if (p.startsWith('/irrigacao')) return 'irrigacao'
    if (p.startsWith('/cct')) return 'cct'
    return 'general'
  }
  const navItems = allNavItems.filter((i) => {
    const sec = sectionFromPath(i.path)
    if (sec === 'general') return true
    if (!allowedSections || allowedSections.length === 0) return true
    return allowedSections.includes(sec)
  })

  // Determine items to show directly vs in menu
  // We can fit 5 items comfortably. If more than 5, show 4 + More.
  const MAX_VISIBLE_ITEMS = 5;
  const showMoreButton = navItems.length > MAX_VISIBLE_ITEMS;
  
  const visibleItems = showMoreButton ? navItems.slice(0, 4) : navItems;
  const hiddenItems = showMoreButton ? navItems.slice(4) : [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg
                  border-t border-gray-200 shadow-2xl z-40 safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto px-2 py-2 relative">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                nav-item flex flex-col items-center py-2 px-1 flex-1 min-w-0 rounded-xl
                transition-all duration-300 relative group
                ${isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }
              `}
            >
              {/* Animated indicator */}
              <div className={`
                nav-indicator absolute -top-1 w-8 h-1 bg-blue-600 rounded-full
                transition-all duration-300
                ${isActive ? 'opacity-100' : 'opacity-0'}
              `} />
              
              <div className="relative">
                <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                {item.showBadge && pendingSync > 0 && (
                  <AnimatedBadge
                    count={pendingSync}
                    type="sync"
                    pulse={true}
                    bounce={true}
                  />
                )}
              </div>
              
              <span className={`
                text-[10px] mt-1 transition-all duration-300 truncate w-full text-center
                ${isActive ? 'font-semibold' : 'font-medium'}
              `}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        {showMoreButton && (
          <div className="relative flex-1 flex justify-center" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`
                nav-item flex flex-col items-center py-2 px-1 w-full rounded-xl
                transition-all duration-300 relative group
                ${isMenuOpen 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }
              `}
            >
               <div className="relative">
                {isMenuOpen ? (
                   <X className="w-6 h-6 transition-transform duration-300" />
                ) : (
                   <MoreHorizontal className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                )}
                
                {/* Check if any hidden item has a badge/pending sync */}
                {hiddenItems.some(item => item.showBadge) && pendingSync > 0 && (
                   <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium truncate w-full text-center">
                Mais
              </span>
            </button>

            {/* Popup Menu */}
            {isMenuOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-48 bg-white/95 backdrop-blur-xl 
                            rounded-2xl shadow-xl border border-gray-100 overflow-hidden 
                            animate-slide-up origin-bottom-right z-50">
                <div className="p-2 space-y-1">
                  {hiddenItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center space-x-3 px-4 py-3 rounded-xl
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`
                          p-2 rounded-lg
                          ${isActive ? 'bg-blue-100' : 'bg-gray-100'}
                        `}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.showBadge && pendingSync > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {pendingSync}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default EnhancedBottomNavigation;
