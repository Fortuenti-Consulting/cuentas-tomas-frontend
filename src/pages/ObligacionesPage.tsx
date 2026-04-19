import { useState, useEffect } from 'react'
import { formatCOP } from '../utils/currency'
import { formatObligationStatus, getStatusBadgeClasses } from '../utils/status'
import { formatDateShort, daysUntil } from '../utils/date'
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
  percentage: number | null
  status: string
  notes: string | null
}

export const ObligacionesPage = () => {
  const { toast } = useToast()
  const [obligations, setObligations] = useState<Obligation[]>([])
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
      const obsResponse = await apiClient.get(`/obligations?year=${selectedYear}`)
      setObligations(obsResponse.data)
    } catch (error) {
      console.error('Error loading obligations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIPCSubmit = async () => {
    if (!ipcYear || !ipcPct || !ipcUrl) {
      toast('Por favor completa todos los campos', 'error')
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
      toast(`IPC ${ipcYear} registrado correctamente`, 'success')
      await loadData()
    } catch (error) {
      console.error('Error creating IPC adjustment:', error)
      toast('Error al registrar el IPC', 'error')
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
        if (selectedStatus === 'vencidas' && (dueDate >= today || o.status !== 'pending'))
          return false
        if (selectedStatus === 'pendientes' && o.status !== 'pending') return false
      }
      return true
    })
  }

  const today = new Date()

  const currentMonthObs = obligations.filter((o) => {
    const dueDate = new Date(o.due_date)
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear()
  })

  const currentMonthTotal = currentMonthObs.reduce((sum, o) => sum + o.amount_cop, 0)

  const upcomingObs = obligations.find((o) => new Date(o.due_date) > today)

  const yearsAvailable = new Set<number>()
  yearsAvailable.add(2025)
  yearsAvailable.add(new Date().getFullYear())
  if (new Date().getFullYear() < 2026) {
    yearsAvailable.add(2026)
  } else {
    yearsAvailable.add(new Date().getFullYear() + 1)
  }

  const filtered = filterObligations()

  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }

  const resolveStatus = (o: Obligation) => {
    const overdue = daysUntil(o.due_date) < 0 && o.status !== 'settled' && o.amount_cop > 0
    return overdue ? 'overdue' : o.status
  }

  if (loading) {
    return (
      <Layout>
        <SkeletonPage cards={2} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-6">
        {/* Page header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Obligaciones</h2>
          <p className="text-gray-600 text-sm mt-1">
            Calendario de obligaciones acordadas por el Juzgado
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-gray-600 text-sm">Total del mes corriente</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-2">
              {formatCOP(currentMonthTotal)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-gray-600 text-sm">Próximo vencimiento</p>
            {upcomingObs ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-800">
                  {formatDateShort(upcomingObs.due_date)}
                </p>
                <p className="text-lg font-bold text-indigo-600">{formatCOP(upcomingObs.amount_cop)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No hay obligaciones próximas</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Filtros</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {['todas', 'alimony', 'clothing'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'todas' ? 'Todas' : type === 'alimony' ? 'Alimentos' : 'Vestuario'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Estado</label>
              <div className="flex gap-2 flex-wrap">
                {['todas', 'pendientes', 'vencidas'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Registrar IPC anual
        </button>

        {/* Obligations — Desktop Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Periodo
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay obligaciones que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const status = resolveStatus(o)
                  const sd = formatObligationStatus(status)
                  const Icon = sd.Icon
                  const highlight = isCurrentMonth(o.due_date)
                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        highlight ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                        {o.period_label}
                        {highlight && (
                          <span className="ml-2 text-xs font-semibold text-indigo-700">
                            · Mes actual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            o.type === 'alimony'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {o.type === 'alimony' ? 'Alimento' : 'Vestuario'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDateShort(o.due_date)}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-right text-gray-900">
                        {o.amount_cop > 0 ? formatCOP(o.amount_cop) : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={getStatusBadgeClasses(sd.color)}>
                          <Icon className="w-3 h-3" />
                          {sd.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Obligations — Mobile Card List */}
        <div className="space-y-2 md:hidden">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center text-gray-500 text-sm">
              No hay obligaciones que coincidan con los filtros
            </div>
          ) : (
            filtered.map((o) => {
              const status = resolveStatus(o)
              const sd = formatObligationStatus(status)
              const Icon = sd.Icon
              const highlight = isCurrentMonth(o.due_date)
              return (
                <div
                  key={o.id}
                  className={`bg-white rounded-lg border p-3 transition-shadow hover:shadow-sm ${
                    highlight ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {o.period_label}
                      </p>
                      {highlight && (
                        <p className="text-xs font-semibold text-indigo-700 mt-0.5">Mes actual</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">
                        Vence: {formatDateShort(o.due_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 text-sm">
                        {o.amount_cop > 0 ? formatCOP(o.amount_cop) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        o.type === 'alimony'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {o.type === 'alimony' ? 'Alimento' : 'Vestuario'}
                    </span>
                    <span className={getStatusBadgeClasses(sd.color)}>
                      <Icon className="w-3 h-3" />
                      {sd.label}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* IPC Modal */}
      {showIPCModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Registrar IPC anual</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año efectivo</label>
                <input
                  type="number"
                  value={ipcYear}
                  onChange={(e) => setIPCYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="5.2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Porcentaje IPC del año anterior publicado por DANE.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL fuente (DANE)
                </label>
                <input
                  type="url"
                  value={ipcUrl}
                  onChange={(e) => setIPCUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://www.dane.gov.co/"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowIPCModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={ipcLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleIPCSubmit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                disabled={ipcLoading}
              >
                {ipcLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
