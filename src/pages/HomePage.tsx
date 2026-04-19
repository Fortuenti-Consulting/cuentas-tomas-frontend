import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, CalendarClock, AlertTriangle, Shirt } from 'lucide-react'
import { User } from '../services/api'
import api from '../services/api'
import { formatCOP, formatCOPShort } from '../utils/currency'
import { formatObligationStatus, getStatusBadgeClasses } from '../utils/status'
import { formatDateShort, daysUntil, relativeDays } from '../utils/date'
import { Layout } from '../components/Layout'
import { SkeletonPage } from '../components/Skeleton'
import { TrendChart, MonthBucket } from '../components/TrendChart'
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
  const [allObligations, setAllObligations] = useState<Obligation[]>([])
  const [expensesToApprove, setExpensesToApprove] = useState<Expense[]>([])
  const [paymentDialog, setPaymentDialog] = useState<{
    obligationId: string
    label: string
    amount: number
  } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showOnboarding] = useState(!localStorage.getItem('onboarded'))

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))

    setLoading(true)
    const currentUser = userData ? JSON.parse(userData) : null
    const balanceP = api.get('/balance').then((res: any) => setBalance(res.data)).catch((err: any) => console.error(err))
    const obligationsP = api.get('/obligations').then((res: any) => setAllObligations(res.data as Obligation[])).catch((err: any) => console.error(err))
    const expensesP = currentUser
      ? api
          .get('/expenses?status=pending_ack')
          .then((res: any) => {
            const expenses = res.data as Expense[]
            setExpensesToApprove(expenses.filter((e) => e.submitted_by_user_id !== currentUser.id))
          })
          .catch((err: any) => console.error(err))
      : Promise.resolve()

    Promise.all([balanceP, obligationsP, expensesP]).finally(() => setLoading(false))
  }, [refreshKey])

  // Derived state
  const now = useMemo(() => new Date(), [])

  const overdueObligations = useMemo(
    () =>
      allObligations
        .filter((o) => o.status !== 'settled' && o.amount_cop > 0 && daysUntil(o.due_date) < 0)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [allObligations]
  )

  const upcomingNonZero = useMemo(
    () =>
      allObligations
        .filter((o) => o.status !== 'settled' && o.amount_cop > 0 && daysUntil(o.due_date) >= 0)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [allObligations]
  )

  const pendingVestuario = useMemo(
    () =>
      allObligations
        .filter((o) => o.type === 'clothing' && o.status !== 'settled')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 3),
    [allObligations]
  )

  const nextPayment = upcomingNonZero[0]

  const trendData = useMemo<MonthBucket[]>(() => {
    const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const buckets: MonthBucket[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`
      let paid = 0
      let pending = 0
      for (const o of allObligations) {
        const due = new Date(o.due_date)
        const key = `${due.getFullYear()}-${due.getMonth()}`
        if (key !== monthKey) continue
        if (o.status === 'settled') paid += o.amount_cop
        else pending += o.amount_cop
      }
      buckets.push({
        monthLabel: monthShort[d.getMonth()],
        paid,
        pending,
      })
    }
    return buckets
  }, [allObligations, now])

  const thisMonthPending = useMemo(
    () =>
      allObligations
        .filter((o) => {
          const d = new Date(o.due_date)
          return (
            o.status !== 'settled' &&
            o.amount_cop > 0 &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          )
        })
        .reduce((sum, o) => sum + o.amount_cop, 0),
    [allObligations, now]
  )

  const visibleList = useMemo(
    () => [...overdueObligations, ...upcomingNonZero].slice(0, 5),
    [overdueObligations, upcomingNonZero]
  )

  const userIsRicardo = user?.display_name === 'Ricardo'
  const owesAmount = userIsRicardo ? balance?.ricardo_owes_cop || 0 : balance?.catherine_owes_cop || 0
  const owesDirection = userIsRicardo ? 'a Catherine' : 'a Ricardo'
  const responsibleName = 'Ricardo'

  if (loading) {
    return (
      <Layout>
        <SkeletonPage cards={3} />
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
        Este mes por Tomás
      </h2>

      {/* KPI Cards — responsive: 1 col on xs, 2 on sm, 3 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-gray-500" />
            <h3 className="text-gray-600 text-sm font-semibold">Pendiente este mes</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">
            <span className="sm:hidden">{formatCOPShort(thisMonthPending)}</span>
            <span className="hidden sm:inline">{formatCOP(thisMonthPending)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Cuotas sin pagar del mes actual</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-gray-600 text-sm font-semibold">Tú adeudas</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 break-words">
            <span className="sm:hidden">{formatCOPShort(owesAmount)}</span>
            <span className="hidden sm:inline">{formatCOP(owesAmount)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Saldo acumulado sin pagar {owesDirection}</p>
        </div>

        {nextPayment ? (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <h3 className="text-gray-600 text-sm font-semibold">Próximo pago</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">
              <span className="sm:hidden">{formatCOPShort(nextPayment.amount_cop)}</span>
              <span className="hidden sm:inline">{formatCOP(nextPayment.amount_cop)}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {nextPayment.period_label} · {relativeDays(nextPayment.due_date)}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-green-500" />
              <h3 className="text-gray-600 text-sm font-semibold">Próximo pago</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">Al día</p>
            <p className="text-xs text-gray-500 mt-1">No hay pagos pendientes</p>
          </div>
        )}
      </div>

      {/* Vencimientos próximos */}
      <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">
          Vencimientos próximos
        </h3>
        {visibleList.length > 0 ? (
          <div className="space-y-3">
            {visibleList.map((obl) => {
              const days = daysUntil(obl.due_date)
              const isOverdue = days < 0
              const statusKey = isOverdue ? 'overdue' : obl.status
              const statusDisplay = formatObligationStatus(statusKey)
              const StatusIcon = statusDisplay.Icon
              return (
                <div
                  key={obl.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg transition-shadow hover:shadow-sm ${
                    isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800 truncate">{obl.period_label}</p>
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded">
                        {responsibleName} pagará
                      </span>
                      {isOverdue && (
                        <span className="text-xs font-semibold text-red-700">
                          Vencida {relativeDays(obl.due_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Vence: {formatDateShort(obl.due_date)}</p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:gap-2 gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{formatCOP(obl.amount_cop)}</p>
                      <span className={getStatusBadgeClasses(statusDisplay.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusDisplay.label}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setPaymentDialog({
                          obligationId: obl.id,
                          label: obl.period_label,
                          amount: obl.amount_cop,
                        })
                      }
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                    >
                      Registrar pago
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">No hay vencimientos con monto pendiente.</p>
        )}
      </section>

      {/* Entregas Vestuario (separated) */}
      {pendingVestuario.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Shirt className="w-5 h-5 text-gray-500" />
            <h3 className="text-base sm:text-lg font-bold text-gray-800">Entregas de Vestuario</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Entregas en especie — no requieren pago en efectivo.
          </p>
          <ul className="space-y-2">
            {pendingVestuario.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0"
              >
                <span className="text-gray-700">{v.period_label}</span>
                <span className="text-gray-500">{formatDateShort(v.due_date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Expenses to Approve */}
      {expensesToApprove.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">
            Gastos por aprobar
            <span className="ml-2 inline-flex items-center justify-center bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
              {expensesToApprove.length}
            </span>
          </h3>
          <div className="space-y-3">
            {expensesToApprove.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-yellow-200 rounded-lg bg-yellow-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{expense.concept}</p>
                  <p className="text-sm text-gray-700">Monto: {formatCOP(expense.amount_cop)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Ricardo gastó · Tu parte: {formatCOP(expense.catherine_share_cop)}
                  </p>
                </div>
                <InlineAckButtons
                  expenseId={expense.id}
                  onSuccess={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trend chart */}
      <div className="mb-6">
        <TrendChart data={trendData} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/pagos')}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <CreditCard className="w-4 h-4" />
          Registrar pago
        </button>
        <button
          onClick={() => navigate('/gastos')}
          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 px-5 py-3 rounded-lg font-semibold border border-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo gasto
        </button>
      </div>

      {paymentDialog && (
        <InlinePaymentDialog
          obligationId={paymentDialog.obligationId}
          obligationLabel={paymentDialog.label}
          amount={paymentDialog.amount}
          onClose={() => setPaymentDialog(null)}
          onSuccess={() => {
            setPaymentDialog(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      {showOnboarding && <OnboardingTour />}
    </Layout>
  )
}
