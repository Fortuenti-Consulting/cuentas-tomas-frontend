import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Calendar } from 'lucide-react'
import { Layout } from '../components/Layout'
import { useToast } from '../components/Toast'
import api from '../services/api'

const toISODate = (d: Date) => d.toISOString().split('T')[0]

const presets = [
  {
    label: 'Este mes',
    get: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: toISODate(start), end: toISODate(now) }
    },
  },
  {
    label: 'Mes anterior',
    get: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: toISODate(start), end: toISODate(end) }
    },
  },
  {
    label: 'Año actual',
    get: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return { start: toISODate(start), end: toISODate(now) }
    },
  },
]

export const ExportPage = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!startDate || !endDate) {
      setError('Por favor selecciona las fechas de inicio y fin')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha de inicio no puede ser mayor que la fecha de fin')
      return
    }

    setLoading(true)
    try {
      const response = await api.get('/export/pdf', {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Cuentas_Tomas_${startDate}_${endDate}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast('Reporte descargado', 'success')
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al descargar el PDF'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-5 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Descargar Reporte</h2>
          <p className="text-gray-600 text-sm mt-1">
            Genera un PDF firmado con todas las obligaciones, pagos y gastos del rango seleccionado.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Rangos sugeridos</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const r = p.get()
                    setStartDate(r.start)
                    setEndDate(r.end)
                    setError('')
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Calendar className="w-3 h-3" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleExport} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                {loading ? (
                  'Descargando...'
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Información del reporte:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Incluye todas las obligaciones en el rango de fechas</li>
            <li>Incluye todos los pagos registrados</li>
            <li>Incluye todos los gastos compartidos</li>
            <li>Incluye todas las aprobaciones y disputas</li>
            <li>Firmado con SHA256 para verificación de autenticidad</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
