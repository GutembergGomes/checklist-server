import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { App as CapApp } from '@capacitor/app'
import { useAppStore } from "./stores/appStore"

// Pages
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import ChecklistsPage from "./pages/ChecklistsPage"
import InspectionDetailsPage from "./pages/InspectionDetailsPage"
import ChecklistFormPage from "./pages/ChecklistFormPage"
import EquipamentosPage from "./pages/EquipamentosPage"
import ScannerPage from "./pages/ScannerPage"
import SincronizacaoPage from "./pages/SincronizacaoPage"
import ConfiguracoesPage from "./pages/ConfiguracoesPage"
import ComponentsShowcase from "./pages/ComponentsShowcase"
import IrrigacaoPage from "./pages/IrrigacaoPage"
import InventarioPage from "./pages/InventarioPage"
import CalibragemPage from "./pages/CalibragemPage"
import Controle3PPage from "./pages/Controle3PPage"
import HistoricoPneusPage from "./pages/HistoricoPneusPage"
import CCTPage from "./pages/CCTPage"

// Components
import LoadingSpinner from "./components/LoadingSpinner"
import { EnhancedBottomNavigation, ToastContainer, useToast, PageTransition } from "./components"

function App() {
  const { isAuthenticated, isLoading, checkAuth, initializeOfflineStorage } = useAppStore()
  const { toasts, showToast, hideToast } = useToast()

  useEffect(() => {
    // Initialize offline storage on app start
    initializeOfflineStorage()
    
    // Check authentication status
    checkAuth()
    // Handle Android back button to navigate to dashboard instead of exiting
    try {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        const loc = window.location.pathname
        if (canGoBack && loc !== '/dashboard') {
          window.history.back()
        } else {
          // Always go to dashboard instead of exiting
          window.location.href = '/dashboard'
        }
      })
    } catch {}
  }, [checkAuth, initializeOfflineStorage])

  useEffect(() => {
    const handler = (ev: any) => {
      const d = ev?.detail || {}
      if (d?.message) {
        showToast(d.message, d.type, d.duration)
      }
    }
    window.addEventListener('app:notify', handler as any)
    return () => {
      window.removeEventListener('app:notify', handler as any)
    }
  }, [showToast])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <div className="min-h-screen bg-gray-50 pb-24 md:pb-28">
                <div className="max-w-md mx-auto">
                  <PageTransition>
                    <Routes>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/checklists" element={<ChecklistsPage />} />
                      <Route path="/inspection/:id" element={<InspectionDetailsPage />} />
                      <Route path="/checklist/:id" element={<ChecklistFormPage />} />
                      <Route path="/equipamentos" element={<EquipamentosPage />} />
                      <Route path="/scanner" element={<ScannerPage />} />
                      <Route path="/sincronizacao" element={<SincronizacaoPage />} />
                      <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                      <Route path="/showcase" element={<ComponentsShowcase />} />
                      <Route path="/irrigacao" element={<IrrigacaoPage />} />
                      <Route path="/cct" element={<CCTPage />} />
                      <Route path="/inventario" element={<InventarioPage />} />
                      <Route path="/inventario/calibragem" element={<CalibragemPage />} />
                      <Route path="/inventario/controle3p" element={<Controle3PPage />} />
                      <Route path="/inventario/historico" element={<HistoricoPneusPage />} />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </PageTransition>
                </div>
                <EnhancedBottomNavigation />
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </Router>
  )
}

export default App
