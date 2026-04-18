import { useState, useEffect } from 'react'
import { formatCOP } from '../utils/currency'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import apiClient from '../services/api'

interface Category {
  id: string
  slug: string
  name_es: string
  split_rule: string
}

interface Expense {
  id: string
  submitted_by_user_id: string
  category_id: string
  amount_cop: number
  concept: string
  incurred_date: string
  invoice_file_url: string | null
  invoice_link_url: string | null
  split_rule_snapshot: string
  ricardo_share_cop: number
  catherine_share_cop: number
  status: string
  void_reason: string | null
  created_at: string
}

interface User {
  id: string
  display_name: string
  role: string
}

export const GastosPage = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending_ack')
  const [showForm, setShowForm] = useState(false)
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    category_slug: '',
    amount_cop: '',
    concept: '',
    incurred_date: new Date().toISOString().split('T')[0],
    invoice_link: '',
    invoice_file_base64: '',
    useFileUpload: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [ackingExpenseId, setAckingExpenseId] = useState<string | null>(null)
  const [ackAction, setAckAction] = useState<'accept' | 'dispute'>('accept')
  const [ackComment, setAckComment] = useState('')
  const [ackLoading, setAckLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const [userRes, categoriesRes, expensesRes] = await Promise.all([
        apiClient.get('/me'),
        apiClient.get('/categories'),
        apiClient.get(`/expenses?status=${statusFilter === 'todas' ? '' : statusFilter}`),
      ])
      setCurrentUser(userRes.data)
      setCategories(categoriesRes.data)
      setExpenses(expensesRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
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
        invoice_file_base64: base64,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category_slug || !formData.amount_cop || !formData.concept) {
      alert('Por favor completa los campos requeridos')
      return
    }

    const hasInvoice = formData.invoice_link || formData.invoice_file_base64
    if (!hasInvoice) {
      alert('Por favor proporciona un comprobante (enlace o archivo)')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post('/expenses', {
        category_slug: formData.category_slug,
        amount_cop: parseInt(formData.amount_cop),
        concept: formData.concept,
        incurred_date: formData.incurred_date,
        invoice_file_base64: formData.useFileUpload ? formData.invoice_file_base64 : undefined,
        invoice_link: !formData.useFileUpload ? formData.invoice_link : undefined,
      })

      setFormData({
        category_slug: '',
        amount_cop: '',
        concept: '',
        incurred_date: new Date().toISOString().split('T')[0],
        invoice_link: '',
        invoice_file_base64: '',
        useFileUpload: false,
      })
      setShowForm(false)
      await loadData()
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Error al crear el gasto')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcknowledge = async (expenseId: string) => {
    if (!ackAction) {
      alert('Por favor selecciona una acción')
      return
    }

    setAckLoading(true)
    try {
      await apiClient.post(`/expenses/${expenseId}/acknowledge`, {
        action: ackAction,
        comment: ackComment || undefined,
      })

      setAckingExpenseId(null)
      setAckAction('accept')
      setAckComment('')
      await loadData()
    } catch (error) {
      console.error('Error acknowledging expense:', error)
      alert('Error al procesar el gasto')
    } finally {
      setAckLoading(false)
    }
  }

  const canAcknowledge = (expense: Expense) => {
    return (
      currentUser &&
      expense.submitted_by_user_id !== currentUser.id &&
      expense.status === 'pending_ack'
    )
  }

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending_ack':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'disputed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending_ack':
        return 'Pendiente de aprobación'
      case 'accepted':
        return 'Aprobado'
      case 'disputed':
        return 'Disputado'
      default:
        return status
    }
  }

  if (loading && !showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-indigo-600">Cuentas Tomás</h1>
          </div>
        </nav>
        <div className="flex justify-center items-center h-96">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  const filteredExpenses =
    statusFilter === 'todas' ? expenses : expenses.filter((e) => e.status === statusFilter)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex max-w-7xl mx-auto">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Gastos</h2>
                <p className="text-gray-600 text-sm">Registro y aprobación de gastos compartidos</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
              >
                {showForm ? 'Cancelar' : 'Nuevo gasto'}
              </button>
            </div>

            {/* Submission Form */}
            {showForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar nuevo gasto</h3>
                <form onSubmit={handleSubmitExpense} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoria *
                      </label>
                      <select
                        value={formData.category_slug}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            category_slug: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Selecciona categoria</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.name_es}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto (COP) *
                      </label>
                      <input
                        type="number"
                        value={formData.amount_cop}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            amount_cop: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="100000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Concepto *
                    </label>
                    <input
                      type="text"
                      value={formData.concept}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          concept: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Consulta medica"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha del gasto *
                    </label>
                    <input
                      type="date"
                      value={formData.incurred_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          incurred_date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprobante *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!formData.useFileUpload}
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              useFileUpload: false,
                              invoice_file_base64: '',
                            }))
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Enlace</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.useFileUpload}
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              useFileUpload: true,
                              invoice_link: '',
                            }))
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Archivo</span>
                      </label>
                    </div>

                    {!formData.useFileUpload ? (
                      <div className="mt-2">
                        <input
                          type="url"
                          value={formData.invoice_link}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              invoice_link: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="https://example.com/invoice.pdf"
                        />
                      </div>
                    ) : (
                      <div className="mt-2">
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        {formData.invoice_file_base64 && (
                          <p className="text-sm text-green-600 mt-1">Archivo seleccionado</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {submitting ? 'Enviando...' : 'Enviar gasto'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Status Filter */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex gap-2">
                {[
                  { value: 'todas', label: 'Todos' },
                  { value: 'pending_ack', label: 'Pendientes de aprobación' },
                  { value: 'accepted', label: 'Aprobados' },
                  { value: 'disputed', label: 'Disputados' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setStatusFilter(status.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      statusFilter === status.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {filteredExpenses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No hay gastos que mostrar</div>
              ) : (
                <div className="divide-y">
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id}>
                      <div
                        className="p-6 hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          setExpandedExpenseId(
                            expandedExpenseId === expense.id ? null : expense.id
                          )
                        }
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{expense.concept}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(expense.incurred_date).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                {formatCOP(expense.amount_cop)}
                              </p>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColor(
                                  expense.status
                                )}`}
                              >
                                {statusLabel(expense.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {expandedExpenseId === expense.id && (
                        <div className="bg-gray-50 p-6 border-t space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">
                                Monto total
                              </p>
                              <p className="text-lg font-bold text-gray-900">
                                {formatCOP(expense.amount_cop)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Categoria</p>
                              <p className="text-lg font-bold text-gray-900">
                                {categories.find((c) => c.id === expense.category_id)?.name_es ||
                                  'Desconocida'}
                              </p>
                            </div>
                          </div>

                          {/* Distribution */}
                          {(expense.status === 'accepted' || expense.status === 'disputed') && (
                            <div className="bg-white p-4 rounded border border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-3">
                                Distribucion acordada:
                              </p>
                              <div className="flex gap-4">
                                <div>
                                  <p className="text-xs text-gray-600">Ricardo</p>
                                  <p className="font-bold text-lg text-indigo-600">
                                    {formatCOP(expense.ricardo_share_cop)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Catherine</p>
                                  <p className="font-bold text-lg text-indigo-600">
                                    {formatCOP(expense.catherine_share_cop)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Comprobante */}
                          {(expense.invoice_link_url || expense.invoice_file_url) && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Comprobante:</p>
                              {expense.invoice_link_url && (
                                <a
                                  href={expense.invoice_link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700 text-sm underline"
                                >
                                  Ver enlace
                                </a>
                              )}
                              {expense.invoice_file_url && (
                                <a
                                  href={`/api${expense.invoice_file_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700 text-sm underline"
                                >
                                  Descargar archivo
                                </a>
                              )}
                            </div>
                          )}

                          {/* Acknowledgement Section */}
                          {canAcknowledge(expense) && (
                            <div className="bg-blue-50 p-4 rounded border border-blue-200">
                              {ackingExpenseId === expense.id ? (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                      Acción:
                                    </p>
                                    <div className="flex gap-4">
                                      <label>
                                        <input
                                          type="radio"
                                          checked={ackAction === 'accept'}
                                          onChange={() => setAckAction('accept')}
                                          className="mr-2"
                                        />
                                        <span className="text-sm">Aceptar</span>
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          checked={ackAction === 'dispute'}
                                          onChange={() => setAckAction('dispute')}
                                          className="mr-2"
                                        />
                                        <span className="text-sm">Disputar</span>
                                      </label>
                                    </div>
                                  </div>

                                  {ackAction === 'dispute' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Comentario (opcional)
                                      </label>
                                      <textarea
                                        value={ackComment}
                                        onChange={(e) => setAckComment(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        rows={2}
                                        placeholder="Explica por que disputas este gasto"
                                      />
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleAcknowledge(expense.id)}
                                      disabled={ackLoading}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                                    >
                                      {ackLoading ? 'Procesando...' : 'Confirmar'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAckingExpenseId(null)
                                        setAckAction('accept')
                                        setAckComment('')
                                      }}
                                      className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-100"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAckingExpenseId(expense.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Revisar y aprobar/disputar este gasto
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
