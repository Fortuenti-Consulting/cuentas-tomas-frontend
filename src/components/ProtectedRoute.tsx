import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService, User } from '../services/api'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await authService.getMe()
        setUser(response.data)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
