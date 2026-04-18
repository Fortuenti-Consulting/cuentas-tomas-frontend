import { useState, useEffect } from 'react'
import { formatCOP } from '../utils/currency'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
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

export const PagosPage = () => {
  const [activeTab, setActiveTab] = useState<'registrar' | 'historial' | 'balance'>('registrar')
  const [, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Registrar pago form state
  const [formData, setFormData] = useState({
    paid_on: new Date().toISOString().split('T')[0],
    method: 'bancolombia_transfer',
    reference: '',
    notes: '',
    proof_file_base64: '',
    proof_link: '',
    useFileUpload: false,
  })

  // Selection state: map of id → { kind, amount }
  type Selection = { kind: 'obligation' | 'expense'; amount: number }
  const [selected, setSelected] = useState<Record<string, Selection>>({})

  const toggleSelection = (id: string, kind: 'obligation' | 'expense', defaultAmount: number) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = { kind, amount: defaultAmount }
      }
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

  const [obligations, setObligations] = useState<Obligation[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      setExpenses(
        (expensesRes.data as Expense[]).filter((e) => e.status === 'accepted')
      )
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
      setFormData((prev) => ({
        ...prev,
        proof_file_base64: base64,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (selectedCount === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos una obligación o gasto para pagar' })
      return
    }

    for (const [id, s] of Object.entries(selected)) {
      if (!s.amount || s.amount <= 0) {
        setMessage({ type: 'error', text: `Ingresa un monto válido para todos los ítems seleccionados` })
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

      if (formData.useFileUpload) {
        payload.proof_file_base64 = formData.proof_file_base64
      } else {
        payload.proof_link = formData.proof_link
      }

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

      setMessage({ type: 'success', text: `Pago registrado: ${selectedCount} ítem(s) por ${formatCOP(selectedTotal)}` })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      await loadInitialData()
    } catch (error: any) {
      console.error('Error creating payment:', error)
      const errorMsg = error.response?.data?.detail || 'Error al registrar el pago'
      setMessage({ type: 'error', text: errorMsg })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex max-w-7xl mx-auto">
        <Sidebar />

        <main className="flex-1 p-8">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('registrar')}
                className={`px-6 py-3 font-semibold text-sm ${
                  activeTab === 'registrar'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Registrar pago
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`px-6 py-3 font-semibold text-sm ${
                  activeTab === 'historial'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Historial de pagos
              </button>
              <button
                onClick={() => setActiveTab('balance')}
                className={`px-6 py-3 font-semibold text-sm ${
                  activeTab === 'balance'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Estado de cuenta
              </button>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'registrar' && (
            <div className="space-y-6">
              {/* Step 1 — Selection */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-800">1. ¿Qué quieres pagar?</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Selecciona una o varias obligaciones o gastos. Puedes ajustar el monto si pagaste solo una parte.
                  </p>
                </div>

                {obligations.length === 0 && expenses.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">
                    No tienes obligaciones ni gastos pendientes por pagar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {obligations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Obligaciones pendientes ({obligations.length})
                        </h3>
                        <div className="border border-gray-200 rounded-lg divide-y">
                          {obligations.map((o) => {
                            const isSelected = !!selected[o.id]
                            const remaining = o.remaining_cop ?? o.amount_cop
                            return (
                              <label
                                key={o.id}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition ${
                                  isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelection(o.id, 'obligation', remaining)}
                                  className="h-4 w-4 text-indigo-600"
                                  disabled={submitting}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {o.period_label}
                                    </p>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                                      Ricardo pagará
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Vence: {new Date(o.due_date).toLocaleDateString('es-CO')} · Pendiente: {formatCOP(remaining)}
                                    {o.status === 'partial' && ' (parcial)'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <input
                                    type="number"
                                    value={selected[o.id].amount}
                                    onChange={(e) => updateSelectedAmount(o.id, parseInt(e.target.value) || 0)}
                                    className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                    min={1}
                                    max={remaining}
                                    disabled={submitting}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {expenses.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Gastos aceptados ({expenses.length})
                        </h3>
                        <div className="border border-gray-200 rounded-lg divide-y">
                          {expenses.map((e) => {
                            const isSelected = !!selected[e.id]
                            const share = e.ricardo_share_cop || e.catherine_share_cop || e.amount_cop
                            return (
                              <label
                                key={e.id}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition ${
                                  isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelection(e.id, 'expense', share)}
                                  className="h-4 w-4 text-indigo-600"
                                  disabled={submitting}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{e.concept}</p>
                                  <p className="text-xs text-gray-500">
                                    Tu parte: {formatCOP(share)} (total: {formatCOP(e.amount_cop)})
                                  </p>
                                </div>
                                {isSelected && (
                                  <input
                                    type="number"
                                    value={selected[e.id].amount}
                                    onChange={(ev) => updateSelectedAmount(e.id, parseInt(ev.target.value) || 0)}
                                    className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                    min={1}
                                    disabled={submitting}
                                    onClick={(ev) => ev.stopPropagation()}
                                  />
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Running total */}
                {selectedCount > 0 && (
                  <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm text-indigo-800">
                        {selectedCount} {selectedCount === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
                      </p>
                      <p className="text-2xl font-bold text-indigo-900">{formatCOP(selectedTotal)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected({})}
                      className="text-sm text-indigo-700 hover:underline"
                      disabled={submitting}
                    >
                      Limpiar selección
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2 — Payment details (collapsed until selection) */}
              {selectedCount > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">2. Detalles del pago</h2>
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Fecha del pago *
                        </label>
                        <input
                          type="date"
                          value={formData.paid_on}
                          onChange={(e) => setFormData((prev) => ({ ...prev, paid_on: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                          onChange={(e) => setFormData((prev) => ({ ...prev, method: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          disabled={submitting}
                        >
                          <option value="bancolombia_transfer">Bancolombia - Transferencia</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Referencia Bancolombia
                      </label>
                      <input
                        type="text"
                        value={formData.reference}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                            onChange={() => setFormData((prev) => ({ ...prev, useFileUpload: false }))}
                            disabled={submitting}
                          />
                          Enlace
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={formData.useFileUpload}
                            onChange={() => setFormData((prev) => ({ ...prev, useFileUpload: true }))}
                            disabled={submitting}
                          />
                          Archivo
                        </label>
                      </div>
                      {!formData.useFileUpload ? (
                        <input
                          type="url"
                          value={formData.proof_link}
                          onChange={(e) => setFormData((prev) => ({ ...prev, proof_link: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Total a pagar</p>
                        <p className="text-xl font-bold text-gray-900">{formatCOP(selectedTotal)}</p>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
                      >
                        {submitting ? 'Registrando...' : `Registrar pago (${formatCOP(selectedTotal)})`}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Historial de pagos</h2>
              {loading ? (
                <p className="text-gray-600">Cargando...</p>
              ) : payments.length === 0 ? (
                <p className="text-gray-600">No hay pagos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">
                          Monto
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">
                          Fecha
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">
                          Metodo
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">
                          Aplicado a
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">
                          Referencia
                        </th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">
                          Comprobante
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 font-semibold">
                            {formatCOP(payment.amount_cop)}
                          </td>
                          <td className="px-4 py-3">{payment.paid_on}</td>
                          <td className="px-4 py-3">{payment.method}</td>
                          <td className="px-4 py-3 text-sm">
                            {payment.applied_to_obligation_id
                              ? 'Obligacion'
                              : 'Gasto'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {payment.reference || '-'}
                          </td>
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
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'balance' && (
            <div className="space-y-6">
              {balance && (
                <>
                  {/* Balance Summary Boxes */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">
                        Lo que debo pagar
                      </h3>
                      <p className="text-3xl font-bold text-indigo-600">
                        {formatCOP(balance.ricardo_owes_cop)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">
                        Lo que puedo retirar
                      </h3>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCOP(Math.max(0, balance.catherine_owes_cop))}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Desglose</h3>
                    <div className="space-y-3">
                      <div className="border-b pb-3">
                        <h4 className="font-semibold text-gray-700 mb-2">
                          Obligaciones pendientes
                        </h4>
                        {obligations.length === 0 ? (
                          <p className="text-gray-600 text-sm">
                            No hay obligaciones pendientes
                          </p>
                        ) : (
                          <ul className="text-sm space-y-1">
                            {obligations.map((obligation) => (
                              <li
                                key={obligation.id}
                                className="text-gray-600 flex justify-between"
                              >
                                <span>{obligation.period_label}</span>
                                <span className="font-semibold">
                                  {formatCOP(obligation.amount_cop)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">
                          Gastos aceptados sin pagar
                        </h4>
                        {expenses.length === 0 ? (
                          <p className="text-gray-600 text-sm">
                            No hay gastos aceptados sin pagar
                          </p>
                        ) : (
                          <ul className="text-sm space-y-1">
                            {expenses.map((expense) => (
                              <li
                                key={expense.id}
                                className="text-gray-600 flex justify-between"
                              >
                                <span>{expense.concept}</span>
                                <span className="font-semibold">
                                  {formatCOP(expense.ricardo_share_cop)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Update info */}
                  <p className="text-xs text-gray-500 text-right">
                    Estado de cuenta al {balance.as_of_date}
                  </p>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
