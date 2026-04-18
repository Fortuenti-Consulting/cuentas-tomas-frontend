import { useState, useEffect } from 'react'
import { formatCOP } from '../utils/currency'
import { formatObligationStatus } from '../utils/status'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import apiClient from '../services/api'

interface Obligation {
  id: string
  type: string
  period_label: string
  due_date: string
  amount_cop: number
  percentage: number | null
  status: string
  notes: string | null
}

interface Agreement {
  id: string
  case_number: string
  court: string
  start_date: string
  base_alimony_cop: number
  bank_account: string
  child_name: string
}

interface IPCRecord {
  id: string
  year: number
  ipc_pct: number
  source_url: string
}

export const ObligacionesPage = () => {
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [_agreement, _setAgreement] = useState<Agreement | null>(null)
  const [_ipcRecords, _setIPCRecords] = useState<IPCRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedType, setSelectedType] = useState('todas')
  const [selectedStatus, setSelectedStatus] = useState('todas')
  const [showIPCModal, setShowIPCModal] = useState(false)
  const [ipcYear, setIPCYear] = useState('')
  const [ipcPct, setIPCPct] = useState('')
  const [ipcUrl, setIPCUrl] = useState('')
  const [ipcLoading, setIPCLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedYear])

  const loadData = async () => {
    setLoading(true)
    try {
      const [obsResponse, agreeResponse, ipcResponse] = await Promise.all([
        apiClient.get(`/obligations?year=${selectedYear}`),
        apiClient.get('/agreements/current'),
        apiClient.get('/ipc-adjustments'),
      ])
      setObligations(obsResponse.data)
      _setAgreement(agreeResponse.data)
      _setIPCRecords(ipcResponse.data)
    } catch (error) {
      console.error('Error loading obligations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIPCSubmit = async () => {
    if (!ipcYear || !ipcPct || !ipcUrl) {
      alert('Por favor completa todos los campos')
      return
    }

    setIPCLoading(true)
    try {
      await apiClient.post('/ipc-adjustments', {
        year: parseInt(ipcYear),
        ipc_pct: parseFloat(ipcPct),
        source_url: ipcUrl,
      })
      setShowIPCModal(false)
      setIPCYear('')
      setIPCPct('')
      setIPCUrl('')
      await loadData()
    } catch (error) {
      console.error('Error creating IPC adjustment:', error)
      alert('Error al registrar el IPC')
    } finally {
      setIPCLoading(false)
    }
  }

  const filterObligations = (): Obligation[] => {
    return obligations.filter((o) => {
      if (selectedType !== 'todas' && o.type !== selectedType) return false
      if (selectedStatus !== 'todas') {
        const today = new Date()
        const dueDate = new Date(o.due_date)
        if (selectedStatus === 'vencidas' && (dueDate >= today || o.status !== 'pending')) return false
        if (selectedStatus === 'pendientes' && o.status !== 'pending') return false
      }
      return true
    })
  }

  const currentMonthObs = obligations.filter((o) => {
    const dueDate = new Date(o.due_date)
    const today = new Date()
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear()
  })

  const currentMonthTotal = currentMonthObs.reduce((sum, o) => sum + o.amount_cop, 0)

  const upcomingObs = obligations.find((o) => {
    const today = new Date()
    const dueDate = new Date(o.due_date)
    return dueDate > today
  })

  const yearsAvailable = new Set<number>()
  yearsAvailable.add(2025)
  yearsAvailable.add(new Date().getFullYear())
  if (new Date().getFullYear() < 2026) {
    yearsAvailable.add(2026)
  } else {
    yearsAvailable.add(new Date().getFullYear() + 1)
  }

  const filtered = filterObligations()

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex max-w-7xl mx-auto">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Obligaciones</h2>
              <p className="text-gray-600 text-sm">Calendario de obligaciones acordadas por el Juzgado</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-gray-600 text-sm">Total del mes corriente</p>
                <p className="text-2xl font-bold text-indigo-600 mt-2">{formatCOP(currentMonthTotal)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-gray-600 text-sm">Próximo vencimiento</p>
                {upcomingObs ? (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(upcomingObs.due_date).toLocaleDateString('es-CO')}
                    </p>
                    <p className="text-lg font-bold text-indigo-600">
                      {formatCOP(upcomingObs.amount_cop)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No hay obligaciones próximas</p>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Array.from(yearsAvailable)
                    .sort()
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Tipo</label>
                  <div className="flex gap-2 flex-wrap">
                    {['todas', 'alimony', 'clothing'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          selectedType === type
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {type === 'todas' ? 'Todas' : type === 'alimony' ? 'Alimentos' : 'Vestuario'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Estado</label>
                  <div className="flex gap-2 flex-wrap">
                    {['todas', 'pendientes', 'vencidas'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          selectedStatus === status
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {status === 'todas' ? 'Todas' : status === 'pendientes' ? 'Pendientes' : 'Vencidas'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* IPC Button */}
            <button
              onClick={() => setShowIPCModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              Registrar IPC anual
            </button>

            {/* Obligations Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Periodo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Tipo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Vencimiento</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-800">Monto</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-800">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No hay obligaciones que coincidan con los filtros
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{o.period_label}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              o.type === 'alimony'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {o.type === 'alimony' ? 'Alimento' : 'Vestuario'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(o.due_date).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                          {formatCOP(o.amount_cop)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {(() => {
                            const dueDate = new Date(o.due_date)
                            const today = new Date()
                            const isOverdue = dueDate < today && o.status !== 'settled'
                            const displayStatus = isOverdue ? 'overdue' : o.status
                            const statusDisplay = formatObligationStatus(displayStatus)
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                                {statusDisplay.label}
                              </span>
                            )
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* IPC Modal */}
      {showIPCModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar IPC anual</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año efectivo
                </label>
                <input
                  type="number"
                  value={ipcYear}
                  onChange={(e) => setIPCYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="2026"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Año desde el cual aplica el ajuste (Julio en adelante).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IPC (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ipcPct}
                  onChange={(e) => setIPCPct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="5.2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Porcentaje IPC del año anterior publicado por DANE.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL fuente (DANE)</label>
                <input
                  type="url"
                  value={ipcUrl}
                  onChange={(e) => setIPCUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://www.dane.gov.co/"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowIPCModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={ipcLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleIPCSubmit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                disabled={ipcLoading}
              >
                {ipcLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
