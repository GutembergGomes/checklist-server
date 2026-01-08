import { useEffect, useState } from 'react'
import { offlineStorage } from '../utils/offlineStorage'
import { useAppStore } from '../stores/appStore'
import { createApiClient } from '../utils/apiClient'
import { Browser } from '@capacitor/browser'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const api = createApiClient()

function ConfiguracoesPage() {
  const [usage, setUsage] = useState<{ used: number; quota: number; percentage: number }>({ used: 0, quota: 0, percentage: 0 })
  const { logout } = useAppStore()

  useEffect(() => {
    offlineStorage.getStorageUsage().then(setUsage)
  }, [])

  return (
    <div className="min-h-screen bg-primary-gradient text-white p-4">
      <div className="glassmorphism rounded-xl p-4">
        <h1 className="text-lg font-semibold mb-4">Configurações</h1>
        <div className="text-sm space-y-2">
          <div>Armazenamento usado: {Number.isFinite(usage.used) ? (usage.used / (1024*1024)).toFixed(2) : '0.00'} MB</div>
          <div>Cota: {Number.isFinite(usage.quota) ? (usage.quota / (1024*1024)).toFixed(2) : '0.00'} MB</div>
          <div>Percentual: {Number.isFinite(usage.percentage) ? usage.percentage.toFixed(1) : '0.0'}%</div>
        </div>
      </div>

      <div className="glassmorphism rounded-xl p-4 mt-4 space-y-3">
        <h2 className="text-base font-semibold">Conta</h2>
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
        >
          Sair da conta
        </button>
      </div>

      <div className="glassmorphism rounded-xl p-4 mt-4 space-y-3">
        <h2 className="text-base font-semibold">Atualização</h2>
        <p className="text-sm text-white/80">Verifique se há atualização disponível e instale a versão mais recente.</p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              try {
                const { data, error } = await api
                  .from('app_updates')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .limit(1)
                if (error) throw error
                const latest = Array.isArray(data) && data.length ? data[0] : null
                const fallback = 'https://trae9q14wjs1.vercel.app/app-debug.apk'
                const base = latest?.apk_url || latest?.url || fallback
                const url = base.includes('?') ? `${base}&download=1` : `${base}?download=1`
                await Browser.open({ url })
              } catch (e) {
                alert('Não foi possível verificar atualizações')
              }
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg"
          >
            Verificar atualização
          </button>
          <button
            onClick={async () => {
              try {
                const { data } = await api
                  .from('app_updates')
                  .select('apk_url')
                  .order('created_at', { ascending: false })
                  .limit(1)
                const latest = Array.isArray(data) && data.length ? data[0] : null
                const base = latest?.apk_url
                const url = base ? (base.includes('?') ? `${base}&download=1` : `${base}?download=1`) : null
                if (!url) {
                  alert('URL de APK não encontrada')
                  return
                }
                const fileName = `app-update-${Date.now()}.apk`
                const resp = await fetch(url)
                const blob = await resp.blob()
                const toBase64 = (b: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(b) })
                const b64 = await toBase64(blob)
                await Filesystem.writeFile({ path: `Download/${fileName}`, data: b64, directory: Directory.External })
                await Share.share({ title: 'Instalar atualização', text: 'Toque para instalar o APK', files: [`Download/${fileName}`] })
              } catch {
                alert('Falha ao baixar/instalar APK. Verifique permissões de armazenamento e tente novamente.')
              }
            }}
            className="px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10"
          >
            Baixar e instalar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfiguracoesPage
