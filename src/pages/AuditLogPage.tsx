import { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import api from '../services/api'

interface AuditEntry {
  timestamp: string
  user: string
  action: string
  entity: string
  details: string
}

export const AuditLogPage = () => {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [filteredLog, setFilteredLog] = useState<AuditEntry[]>([])
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

  useEffect(() => {
    let filtered = auditLog

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.details.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLog(filtered)
  }, [auditLog, searchTerm])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Auditoría</h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Usuario, acción, detalles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mb-4">
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSearchTerm('')
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Limpiar filtros
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filteredLog.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay registros de auditoría
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Fecha y Hora</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Usuario</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Acción</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Entidad</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.map((entry, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {new Date(entry.timestamp).toLocaleDateString('es-CO')}{' '}
                        {new Date(entry.timestamp).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{entry.user}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.entity}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <p className="font-semibold mb-2">Total de registros: {filteredLog.length}</p>
            <p className="text-xs text-gray-600">
              Este registro es inmutable y se utiliza para fines de cumplimiento y auditoría.
            </p>
          </div>
        </div>
          </div>
        </main>
      </div>
    </div>
  )
}
