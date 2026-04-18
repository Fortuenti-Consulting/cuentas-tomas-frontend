import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { NotificationBell } from './NotificationBell'

interface User {
  id: string
  display_name: string
  role: string
}

export const Header = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Cuentas Tomás</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell />
          <span className="text-gray-600 text-sm hidden sm:inline">{user?.display_name}</span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  )
}
