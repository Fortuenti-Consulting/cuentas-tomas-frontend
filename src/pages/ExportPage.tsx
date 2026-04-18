import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import api from '../services/api'

export const ExportPage = () => {
  const navigate = useNavigate()
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

      // Create a blob from the response
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Cuentas_Tomas_${startDate}_${endDate}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al descargar el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Descargar Reporte</h1>

          <form onSubmit={handleExport} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg font-semibold"
              >
                {loading ? 'Descargando...' : 'Descargar PDF'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <p className="font-semibold mb-2">Información del reporte:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Incluye todas las obligaciones en el rango de fechas</li>
              <li>Incluye todos los pagos registrados</li>
              <li>Incluye todos los gastos compartidos</li>
              <li>Incluye todas las aprobaciones y disputas</li>
              <li>Firmado con SHA256 para verificación de autenticidad</li>
            </ul>
          </div>
        </div>
          </div>
        </main>
      </div>
    </div>
  )
}
