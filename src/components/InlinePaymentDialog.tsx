import { useState } from 'react'
import api from '../services/api'
import { formatCOP } from '../utils/currency'

interface InlinePaymentDialogProps {
  obligationId: string
  obligationLabel: string
  amount: number
  onClose: () => void
  onSuccess: () => void
}

export const InlinePaymentDialog = ({
  obligationId,
  obligationLabel,
  amount,
  onClose,
  onSuccess,
}: InlinePaymentDialogProps) => {
  const [reference, setReference] = useState('')
  const [proofLink, setProofLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!amount || amount <= 0) {
      setError('No se puede registrar un pago para una obligación sin monto')
      return
    }

    if (!proofLink) {
      setError('Por favor proporciona un enlace de comprobante')
      return
    }

    setLoading(true)
    try {
      await api.post('/payments', {
        amount_cop: amount,
        paid_on: new Date().toISOString().split('T')[0],
        method: 'bancolombia_transfer',
        reference: reference || undefined,
        proof_link: proofLink,
        applied_to_obligation_id: obligationId,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Registrar pago</h3>
        <p className="text-sm text-gray-500 mb-1">Responsable: Ricardo</p>
        <p className="text-sm text-gray-600 mb-4 font-medium">{obligationLabel}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input
              type="text"
              value={formatCOP(amount)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (opcional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ref. Bancolombia"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enlace de comprobante</label>
            <input
              type="url"
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
              placeholder="https://..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
