import { useEffect, useMemo, useState } from 'react'
import { Shield } from 'lucide-react'
import { Layout } from '../components/Layout'
import { EmptyState } from '../components/EmptyState'
import { formatDateShort, formatDateTime } from '../utils/date'
import api from '../services/api'

interface AuditEntry {
  timestamp: string
  user: string
  action: string
  entity: string
  details: string
}

// Humanize raw enum / slug values coming from the backend
const humanizeAction = (raw: string): string => {
  const map: Record<string, string> = {
    accept: 'Aprobado',
    dispute: 'Disputado',
    'AckAction.ACCEPT': 'Aprobado',
    'AckAction.DISPUTE': 'Disputado',
    pago: 'Pago registrado',
    payment: 'Pago registrado',
    expense_created: 'Gasto creado',
    obligation_settled: 'Obligación saldada',
    ipc_registered: 'IPC registrado',
  }
  return map[raw] || raw
}

const actionBadgeColor = (raw: string): string => {
  const key = raw.toLowerCase()
  if (key.includes('accept') || key.includes('settled') || key.includes('pago') || key.includes('payment')) {
    return 'bg-green-100 text-green-800'
  }
  if (key.includes('dispute')) return 'bg-red-100 text-red-800'
  if (key.includes('ipc')) return 'bg-purple-100 text-purple-800'
  return 'bg-blue-100 text-blue-800'
}

const humanizeDetails = (text: string): string => {
  return text
    .replace(/AckAction\.ACCEPT/g, 'Aprobado')
    .replace(/AckAction\.DISPUTE/g, 'Disputado')
    .replace(/bancolombia_transfer/g, 'Transferencia Bancolombia')
    .replace(/nequi_transfer/g, 'Transferencia Nequi')
    .replace(/cash_payment/g, 'Pago en efectivo')
}

const userInitial = (name: string): string => (name?.[0] || '?').toUpperCase()

const groupByDay = (entries: AuditEntry[]): { day: string; items: AuditEntry[] }[] => {
  const groups: Record<string, AuditEntry[]> = {}
  for (const e of entries) {
    const d = new Date(e.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }
  return Object.keys(groups)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((day) => {
      const items = groups[day].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      return {
        day: items[0] ? items[0].timestamp : day,
        items,
      }
    })
}

export const AuditLogPage = () => {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchAuditLog = async () => {
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate

        const response = await api.get('/audit-log', { params })
        setAuditLog(response.data as AuditEntry[])
      } catch (error) {
        console.error('Error fetching audit log:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAuditLog()
  }, [startDate, endDate])

  const filteredLog = useMemo(() => {
    if (!searchTerm) return auditLog
    const q = searchTerm.toLowerCase()
    return auditLog.filter(
      (entry) =>
        entry.user.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
    )
  }, [auditLog, searchTerm])

  const grouped = useMemo(() => groupByDay(filteredLog), [filteredLog])

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Auditoría</h2>
          <p className="text-gray-600 text-sm mt-1">
            Registro inmutable de todas las acciones realizadas en la aplicación.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar</label>
              <input
                type="text"
                placeholder="Usuario, acción, detalles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {(startDate || endDate || searchTerm) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSearchTerm('')
              }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-semibold focus:outline-none focus-visible:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 py-10 text-center text-gray-500">
            Cargando...
          </div>
        ) : filteredLog.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <EmptyState
              Icon={Shield}
              title="No hay registros"
              message="No se encontraron eventos con los filtros aplicados."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ day, items }) => (
              <div
                key={day}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="sticky top-[60px] md:top-[72px] z-10 bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{formatDateShort(day)}</h3>
                  <span className="text-xs text-gray-500">
                    {items.length} {items.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>

                {/* Desktop table */}
                <table className="w-full text-left text-sm hidden md:table">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Hora</th>
                      <th className="px-4 py-2 font-semibold">Usuario</th>
                      <th className="px-4 py-2 font-semibold">Acción</th>
                      <th className="px-4 py-2 font-semibold">Entidad</th>
                      <th className="px-4 py-2 font-semibold">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center">
                              {userInitial(entry.user)}
                            </span>
                            <span className="font-medium text-gray-800">{entry.user}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${actionBadgeColor(
                              entry.action
                            )}`}
                          >
                            {humanizeAction(entry.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{entry.entity}</td>
                        <td className="px-4 py-3 text-gray-600">{humanizeDetails(entry.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-gray-100">
                  {items.map((entry, idx) => (
                    <li key={idx} className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0">
                            {userInitial(entry.user)}
                          </span>
                          <span className="font-medium text-gray-800 truncate">{entry.user}</span>
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${actionBadgeColor(
                            entry.action
                          )}`}
                        >
                          {humanizeAction(entry.action)}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{entry.entity}</span>
                      </div>
                      <p className="text-sm text-gray-700">{humanizeDetails(entry.details)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-1">
            Total de registros: {filteredLog.length}
            <span className="ml-2 text-xs text-gray-600">
              ({formatDateTime(new Date())})
            </span>
          </p>
          <p className="text-xs text-gray-600">
            Este registro es inmutable y se utiliza para fines de cumplimiento y auditoría.
          </p>
        </div>
      </div>
    </Layout>
  )
}
