import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Menu, LogOut, ChevronDown } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

interface User {
  id: string
  display_name: string
  role: string
}

interface HeaderProps {
  onMenuClick: () => void
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const initial = user?.display_name?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            aria-label="Abrir menú"
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 truncate">
            Cuentas Tomás
          </h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <NotificationBell />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menú de usuario"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm">
                {initial}
              </span>
              <span className="text-sm font-medium hidden sm:inline">
                {user?.display_name}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.display_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
