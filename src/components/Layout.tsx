import { useState, ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Saltar al contenido
      </a>

      <Header onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex max-w-7xl mx-auto">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
