import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'

export const LoginPage = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'ricardo' | 'catherine'>('ricardo')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authService.login(password)
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Cuentas Tomás</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Seguimiento de obligaciones y gastos compartidos</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">¿Quién eres?</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('ricardo')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  selectedRole === 'ricardo'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ricardo
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('catherine')}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  selectedRole === 'catherine'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Catherine
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        {(import.meta as any).env.DEV && (
          <p className="text-center text-gray-500 text-xs mt-6">
            Ricardo: ricardo123 | Catherine: catherine123
          </p>
        )}
      </div>
    </div>
  )
}
