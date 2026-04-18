import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

const navigationItems = [
  { label: 'Inicio', path: '/' },
  { label: 'Obligaciones', path: '/obligaciones' },
  { label: 'Gastos', path: '/gastos' },
  { label: 'Pagos', path: '/pagos' },
  { label: 'Reportes', path: '/reportes' },
  { label: 'Auditoría', path: '/auditoria' },
]

export const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavClick = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-white shadow-sm p-6 min-h-[calc(100vh-4rem)]">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Navegación</h2>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left text-sm px-4 py-2 rounded font-semibold transition ${
                location.pathname === item.path
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform z-50 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl ml-auto block mb-4"
          >
            ×
          </button>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Navegación</h2>
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full text-left text-sm px-4 py-2 rounded font-semibold transition ${
                  location.pathname === item.path
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed md:hidden bottom-4 right-4 z-40 bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  )
}
