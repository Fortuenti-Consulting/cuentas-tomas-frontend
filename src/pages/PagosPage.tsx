import { useMemo, useState, useEffect } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Shirt,
  Receipt,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatCOP } from '../utils/currency'
import { formatDateShort, daysUntil, relativeDays } from '../utils/date'
import { Layout } from '../components/Layout'
import { useToast } from '../components/Toast'
import { SkeletonPage } from '../components/Skeleton'
import apiClient from '../services/api'

interface Obligation {
  id: string
  type: string
  period_label: string
  due_date: string
  amount_cop: number
  remaining_cop: number | null
  status: string
}

interface Expense {
  id: string
  amount_cop: number
  concept: string
  status: string
  ricardo_share_cop: number
  catherine_share_cop: number
}

interface Payment {
  id: string
  paid_by_user_id: string
  amount_cop: number
  paid_on: string
  method: string
  reference: string | null
  proof_file_url: string | null
  applied_to_obligation_id: string | null
  applied_to_expense_id: string | null
  notes: string | null
  created_at: string
}

interface User {
  id: string
  display_name: string
  role: string
}

interface Balance {
  ricardo_owes_cop: number
  catherine_owes_cop: number
  as_of_date: string
}

type Selection = { kind: 'obligation' | 'expense'; amount: number }

interface Section {
  id: string
  title: string
  description?: string
  Icon: LucideIcon
  accent: string
  items: Obligation[]
}

const humanizeMethod = (method: string): string => {
  const map: Record<string, string> = {
    bancolombia_transfer: 'Transferencia Bancolombia',
    nequi_transfer: 'Transferencia Nequi',
    cash: 'Efectivo',
    other: 'Otro',
  }
  return map[method] || method
}

export const PagosPage = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'registrar' | 'historial' | 'balance'>('registrar')
  const [, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showVestuario, setShowVestuario] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    later: true, // "Más adelante" is collapsed by default
  })

  const [formData, setFormData] = useState({
    paid_on: new Date().toISOString().split('T')[0],
    method: 'bancolombia_transfer',
    reference: '',
    notes: '',
    proof_file_base64: '',
    proof_link: '',
    useFileUpload: false,
  })

  const [selected, setSelected] = useState<Record<string, Selection>>({})

  const [obligations, setObligations] = useState<Obligation[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const toggleSelection = (id: string, kind: 'obligation' | 'expense', defaultAmount: number) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = { kind, amount: defaultAmount }
      return next
    })
  }

  const updateSelectedAmount = (id: string, amount: number) => {
    setSelected((prev) => {
      if (!prev[id]) return prev
      return { ...prev, [id]: { ...prev[id], amount } }
    })
  }

  const selectedTotal = Object.values(selected).reduce((sum, s) => sum + (s.amount || 0), 0)
  const selectedCount = Object.keys(selected).length

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [userRes, obligationsRes, expensesRes, paymentsRes, balanceRes] = await Promise.all([
        apiClient.get('/me'),
        apiClient.get('/obligations'),
        apiClient.get('/expenses'),
        apiClient.get('/payments'),
        apiClient.get('/balance'),
      ])

      setUser(userRes.data)
      setObligations(
        (obligationsRes.data as Obligation[]).filter(
          (o) => o.status === 'pending' || o.status === 'partial'
        )
      )
      setExpenses((expensesRes.data as Expense[]).filter((e) => e.status === 'accepted'))
      setPayments(paymentsRes.data)
      setBalance(balanceRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Error al cargar datos' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setFormData((prev) => ({ ...prev, proof_file_base64: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (selectedCount === 0) {
      setMessage({
        type: 'error',
        text: 'Selecciona al menos una obligación o gasto para pagar',
      })
      return
    }

    for (const [id, s] of Object.entries(selected)) {
      if (!s.amount || s.amount <= 0) {
        setMessage({
          type: 'error',
          text: 'Ingresa un monto válido para todos los ítems seleccionados',
        })
        return
      }
      void id
    }

    const hasProof = formData.useFileUpload ? formData.proof_file_base64 : formData.proof_link
    if (!hasProof) {
      setMessage({ type: 'error', text: 'Por favor proporciona un comprobante' })
      return
    }

    setSubmitting(true)
    try {
      const settlements = Object.entries(selected).map(([id, s]) => ({
        obligation_id: s.kind === 'obligation' ? id : undefined,
        expense_id: s.kind === 'expense' ? id : undefined,
        amount_cop: s.amount,
      }))

      const payload: any = {
        amount_cop: selectedTotal,
        paid_on: formData.paid_on,
        method: formData.method,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        settlements,
      }

      if (formData.useFileUpload) payload.proof_file_base64 = formData.proof_file_base64
      else payload.proof_link = formData.proof_link

      await apiClient.post('/payments', payload)

      setFormData({
        paid_on: new Date().toISOString().split('T')[0],
        method: 'bancolombia_transfer',
        reference: '',
        notes: '',
        proof_file_base64: '',
        proof_link: '',
        useFileUpload: false,
      })
      setSelected({})

      toast(
        `Pago registrado: ${selectedCount} ítem(s) por ${formatCOP(selectedTotal)}`,
        'success'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      await loadInitialData()
    } catch (error: any) {
      console.error('Error creating payment:', error)
      const errorMsg = error.response?.data?.detail || 'Error al registrar el pago'
      setMessage({ type: 'error', text: errorMsg })
      toast(errorMsg, 'error')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  // Filter obligations by zero-amount toggle + group into sections
  const visibleObligations = useMemo(() => {
    return showVestuario ? obligations : obligations.filter((o) => o.amount_cop > 0)
  }, [obligations, showVestuario])

  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const sections: Section[] = useMemo(() => {
    const overdue: Obligation[] = []
    const thisMonth: Obligation[] = []
    const soon: Obligation[] = []
    const later: Obligation[] = []

    for (const o of visibleObligations) {
      const days = daysUntil(o.due_date)
      const d = new Date(o.due_date)
      if (days < 0) overdue.push(o)
      else if (d <= endOfMonth) thisMonth.push(o)
      else if (d <= in30Days) soon.push(o)
      else later.push(o)
    }

    const sortByDate = (a: Obligation, b: Obligation) =>
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()

    return [
      {
        id: 'overdue',
        title: 'Vencidas',
        description: 'Pagos con fecha pasada',
        Icon: AlertTriangle,
        accent: 'text-red-700 bg-red-50 border-red-200',
        items: overdue.sort(sortByDate),
      },
      {
        id: 'thisMonth',
        title: 'Este mes',
        Icon: CalendarClock,
        accent: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        items: thisMonth.sort(sortByDate),
      },
      {
        id: 'soon',
        title: 'Próximos 30 días',
        Icon: CalendarDays,
        accent: 'text-blue-700 bg-blue-50 border-blue-200',
        items: soon.sort(sortByDate),
      },
      {
        id: 'later',
        title: 'Más adelante',
        Icon: Calendar,
        accent: 'text-gray-700 bg-gray-50 border-gray-200',
        items: later.sort(sortByDate),
      },
    ]
  }, [visibleObligations, endOfMonth, in30Days])

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))

  const hiddenVestuarioCount = obligations.filter((o) => o.amount_cop === 0).length

  if (loading && obligations.length === 0 && payments.length === 0) {
    return (
      <Layout>
        <SkeletonPage cards={0} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className={selectedCount > 0 ? 'pb-32 md:pb-6' : 'pb-6'}>
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-5 sm:mb-6">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {[
              { id: 'registrar' as const, label: 'Registrar pago' },
              { id: 'historial' as const, label: 'Historial' },
              { id: 'balance' as const, label: 'Estado de cuenta' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`whitespace-nowrap px-4 sm:px-6 py-3 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  activeTab === t.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            role="alert"
            className={`p-4 rounded-lg mb-5 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ── Registrar Tab ─────────────────────────────────────── */}
        {activeTab === 'registrar' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Step 1 — Selection */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  1. ¿Qué quieres pagar?
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Selecciona una o varias obligaciones o gastos. Puedes ajustar el monto si solo
                  pagaste una parte.
                </p>
              </div>

              {obligations.length === 0 && expenses.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">
                  No tienes obligaciones ni gastos pendientes por pagar.
                </p>
              ) : (
                <div className="space-y-5">
                  {/* Grouped obligations */}
                  {sections.map((sec) => {
                    if (sec.items.length === 0) return null
                    const isCollapsed = !!collapsed[sec.id]
                    const sectionTotal = sec.items.reduce(
                      (sum, o) => sum + (o.remaining_cop ?? o.amount_cop),
                      0
                    )
                    const SIcon = sec.Icon
                    return (
                      <div key={sec.id}>
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(sec.id)}
                          className={`w-full flex items-center justify-between gap-2 p-3 border rounded-lg ${sec.accent} transition-colors hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                          aria-expanded={!isCollapsed}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <SIcon className="w-4 h-4 shrink-0" />
                            <span className="font-semibold">{sec.title}</span>
                            <span className="text-xs font-medium opacity-75">
                              ({sec.items.length})
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold tabular-nums">
                              {formatCOP(sectionTotal)}
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                            {sec.items.map((o) => {
                              const isSelected = !!selected[o.id]
                              const remaining = o.remaining_cop ?? o.amount_cop
                              const isClothing = o.type === 'clothing'
                              const days = daysUntil(o.due_date)
                              return (
                                <label
                                  key={o.id}
                                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleSelection(o.id, 'obligation', remaining)
                                    }
                                    className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0"
                                    disabled={submitting || remaining <= 0}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <p className="text-sm font-medium text-gray-800 truncate">
                                        {o.period_label}
                                      </p>
                                      <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                        Ricardo pagará
                                      </span>
                                      {isClothing && (
                                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                          <Shirt className="w-3 h-3" />
                                          Vestuario
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      Vence: {formatDateShort(o.due_date)} ·{' '}
                                      <span
                                        className={days < 0 ? 'text-red-700 font-medium' : ''}
                                      >
                                        {relativeDays(o.due_date)}
                                      </span>
                                      {remaining !== o.amount_cop && (
                                        <> · Pendiente: {formatCOP(remaining)}</>
                                      )}
                                      {o.status === 'partial' && ' (parcial)'}
                                    </p>
                                    {isClothing && remaining === 0 && (
                                      <p className="text-[11px] text-gray-500 italic mt-0.5">
                                        Entrega en especie · sin pago en efectivo
                                      </p>
                                    )}
                                  </div>
                                  {isSelected && remaining > 0 && (
                                    <input
                                      type="number"
                                      value={selected[o.id].amount}
                                      onChange={(e) =>
                                        updateSelectedAmount(o.id, parseInt(e.target.value) || 0)
                                      }
                                      className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      min={1}
                                      max={remaining}
                                      disabled={submitting}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                  <div className="text-right shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
                                    {formatCOP(remaining)}
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Vestuario toggle */}
                  {hiddenVestuarioCount > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowVestuario((v) => !v)}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus-visible:underline"
                      >
                        <Shirt className="w-4 h-4" />
                        {showVestuario
                          ? `Ocultar Vestuario en especie (${hiddenVestuarioCount})`
                          : `Mostrar Vestuario en especie (${hiddenVestuarioCount})`}
                      </button>
                    </div>
                  )}

                  {/* Gastos */}
                  {expenses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-gray-500" />
                        Gastos aceptados ({expenses.length})
                      </h3>
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                        {expenses.map((e) => {
                          const isSelected = !!selected[e.id]
                          const share =
                            e.ricardo_share_cop || e.catherine_share_cop || e.amount_cop
                          return (
                            <label
                              key={e.id}
                              className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelection(e.id, 'expense', share)}
                                className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0"
                                disabled={submitting}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {e.concept}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Tu parte: {formatCOP(share)} · Total: {formatCOP(e.amount_cop)}
                                </p>
                              </div>
                              {isSelected && (
                                <input
                                  type="number"
                                  value={selected[e.id].amount}
                                  onChange={(ev) =>
                                    updateSelectedAmount(e.id, parseInt(ev.target.value) || 0)
                                  }
                                  className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  min={1}
                                  disabled={submitting}
                                  onClick={(ev) => ev.stopPropagation()}
                                />
                              )}
                              <div className="text-right shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
                                {formatCOP(share)}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Step 2 — Payment details */}
            {selectedCount > 0 && (
              <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                  2. Detalles del pago
                </h2>
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fecha del pago *
                      </label>
                      <input
                        type="date"
                        value={formData.paid_on}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, paid_on: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={submitting}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Método de pago
                      </label>
                      <select
                        value={formData.method}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, method: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={submitting}
                      >
                        <option value="bancolombia_transfer">Transferencia Bancolombia</option>
                        <option value="nequi_transfer">Transferencia Nequi</option>
                        <option value="cash">Efectivo</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Referencia (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, reference: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: TRF20260418001"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Ej: Consolida quincena 1 y gasto médico"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Comprobante *
                    </label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={!formData.useFileUpload}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, useFileUpload: false }))
                          }
                          disabled={submitting}
                        />
                        Enlace
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={formData.useFileUpload}
                          onChange={() =>
                            setFormData((prev) => ({ ...prev, useFileUpload: true }))
                          }
                          disabled={submitting}
                        />
                        Archivo
                      </label>
                    </div>
                    {!formData.useFileUpload ? (
                      <input
                        type="url"
                        value={formData.proof_link}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, proof_link: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://..."
                        disabled={submitting}
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        disabled={submitting}
                      />
                    )}
                  </div>

                  <div className="hidden md:flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm text-gray-600">Total a pagar</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCOP(selectedTotal)}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {submitting ? 'Registrando...' : `Registrar ${formatCOP(selectedTotal)}`}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Sticky mobile summary + submit bar */}
            {selectedCount > 0 && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-3 z-30">
                <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600">
                      {selectedCount} {selectedCount === 1 ? 'ítem' : 'ítems'}
                    </p>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                      {formatCOP(selectedTotal)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .querySelector('form')
                        ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                    }
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    {submitting ? 'Registrando...' : 'Registrar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Historial Tab ─────────────────────────────────────── */}
        {activeTab === 'historial' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Historial de pagos</h2>
              <p className="text-sm text-gray-600 mt-1">
                Pagos registrados con sus comprobantes.
              </p>
            </div>
            {loading ? (
              <p className="text-gray-500 p-6 text-center">Cargando...</p>
            ) : payments.length === 0 ? (
              <p className="text-gray-500 p-6 text-center">No hay pagos registrados</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Método
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Aplicado a
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Referencia
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                          Comprobante
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold tabular-nums">
                            {formatCOP(payment.amount_cop)}
                          </td>
                          <td className="px-4 py-3">{formatDateShort(payment.paid_on)}</td>
                          <td className="px-4 py-3">{humanizeMethod(payment.method)}</td>
                          <td className="px-4 py-3 text-sm">
                            {payment.applied_to_obligation_id ? 'Obligación' : 'Gasto'}
                          </td>
                          <td className="px-4 py-3 text-sm">{payment.reference || '—'}</td>
                          <td className="px-4 py-3">
                            {payment.proof_file_url ? (
                              <a
                                href={payment.proof_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline text-xs"
                              >
                                Ver
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <li key={payment.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 tabular-nums">
                          {formatCOP(payment.amount_cop)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateShort(payment.paid_on)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {humanizeMethod(payment.method)} ·{' '}
                        {payment.applied_to_obligation_id ? 'Obligación' : 'Gasto'}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-gray-500">Ref: {payment.reference}</p>
                      )}
                      {payment.proof_file_url && (
                        <a
                          href={payment.proof_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline text-xs"
                        >
                          Ver comprobante
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ── Balance Tab ───────────────────────────────────────── */}
        {activeTab === 'balance' && balance && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Lo que debo pagar</h3>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600 tabular-nums">
                  {formatCOP(balance.ricardo_owes_cop)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Lo que puedo retirar</h3>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 tabular-nums">
                  {formatCOP(Math.max(0, balance.catherine_owes_cop))}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Desglose</h3>
              <div className="space-y-5">
                <div className="pb-4 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-700 mb-2">Obligaciones pendientes</h4>
                  {obligations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay obligaciones pendientes</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {obligations.map((o) => (
                        <li key={o.id} className="text-gray-700 flex justify-between gap-3">
                          <span className="truncate">{o.period_label}</span>
                          <span className="font-semibold tabular-nums shrink-0">
                            {formatCOP(o.amount_cop)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Gastos aceptados sin pagar</h4>
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay gastos aceptados sin pagar</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {expenses.map((e) => (
                        <li key={e.id} className="text-gray-700 flex justify-between gap-3">
                          <span className="truncate">{e.concept}</span>
                          <span className="font-semibold tabular-nums shrink-0">
                            {formatCOP(e.ricardo_share_cop)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-right">
              Estado de cuenta al {formatDateShort(balance.as_of_date)}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
