import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { ObligacionesPage } from './pages/ObligacionesPage'
import { GastosPage } from './pages/GastosPage'
import { PagosPage } from './pages/PagosPage'
import { ExportPage } from './pages/ExportPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obligaciones"
            element={
              <ProtectedRoute>
                <ObligacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gastos"
            element={
              <ProtectedRoute>
                <GastosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pagos"
            element={
              <ProtectedRoute>
                <PagosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute>
                <ExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
