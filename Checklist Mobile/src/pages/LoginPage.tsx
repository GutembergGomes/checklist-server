import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login, signUp } = useAppStore()

  const [isResetMode, setIsResetMode] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' })

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) return

    setIsLoading(true)
    setResetMessage({ type: '', text: '' })

    try {
      // Usar a URL do site como base para o redirecionamento
      // Em produção, isso deve ser a URL do seu site web (ex: https://seu-site.com/reset-password.html)
      // Se não configurar redirectTo, o Supabase usará a configuração padrão do painel
      const { error } = await useAppStore.getState().resetPasswordForEmail(resetEmail)
      
      if (error) throw error

      setResetMessage({ 
        type: 'success', 
        text: 'Email de recuperação enviado! Verifique sua caixa de entrada.' 
      })
      setTimeout(() => setIsResetMode(false), 3000)
    } catch (err: any) {
      console.error(err)
      setResetMessage({ 
        type: 'error', 
        text: err.message || 'Erro ao enviar email de recuperação.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isResetMode) {
    return (
      <div
        className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white bg-cover bg-center bg-no-repeat relative flex items-center justify-center px-4"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1600&q=60)' }}
      >
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
        <div className="relative w-full max-w-sm">
          <div className="bg-white/90 dark:bg-black/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Recuperar Senha</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 text-center">
              Informe seu email para receber o link de redefinição de senha.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              {resetMessage.text && (
                <div className={`flex items-center text-sm p-3 rounded-lg ${resetMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {resetMessage.type === 'error' && <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />}
                  {resetMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Enviando...' : 'Enviar Link'}
              </button>

              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="w-full border border-gray-300 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Voltar
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      setIsLoading(false)
      return
    }

    let success = false
    if (isSignUpMode) {
      success = await signUp(email, password)
      if (!success) {
         // Erro tratado no store, mas podemos reforçar aqui
      }
    } else {
      success = await login(email, password)
      if (!success) {
        setError('Email ou senha inválidos')
      }
    }
    
    setIsLoading(false)
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white bg-cover bg-center bg-no-repeat relative flex items-center justify-center px-4"
      style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1600&q=60)' }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">CM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isSignUpMode ? 'Criar Conta' : 'Checklist Mobile'}
          </h1>
          <p className="text-gray-300">
            {isSignUpMode ? 'Preencha os dados para se cadastrar' : 'Sistema de Checklist de Manutenção'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/90 dark:bg-black/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center text-red-600 text-sm bg-red-50 p-2 rounded">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (isSignUpMode ? 'Cadastrando...' : 'Entrando...') : (isSignUpMode ? 'Cadastrar' : 'Entrar')}
            </button>
          </form>

          <div className="mt-6 flex flex-col space-y-2 text-center text-sm">
            {!isSignUpMode && (
              <button
                type="button"
                onClick={() => setIsResetMode(true)}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Esqueceu a senha?
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setIsSignUpMode(!isSignUpMode)
                setError('')
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {isSignUpMode ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          <p className="mb-2">Dados de demonstração:</p>
          <p>Email: tecnico@empresa.com</p>
          <p>Senha: demo123</p>
        </div>
      </div>
    </div>
  )
}
