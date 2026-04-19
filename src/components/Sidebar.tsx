import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Home, Calendar, Receipt, CreditCard, FileText, Shield, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  path: string
  Icon: LucideIcon
}

const navigationItems: NavItem[] = [
  { label: 'Inicio', path: '/', Icon: Home },
  { label: 'Obligaciones', path: '/obligaciones', Icon: Calendar },
  { label: 'Gastos', path: '/gastos', Icon: Receipt },
  { label: 'Pagos', path: '/pagos', Icon: CreditCard },
  { label: 'Reportes', path: '/reportes', Icon: FileText },
  { label: 'Auditoría', path: '/auditoria', Icon: Shield },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavClick = (path: string) => {
    navigate(path)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const renderNavButton = (item: NavItem, isMobile: boolean) => {
    const isActive = location.pathname === item.path
    const Icon = item.Icon
    return (
      <button
        key={item.path}
        onClick={() => (isMobile ? handleNavClick(item.path) : navigate(item.path))}
        className={`group w-full flex items-center gap-3 text-left text-sm px-3 py-2.5 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 border-l-[3px] border-indigo-600 pl-[9px]'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${
            isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 bg-white shadow-sm p-4 min-h-[calc(100vh-4rem)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-3">
          Navegación
        </h2>
        <nav className="space-y-1">
          {navigationItems.map((item) => renderNavButton(item, false))}
        </nav>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-200 ease-out z-50 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navegación principal"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-indigo-600">Cuentas Tomás</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navigationItems.map((item) => renderNavButton(item, true))}
        </nav>
      </aside>
    </>
  )
}
