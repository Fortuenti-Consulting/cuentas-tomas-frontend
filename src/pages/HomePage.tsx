import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '../services/api'
import api from '../services/api'
import { formatCOP } from '../utils/currency'
import { formatObligationStatus } from '../utils/status'
import { NotificationBell } from '../components/NotificationBell'
import { Sidebar } from '../components/Sidebar'
import { InlinePaymentDialog } from '../components/InlinePaymentDialog'
import { InlineAckButtons } from '../components/InlineAckButtons'
import { OnboardingTour } from '../components/OnboardingTour'

interface Balance {
  ricardo_owes_cop: number
  catherine_owes_cop: number
  as_of_date: string
}

interface Obligation {
  id: string
  due_date: string
  amount_cop: number
  status: string
  period_label: string
  type: string
}

interface Expense {
  id: string
  submitted_by_user_id: string
  concept: string
  amount_cop: number
  status: string
  ricardo_share_cop: number
  catherine_share_cop: number
}

export const HomePage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [upcomingObligations, setUpcomingObligations] = useState<Obligation[]>([])
  const [expensesToApprove, setExpensesToApprove] = useState<Expense[]>([])
  const [currentDate] = useState(new Date())
  const [paymentDialog, setPaymentDialog] = useState<{ obligationId: string; label: string; amount: number } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showOnboarding] = useState(!localStorage.getItem('onboarded'))

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Fetch balance
    api.get('/balance').then((res: any) => setBalance(res.data)).catch((err: any) => console.error(err))

    // Fetch obligations and filter for upcoming
    api.get('/obligations').then((res: any) => {
      const obligations = res.data as Obligation[]
      const today = new Date()
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      const upcoming = obligations
        .filter(o => {
          const dueDate = new Date(o.due_date)
          return dueDate >= today && dueDate <= thirtyDaysLater && o.status !== 'settled'
        })
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5)

      setUpcomingObligations(upcoming)
    }).catch((err: any) => console.error(err))

    // Fetch expenses pending approval from other user
    const currentUser = userData ? JSON.parse(userData) : null
    if (currentUser) {
      api.get('/expenses?status=pending_ack').then((res: any) => {
        const expenses = res.data as Expense[]
        const toApprove = expenses.filter(e => e.submitted_by_user_id !== currentUser.id)
        setExpensesToApprove(toApprove)
      }).catch((err: any) => console.error(err))
    }
  }, [refreshKey])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const getRowStyle = (obligation: Obligation): string => {
    const dueDate = new Date(obligation.due_date)
    const today = new Date()
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0 && obligation.status !== 'settled') {
      return 'bg-red-50 border-red-200'
    }
    return 'bg-white border-gray-200'
  }

  const getStatusDisplay = (obligation: Obligation) => {
    const dueDate = new Date(obligation.due_date)
    const today = new Date()
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0 && obligation.status !== 'settled') {
      return formatObligationStatus('overdue')
    }
    return formatObligationStatus(obligation.status)
  }

  const thisMonthObligations = upcomingObligations.filter(o => {
    const dueDate = new Date(o.due_date)
    return dueDate.getMonth() === currentDate.getMonth() &&
           dueDate.getFullYear() === currentDate.getFullYear()
  })

  const totalThisMonth = thisMonthObligations.reduce((sum, o) => sum + o.amount_cop, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Cuentas Tomás</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-gray-600 text-sm">
              {user?.display_name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto">
        <Sidebar />

        <main className="flex-1 p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Este mes por Tomás</h2>

          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-semibold mb-2">Obligaciones este mes</h3>
              <p className="text-2xl font-bold text-gray-800">{formatCOP(totalThisMonth)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-semibold mb-2">
                {user?.display_name === 'Ricardo' ? 'Tú adeudas' : 'Tú adeudas'}
              </h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCOP(user?.display_name === 'Ricardo' ? (balance?.ricardo_owes_cop || 0) : (balance?.catherine_owes_cop || 0))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {user?.display_name === 'Ricardo'
                  ? `Ricardo adeuda a Catherine`
                  : `Catherine adeuda a Ricardo`}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-semibold mb-2">Fecha actual</h3>
              <p className="text-2xl font-bold text-gray-800">
                {currentDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Upcoming Due Dates */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Vencimientos próximos</h3>
            {upcomingObligations.length > 0 ? (
              <div className="space-y-3">
                {upcomingObligations.map(obl => {
                  const isVestuario = obl.type === 'clothing'
                  const displayAmount = isVestuario && obl.amount_cop === 0 ? 'Entrega pendiente' : formatCOP(obl.amount_cop)
                  const statusDisplay = getStatusDisplay(obl)
                  return (
                    <div key={obl.id} className={`flex items-center justify-between p-4 border rounded ${getRowStyle(obl)}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800">{obl.period_label}</p>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Ricardo pagará
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Vence: {new Date(obl.due_date).toLocaleDateString('es-CO')}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <div>
                          <p className="font-bold text-gray-800">{displayAmount}</p>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${statusDisplay.color}`}>
                            {statusDisplay.label}
                          </span>
                        </div>
                        {obl.status !== 'settled' && obl.amount_cop > 0 && (
                          <button
                            onClick={() => setPaymentDialog({ obligationId: obl.id, label: obl.period_label, amount: obl.amount_cop })}
                            className="block ml-auto px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                          >
                            Registrar pago
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No hay vencimientos próximos en los próximos 30 días.</p>
            )}
          </div>

          {/* Expenses to Approve */}
          {expensesToApprove.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Gastos por aprobar</h3>
              <div className="space-y-3">
                {expensesToApprove.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border border-yellow-200 rounded bg-yellow-50">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{expense.concept}</p>
                      <p className="text-sm text-gray-600">Monto: {formatCOP(expense.amount_cop)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Ricardo gastó · Tu parte: {formatCOP(expense.catherine_share_cop)} · Pendiente: aprobación
                      </p>
                    </div>
                    <div className="text-right">
                      <InlineAckButtons
                        expenseId={expense.id}
                        onSuccess={() => setRefreshKey(k => k + 1)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/pagos')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Registrar pago
            </button>
            <button
              onClick={() => navigate('/gastos')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Nuevo gasto
            </button>
          </div>
        </main>
      </div>

      {paymentDialog && (
        <InlinePaymentDialog
          obligationId={paymentDialog.obligationId}
          obligationLabel={paymentDialog.label}
          amount={paymentDialog.amount}
          onClose={() => setPaymentDialog(null)}
          onSuccess={() => {
            setPaymentDialog(null)
            setRefreshKey(k => k + 1)
          }}
        />
      )}

      {showOnboarding && <OnboardingTour />}
    </div>
  )
}
